const { v4: uuidv4 } = require('uuid');
const {
  rollCowrie,
  createGameState,
  getCurrentPlayer,
  getValidMoves,
  applyMove,
  advanceTurn,
  buildPublicGameState
} = require('../game/engine');
const { Player, isDatabaseAvailable } = require('../models');

const COLORS = ['red', 'green', 'yellow', 'blue'];

// Track online players: { playerId: { socketId, username } }
const onlinePlayers = {};

const getRoom = (rooms, roomCode) => rooms[roomCode?.toUpperCase()];

const getNextAvailableColor = (players) => {
  const playerCount = players.length;
  const usedColors = players.map(p => p.color);

  const colorPatterns = {
    0: 'red',
    1: 'yellow',
    2: 'green',
    3: 'blue'
  };

  if (playerCount === 1 && usedColors.includes('red')) {
    return 'yellow';
  }

  return colorPatterns[playerCount] || 'red';
};

// Remove internal timer and temp properties from player data before emitting
const sanitizePlayers = (players) => {
  return players.map(p => {
    const clean = { ...p };
    delete clean._rejoinTimer;
    delete clean.leftAt;
    return clean;
  });
};

const emitRoomPlayers = (io, room) => {
  io.to(room.code).emit('playerUpdated', { players: sanitizePlayers(room.players) });
};

const emitGameState = (io, room) => {
  if (!room.gameState) return;
  io.to(room.code).emit('gameStarted', {
    gameState: buildPublicGameState(room.gameState),
    players: sanitizePlayers(room.players),
    currentPlayer: getCurrentPlayer(room.gameState)
  });
};

// Record victory and losses in database
const recordVictory = async (winner, room) => {
  if (!isDatabaseAvailable()) return;
  try {
    const player = await Player.findByPk(winner.id);
    if (!player) return;

    player.total_games += 1;
    if (room.isOffline) {
      player.wins_vs_computer += 1;
    } else {
      player.wins_vs_players += 1;
    }
    await player.save();

    // Record losses for other players and total games
    for (const p of room.players) {
      if (p.id === winner.id || p.isAi) continue;
      if (p.id.startsWith('guest-')) continue;
      try {
        const otherPlayer = await Player.findByPk(p.id);
        if (otherPlayer) {
          otherPlayer.total_games += 1;
          if (room.isOffline) {
            otherPlayer.losses_vs_computer += 1;
          } else {
            otherPlayer.losses_vs_players += 1;
          }
          await otherPlayer.save();
        }
      } catch (e) { /* skip */ }
    }
  } catch (error) {
    console.error('Error recording victory:', error.message);
  }
};

const maybeHandleAiTurn = (io, room) => {
  if (!room.gameState) return;
  const current = getCurrentPlayer(room.gameState);
  if (!current?.isAi) return;

  // Step 1: Show "thinking" delay before rolling (1.2s)
  setTimeout(() => {
    const roll = rollCowrie();
    const validMoves = getValidMoves(room.gameState, current.id, roll.move);

    io.to(room.code).emit('diceRolled', {
      diceValue: roll.move,
      playerId: current.id,
      playerColor: current.color,
      validMoves,
      gameState: buildPublicGameState(room.gameState)
    });

    if (validMoves.length === 0) {
      // Wait before passing turn (1s)
      setTimeout(() => {
        advanceTurn(room.gameState);
        io.to(room.code).emit('turnPassed', {
          reason: 'No valid moves',
          gameState: buildPublicGameState(room.gameState),
          currentPlayer: getCurrentPlayer(room.gameState)
        });
        maybeHandleAiTurn(io, room);
      }, 1000);
      return;
    }

    // Step 2: Wait before making move (1.5s)
    setTimeout(() => {
      const chosen = chooseAiMove(validMoves, room.gameState, current.id);
      const result = applyMove(room.gameState, current.id, chosen.tokenIndex, roll.move, chosen.action);
      if (!result) return;

      const earnedExtraTurn = roll.extraTurn || result.capturedTokens.length > 0 || result.finishedNow;

      io.to(room.code).emit('tokenMoved', {
        tokenIndex: chosen.tokenIndex,
        tokenId: chosen.tokenId,
        playerColor: current.color,
        from: result.from,
        to: result.to,
        capturedTokens: result.capturedTokens,
        gameState: buildPublicGameState(room.gameState),
        extraTurn: earnedExtraTurn,
        currentPlayer: current
      });

      if (result.winner) {
        io.to(room.code).emit('gameOver', {
          winner: result.winner,
          gameState: buildPublicGameState(room.gameState)
        });
        recordVictory(result.winner, room);
        return;
      }

      if (!earnedExtraTurn) {
        advanceTurn(room.gameState);
        io.to(room.code).emit('turnPassed', {
          reason: 'Turn ended',
          gameState: buildPublicGameState(room.gameState),
          currentPlayer: getCurrentPlayer(room.gameState)
        });
      }

      maybeHandleAiTurn(io, room);
    }, 1500);
  }, 1200);
};

const chooseAiMove = (validMoves, gameState, playerId) => {
  const player = gameState.players.find(p => p.id === playerId);
  const safeCells = new Set(['0,2', '2,4', '4,2', '2,0']);

  const scored = validMoves.map(move => {
    let score = 0;
    if (move.action === 'finish') score += 80;
    if (move.action === 'captureInPlace') score += 90; // Prefer capturing in place

    const targetKey = `${move.to.row},${move.to.col}`;
    if (safeCells.has(targetKey)) score += 10;

    const hasOpponent = gameState.players.some(p => p.id !== playerId && p.tokens.some(t => t.row === move.to.row && t.col === move.to.col && !t.isFinished));
    if (hasOpponent) score += 100;

    if (!player.hasCaptured && move.to.row === 1 && move.to.col === 2) score += 20;

    score += Math.random() * 2;
    return { move, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
};

const setupGameSocket = (io, rooms) => {
  const broadcastOnlineStatus = (playerId, isOnline) => {
    io.emit('friendStatusChanged', { playerId, isOnline });
  };

  io.on('connection', (socket) => {

    // Register online player when they authenticate
    socket.on('registerOnline', ({ playerId, username }) => {
      if (!playerId || playerId.startsWith('guest-')) return;
      onlinePlayers[playerId] = { socketId: socket.id, username };
      socket.data.authPlayerId = playerId;
      broadcastOnlineStatus(playerId, true);
    });

    // Get online status of specific players
    socket.on('getOnlineStatus', ({ playerIds }, callback) => {
      const statuses = {};
      playerIds.forEach(id => {
        statuses[id] = !!onlinePlayers[id];
      });
      if (typeof callback === 'function') callback(statuses);
    });

    // Invite friend to room
    socket.on('inviteFriend', ({ roomCode, friendId, inviterUsername }) => {
      const room = getRoom(rooms, roomCode);
      if (!room) return;

      const friendOnline = onlinePlayers[friendId];
      if (!friendOnline) return;

      io.to(friendOnline.socketId).emit('roomInvite', {
        roomCode: room.code,
        hostUsername: inviterUsername,
        players: room.players.map(p => ({ username: p.username, color: p.color })),
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers
      });
    });

    // Friend responds to room invite
    socket.on('respondToInvite', ({ roomCode, accepted, playerId, username }) => {
      const room = getRoom(rooms, roomCode);
      if (!room) return;

      if (!accepted) {
        const hostOnline = onlinePlayers[room.hostId];
        if (hostOnline) {
          io.to(hostOnline.socketId).emit('inviteDeclined', { username });
        }
        return;
      }

      // Mid-game rejoin via invite: if game started and this player is a disconnected member
      if (room.gameStarted) {
        const dcPlayer = room.players.find(p => p.id === playerId && p.connected === false && !p.forfeited);
        if (!dcPlayer) return; // Not a disconnected member, can't join mid-game

        // Clear forfeit timer
        if (dcPlayer._rejoinTimer) {
          clearTimeout(dcPlayer._rejoinTimer);
          dcPlayer._rejoinTimer = null;
        }

        dcPlayer.connected = true;
        dcPlayer.leftAt = null;

        // Also update gameState player
        const gsPlayer = room.gameState?.players?.find(p => p.id === playerId);
        if (gsPlayer) gsPlayer.connected = true;

        // Clear game pause
        room.gamePaused = false;

        socket.join(room.code);
        socket.data.roomCode = room.code;
        socket.data.playerId = playerId;

        // Send full game state to the rejoining player
        socket.emit('reconnected', {
          gameState: buildPublicGameState(room.gameState),
          players: sanitizePlayers(room.players),
          currentPlayer: getCurrentPlayer(room.gameState),
          room: { code: room.code, hostId: room.hostId, isOffline: room.isOffline, passcode: room.passcode }
        });

        io.to(room.code).emit('playerRejoined', {
          username: dcPlayer.username,
          players: sanitizePlayers(room.players)
        });

        io.to(room.code).emit('gameResumed', {
          gameState: buildPublicGameState(room.gameState),
          currentPlayer: getCurrentPlayer(room.gameState)
        });
        return;
      }

      const existingPlayer = room.players.find(p => p.id === playerId);
      if (existingPlayer) {
        // Player is already in room, just reconnect them
        existingPlayer.connected = true;
        socket.emit('inviteAccepted', {
          room: {
            code: room.code,
            hostId: room.hostId,
            players: room.players,
            isOffline: room.isOffline
          }
        });
        emitRoomPlayers(io, room);
        return;
      }

      if (room.players.length >= room.maxPlayers) return;

      const playerColor = getNextAvailableColor(room.players);
      room.players.push({
        id: playerId,
        username,
        color: playerColor,
        ready: false,
        connected: true
      });

      socket.emit('inviteAccepted', {
        room: {
          code: room.code,
          hostId: room.hostId,
          players: room.players,
          isOffline: room.isOffline
        }
      });

      emitRoomPlayers(io, room);
    });

    socket.on('joinRoom', ({ roomCode, playerId }) => {
      const room = getRoom(rooms, roomCode);
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.connected = true;
      }

      socket.join(room.code);
      socket.data.roomCode = room.code;
      socket.data.playerId = playerId;

      io.to(room.code).emit('playerJoined', {
        players: sanitizePlayers(room.players),
        gameStarted: room.gameStarted,
        gameState: room.gameState ? buildPublicGameState(room.gameState) : null
      });

      if (room.gameStarted) {
        socket.emit('reconnected', {
          gameState: buildPublicGameState(room.gameState),
          players: sanitizePlayers(room.players),
          currentPlayer: getCurrentPlayer(room.gameState),
          room: { code: room.code, hostId: room.hostId, isOffline: room.isOffline, passcode: room.passcode }
        });
      }
    });

    socket.on('toggleReady', ({ roomCode, playerId }) => {
      const room = getRoom(rooms, roomCode);
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
      if (!player) return;

      player.ready = !player.ready;
      emitRoomPlayers(io, room);
    });

    socket.on('addOfflinePlayer', ({ roomCode, username, isAi }) => {
      const room = getRoom(rooms, roomCode);
      if (!room) return;

      if (room.players.length >= room.maxPlayers) return;

      const color = getNextAvailableColor(room.players);
      room.players.push({
        id: uuidv4(),
        username,
        color,
        ready: true,
        connected: true,
        isAi: !!isAi,
        equippedItems: { board: 'b01', cowrie: 'c01', piece: 'p01' }
      });

      emitRoomPlayers(io, room);
    });

    // Add AI bot (works for both offline and online rooms)
    socket.on('addAiBot', ({ roomCode, playerId }) => {
      const room = getRoom(rooms, roomCode);
      if (!room) return;
      if (room.hostId !== playerId) return;
      if (room.players.length >= room.maxPlayers) return;
      if (room.gameStarted) return;

      const aiNum = room.players.filter(p => p.isAi).length + 1;
      const color = getNextAvailableColor(room.players);
      room.players.push({
        id: uuidv4(),
        username: `AI Bot ${aiNum}`,
        color,
        ready: true,
        connected: true,
        isAi: true,
        equippedItems: { board: 'b01', cowrie: 'c01', piece: 'p01' }
      });

      emitRoomPlayers(io, room);
    });

    // Remove AI bot (works for both offline and online rooms)
    socket.on('removeAiBot', ({ roomCode, playerId, botId }) => {
      const room = getRoom(rooms, roomCode);
      if (!room) return;
      if (room.hostId !== playerId) return;

      const bot = room.players.find(p => p.id === botId && p.isAi);
      if (!bot) return;

      room.players = room.players.filter(p => p.id !== botId);
      emitRoomPlayers(io, room);
    });

    socket.on('startGame', ({ roomCode, playerId }) => {
      const room = getRoom(rooms, roomCode);
      if (!room || room.gameStarted) return;

      if (room.hostId !== playerId) return;
      if (room.players.length < 2) return;

      room.gameStarted = true;
      room.gameState = createGameState(room.players);

      emitGameState(io, room);
      maybeHandleAiTurn(io, room);
    });

    socket.on('rollDice', ({ roomCode, playerId }) => {
      const room = getRoom(rooms, roomCode);
      if (!room || !room.gameState) return;
      if (room.gamePaused) return; // Game is paused waiting for rejoin

      const current = getCurrentPlayer(room.gameState);
      const hostOverride = room.isOffline && room.hostId === playerId;
      if (!current || (!hostOverride && current.id !== playerId)) return;

      const roll = rollCowrie();
      const actingPlayerId = hostOverride ? current.id : playerId;
      const validMoves = getValidMoves(room.gameState, actingPlayerId, roll.move);

      io.to(room.code).emit('diceRolled', {
        diceValue: roll.move,
        playerId: actingPlayerId,
        playerColor: current.color,
        validMoves,
        gameState: buildPublicGameState(room.gameState)
      });

      if (validMoves.length === 0) {
        advanceTurn(room.gameState);
        io.to(room.code).emit('turnPassed', {
          reason: 'No valid moves',
          gameState: buildPublicGameState(room.gameState),
          currentPlayer: getCurrentPlayer(room.gameState)
        });
        maybeHandleAiTurn(io, room);
      } else {
        room.gameState.lastRoll = roll;
      }
    });

    socket.on('moveToken', ({ roomCode, playerId, tokenIndex, action }) => {
      const room = getRoom(rooms, roomCode);
      if (!room || !room.gameState) return;
      if (room.gamePaused) return; // Game is paused waiting for rejoin

      const current = getCurrentPlayer(room.gameState);
      const hostOverride = room.isOffline && room.hostId === playerId;
      if (!current || (!hostOverride && current.id !== playerId)) return;

      const roll = room.gameState.lastRoll;
      if (!roll) return;

      const actingPlayerId = hostOverride ? current.id : playerId;
      const validMoves = getValidMoves(room.gameState, actingPlayerId, roll.move);

      const targetIndex = Number(tokenIndex);
      const chosen = validMoves.find(move => move.tokenIndex === targetIndex && (!action || move.action === action));

      if (!chosen) {
        return;
      }

      const result = applyMove(room.gameState, actingPlayerId, targetIndex, roll.move, chosen.action);
      if (!result) return;

      const earnedExtraTurn = roll.extraTurn || result.capturedTokens.length > 0 || result.finishedNow;
      room.gameState.lastRoll = null;

      io.to(room.code).emit('tokenMoved', {
        tokenIndex,
        tokenId: chosen.tokenId,
        playerColor: current.color,
        from: result.from,
        to: result.to,
        capturedTokens: result.capturedTokens,
        gameState: buildPublicGameState(room.gameState),
        extraTurn: earnedExtraTurn,
        currentPlayer: current
      });

      if (result.winner) {
        io.to(room.code).emit('gameOver', {
          winner: result.winner,
          gameState: buildPublicGameState(room.gameState)
        });
        recordVictory(result.winner, room);
        return;
      }

      if (!earnedExtraTurn) {
        advanceTurn(room.gameState);
        io.to(room.code).emit('turnPassed', {
          reason: 'Turn ended',
          gameState: buildPublicGameState(room.gameState),
          currentPlayer: getCurrentPlayer(room.gameState)
        });
      }

      maybeHandleAiTurn(io, room);
    });

    socket.on('playAgain', ({ roomCode, playerId }) => {
      const room = getRoom(rooms, roomCode);
      if (!room) return;
      if (room.hostId !== playerId) return;

      room.gameStarted = false;
      room.gameState = null;

      room.players.forEach(p => {
        p.ready = p.id === room.hostId || room.isOffline;
      });

      io.to(room.code).emit('returnToLobby', { players: sanitizePlayers(room.players) });
    });

    socket.on('leaveRoom', ({ roomCode, playerId }) => {
      const room = getRoom(rooms, roomCode);
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
      const username = player?.username || 'Player';
      const wasHost = room.hostId === playerId;

      if (room.gameStarted) {
        // During game, mark disconnected and start 60s rejoin timer
        if (player) {
          player.connected = false;
          player.leftAt = Date.now();

          // Also update gameState player immediately
          const gsPlayer = room.gameState?.players?.find(p => p.id === playerId);
          if (gsPlayer) gsPlayer.connected = false;

          // Start 60-second forfeit timer
          if (player._rejoinTimer) clearTimeout(player._rejoinTimer);
          player._rejoinTimer = setTimeout(() => {
            // Check if still disconnected after 60s
            if (!player.connected) {
              player.forfeited = true;

              // Remove forfeited player's tokens from the board (send all to base/finished)
              const gsPlayer = room.gameState?.players?.find(p => p.id === player.id);
              if (gsPlayer) {
                gsPlayer.connected = false;
                gsPlayer.forfeited = true;
                gsPlayer.tokens.forEach(token => {
                  token.isFinished = true; // Mark as finished so they disappear from board
                });
              }

              // Clear game pause on forfeit
              room.gamePaused = false;

              io.to(room.code).emit('playerForfeited', {
                username: player.username,
                playerId: player.id,
                players: sanitizePlayers(room.players),
                gameState: buildPublicGameState(room.gameState)
              });

              // Count remaining active human players (non-forfeited, non-AI)
              const activeHumans = room.gameState?.players?.filter(p =>
                p.connected !== false && !p.forfeited && !p.isAi
              ) || [];
              // Count all remaining active players (humans + AI)
              const activeAll = room.gameState?.players?.filter(p =>
                !p.forfeited && (p.isAi || p.connected !== false)
              ) || [];

              // If only 1 human left (regardless of AI), or only AI left - declare winner
              if (activeHumans.length <= 1 && activeHumans.length > 0) {
                const lastPlayer = activeHumans[0];
                io.to(room.code).emit('gameOver', {
                  winner: lastPlayer,
                  gameState: buildPublicGameState(room.gameState)
                });
                recordVictory(lastPlayer, room);
              } else if (activeAll.length > 1) {
                // >2 players remaining: skip forfeited player's turns and continue
                const current = getCurrentPlayer(room.gameState);
                if (current && (current.id === player.id)) {
                  advanceTurn(room.gameState);
                  io.to(room.code).emit('turnPassed', {
                    reason: `${player.username} forfeited`,
                    gameState: buildPublicGameState(room.gameState),
                    currentPlayer: getCurrentPlayer(room.gameState)
                  });
                  maybeHandleAiTurn(io, room);
                }
              }
            }
          }, 60000);
        }

        // Host transfer during game: assign to first connected non-AI player
        if (wasHost) {
          const newHost = room.players.find(p => p.id !== playerId && !p.isAi && p.connected !== false);
          if (newHost) {
            room.hostId = newHost.id;
            io.to(room.code).emit('hostTransferred', {
              newHostId: newHost.id,
              newHostUsername: newHost.username
            });
          }
        }
      } else {
        // Before game starts, fully remove from room
        room.players = room.players.filter(p => p.id !== playerId);

        // Host transfer in lobby: assign to first remaining non-AI player
        if (wasHost && room.players.length > 0) {
          const newHost = room.players.find(p => !p.isAi);
          if (newHost) {
            room.hostId = newHost.id;
            io.to(room.code).emit('hostTransferred', {
              newHostId: newHost.id,
              newHostUsername: newHost.username
            });
          }
        }
      }

      // Determine if game should pause or continue
      if (room.gameStarted && player) {
        const activeCount = room.gameState?.players?.filter(p =>
          (p.connected !== false || p.isAi) && !p.forfeited
        ).length || 0;

        if (activeCount < 2) {
          // Only 1 player left (or none): pause the game
          room.gamePaused = true;
        } else {
          // 2+ active players: continue, but skip disconnected player's turn if needed
          const current = getCurrentPlayer(room.gameState);
          if (current && current.id === playerId) {
            advanceTurn(room.gameState);
            io.to(room.code).emit('turnPassed', {
              reason: `${username} disconnected`,
              gameState: buildPublicGameState(room.gameState),
              currentPlayer: getCurrentPlayer(room.gameState)
            });
            maybeHandleAiTurn(io, room);
          }
        }
      }

      socket.leave(room.code);
      io.to(room.code).emit('playerLeft', {
        username,
        players: sanitizePlayers(room.players),
        canRejoin: room.gameStarted ? true : false,
        gamePaused: room.gamePaused || false,
        gameState: room.gameState ? buildPublicGameState(room.gameState) : null
      });
    });

    // Rejoin active game within 60 seconds
    socket.on('rejoinGame', ({ roomCode, playerId }) => {
      const room = getRoom(rooms, roomCode);
      if (!room || !room.gameStarted) {
        return;
      }

      const player = room.players.find(p => p.id === playerId);
      if (!player) {
        return;
      }
      if (player.forfeited) {
        return; // Too late, already forfeited
      }

      // Clear forfeit timer
      if (player._rejoinTimer) {
        clearTimeout(player._rejoinTimer);
        player._rejoinTimer = null;
      }

      player.connected = true;
      player.leftAt = null;

      // Also update gameState player
      const gsPlayer = room.gameState?.players?.find(p => p.id === playerId);
      if (gsPlayer) gsPlayer.connected = true;

      // Clear game pause
      room.gamePaused = false;

      socket.join(room.code);
      socket.data.roomCode = room.code;
      socket.data.playerId = playerId;

      socket.emit('reconnected', {
        gameState: buildPublicGameState(room.gameState),
        players: sanitizePlayers(room.players),
        currentPlayer: getCurrentPlayer(room.gameState),
        room: { code: room.code, hostId: room.hostId, isOffline: room.isOffline, passcode: room.passcode }
      });

      io.to(room.code).emit('playerRejoined', {
        username: player.username,
        players: sanitizePlayers(room.players)
      });

      io.to(room.code).emit('gameResumed', {
        gameState: buildPublicGameState(room.gameState),
        currentPlayer: getCurrentPlayer(room.gameState)
      });
    });

    socket.on('disconnect', () => {
      const roomCode = socket.data.roomCode;
      const playerId = socket.data.playerId;
      const authPlayerId = socket.data.authPlayerId;

      // Remove from online players
      if (authPlayerId && onlinePlayers[authPlayerId]) {
        delete onlinePlayers[authPlayerId];
        broadcastOnlineStatus(authPlayerId, false);
      }

      const room = getRoom(rooms, roomCode);
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.connected = false;
        io.to(room.code).emit('playerDisconnected', {
          username: player.username,
          players: sanitizePlayers(room.players)
        });
      }
    });
  });
};

module.exports = { setupGameSocket };

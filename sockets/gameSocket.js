const { v4: uuidv4 } = require('uuid');
const {
  rollCowrie,
  createGameState,
  getCurrentPlayer,
  getValidMoves,
  applyMove,
  advanceTurn,
  buildPublicGameState,
  createDiceStack,
  getStackMoveSummary
} = require('../game/engine');
const { Player, MatchHistory, Match, isDatabaseAvailable } = require('../models');
const { buildEquippedItems } = require('../utils/equippedItems');

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

// ── XP Calculation ──
// XP is ONLY awarded in online multiplayer games (not offline / vs computer)
// Victory: 50 XP | Capture a piece: 5 XP | Finish a piece (reach home): 10 XP
const XP_VICTORY = 500;
const XP_PER_CAPTURE = 50;
const XP_PER_FINISH = 100;

// Calculate XP earned by a specific player from game stats
const calculatePlayerXp = (playerId, room, isWinner) => {
  // No XP for offline / vs-computer games
  if (room.isOffline) return { total: 0, breakdown: null };

  const stats = room.gameStats?.[playerId] || { captures: 0, finishes: 0 };
  const victoryXp = isWinner ? XP_VICTORY : 0;
  const captureXp = stats.captures * XP_PER_CAPTURE;
  const finishXp = stats.finishes * XP_PER_FINISH;
  const total = victoryXp + captureXp + finishXp;

  return {
    total,
    breakdown: {
      victory: victoryXp,
      captures: { count: stats.captures, xp: captureXp },
      finishes: { count: stats.finishes, xp: finishXp },
      total
    }
  };
};

// Record victory and losses in database, create MatchHistory for each player
const recordVictory = async (winner, room) => {
  if (!isDatabaseAvailable()) return {};
  const xpResults = {};
  try {
    const player = await Player.findByPk(winner.id);
    if (!player) return xpResults;

    // Calculate match duration from room.gameStartedAt
    let durationStr = '0:00';
    if (room.gameStartedAt) {
      const elapsed = Math.floor((Date.now() - room.gameStartedAt) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Determine the game mode
    const gameMode = room.isOffline ? 'Offline' : 'Online';

    player.total_games += 1;
    if (room.isOffline) {
      player.wins_vs_computer += 1;
    } else {
      player.wins_vs_players += 1;
      // Award XP to winner (online games only)
      const { total, breakdown } = calculatePlayerXp(winner.id, room, true);
      player.xp = (player.xp || 0) + total;
      xpResults[winner.id] = { xpEarned: total, newXp: player.xp, newRank: player.rank, newLevel: player.level, breakdown };
    }
    await player.save();

    // Create MatchHistory for the winner (only if not a guest)
    if (!winner.id.startsWith('guest-')) {
      const winnerXpGained = xpResults[winner.id]?.xpEarned || 0;
      const opponentNames = room.players
        .filter(p => p.id !== winner.id)
        .map(p => p.username)
        .join(', ');
      try {
        await MatchHistory.create({
          player_id: winner.id,
          opponent_name: opponentNames || 'Unknown',
          result: 'win',
          mode: gameMode,
          duration: durationStr,
          xp_gained: winnerXpGained,
          captures: room.gameStats?.[winner.id]?.captures || 0,
          finishes: room.gameStats?.[winner.id]?.finishes || 0,
          players_count: room.players.length
        });
      } catch (e) {
        console.error('Failed to create winner match history:', e.message);
      }
    }

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
            // Award XP for captures/finishes even to losers (online only)
            const { total, breakdown } = calculatePlayerXp(p.id, room, false);
            otherPlayer.xp = (otherPlayer.xp || 0) + total;
            xpResults[p.id] = { xpEarned: total, newXp: otherPlayer.xp, newRank: otherPlayer.rank, newLevel: otherPlayer.level, breakdown };
          }
          await otherPlayer.save();

          // Create MatchHistory for the loser
          const loserXpGained = xpResults[p.id]?.xpEarned || 0;
          const opponentNames = room.players
            .filter(op => op.id !== p.id)
            .map(op => op.username)
            .join(', ');
          try {
            await MatchHistory.create({
              player_id: p.id,
              opponent_name: opponentNames || 'Unknown',
              result: 'loss',
              mode: gameMode,
              duration: durationStr,
              xp_gained: loserXpGained,
              captures: room.gameStats?.[p.id]?.captures || 0,
              finishes: room.gameStats?.[p.id]?.finishes || 0,
              players_count: room.players.length
            });
          } catch (e) {
            console.error('Failed to create loser match history:', e.message);
          }
        }
      } catch (e) { /* skip */ }
    }

    // Create a Match record for the overall game
    try {
      await Match.create({
        winner_id: winner.id.startsWith('guest-') ? null : winner.id,
        room_code: room.code,
        players_data: room.players.map(p => ({
          id: p.id,
          username: p.username,
          color: p.color,
          isAi: p.isAi || false,
          stats: room.gameStats?.[p.id] || { captures: 0, finishes: 0 },
          xpEarned: xpResults[p.id]?.xpEarned || 0
        }))
      });
    } catch (e) {
      console.error('Failed to create match record:', e.message);
    }
  } catch (error) {
    console.error('Error recording victory:', error.message);
  }
  return xpResults;
};

const maybeHandleAiTurn = (io, room) => {
  if (!room.gameState) return;
  const current = getCurrentPlayer(room.gameState);
  if (!current?.isAi) return;

  // ── AI Dice Stack Turn ──

  // Phase 1: Rolling phase — AI accumulates stack
  const doAiRoll = () => {
    if (!room.gameState) return;
    if (!room.diceStack) room.diceStack = createDiceStack();

    setTimeout(() => {
      if (!room.gameState) return;
      const roll = rollCowrie();
      const isStackingRoll = roll.move === 4 || roll.move === 8;
      const hasExistingStack = room.diceStack.values.length > 0;

      if (isStackingRoll || hasExistingStack) {
        // Push to stack only when 4/8 rolled, or there are prior stacked values
        room.diceStack.values.push(roll.move);
      }

      io.to(room.code).emit('diceRolled', {
        diceValue: roll.move,
        playerId: current.id,
        playerColor: current.color,
        validMoves: [],
        gameState: buildPublicGameState(room.gameState),
        diceStack: isStackingRoll || hasExistingStack ? { ...room.diceStack } : createDiceStack()
      });

      if (isStackingRoll) {
        // Stack continues — AI rolls again
        io.to(room.code).emit('stackUpdated', {
          diceStack: { ...room.diceStack },
          phase: 'rolling',
          gameState: buildPublicGameState(room.gameState)
        });
        doAiRoll();
      } else if (hasExistingStack) {
        // Non-4/8 finalises a prior stack — go to selection phase
        doAiSelectAndMove();
      } else {
        // Plain roll (1,2,3) with no prior stack — treat as single-value stack internally
        room.gameState.lastRoll = roll;
        room.diceStack.values.push(roll.move); // single value so doAiSelectAndMove works
        doAiSelectAndMove();
      }
    }, 1200);
  };

  // Phase 2: AI selects a value and moves, repeating until stack is empty
  const doAiSelectAndMove = () => {
    if (!room.gameState) return;
    if (!room.diceStack) return;

    const { hasAnyMoves, movesPerValue } = getStackMoveSummary(
      room.gameState, current.id, room.diceStack.values
    );

    if (!hasAnyMoves) {
      // No valid moves for any stack value — pass
      room.diceStack = createDiceStack();
      io.to(room.code).emit('stackUpdated', {
        diceStack: { ...room.diceStack },
        phase: 'idle',
        gameState: buildPublicGameState(room.gameState)
      });
      advanceTurn(room.gameState);
      io.to(room.code).emit('turnPassed', {
        reason: 'No valid moves',
        gameState: buildPublicGameState(room.gameState),
        currentPlayer: getCurrentPlayer(room.gameState),
        diceStack: createDiceStack()
      });
      maybeHandleAiTurn(io, room);
      return;
    }

    // AI picks the best value (prefer one with capture/finish moves)
    let bestIdx = -1;
    let bestScore = -1;
    room.diceStack.values.forEach((val, idx) => {
      const moves = movesPerValue[idx] || [];
      if (moves.length === 0) return;
      let score = moves.length;
      moves.forEach(m => {
        if (m.action === 'finish') score += 50;
        if (m.action === 'captureInPlace') score += 60;
        // Check if landing causes capture
        const hasOpp = room.gameState.players.some(p =>
          p.id !== current.id && p.tokens.some(t => t.row === m.to.row && t.col === m.to.col && !t.isFinished)
        );
        if (hasOpp) score += 70;
      });
      if (score > bestScore) { bestScore = score; bestIdx = idx; }
    });

    if (bestIdx === -1) {
      // Fallback: pick first with moves
      bestIdx = room.diceStack.values.findIndex((_, idx) => (movesPerValue[idx] || []).length > 0);
    }

    const selectedValue = room.diceStack.values[bestIdx];
    room.diceStack.selectedValue = selectedValue;
    room.diceStack.selectedIndex = bestIdx;

    const validMoves = movesPerValue[bestIdx] || getValidMoves(room.gameState, current.id, selectedValue);

    io.to(room.code).emit('stackValueSelected', {
      selectedIndex: bestIdx,
      selectedValue,
      validMoves,
      diceStack: { ...room.diceStack },
      gameState: buildPublicGameState(room.gameState)
    });

    // Now AI picks the best move for this value
    setTimeout(async () => {
      if (!room.gameState) return;
      const chosen = chooseAiMove(validMoves, room.gameState, current.id);
      const result = applyMove(room.gameState, current.id, chosen.tokenIndex, selectedValue, chosen.action);
      if (!result) return;

      // Track stats for XP calculation (AI turn)
      if (room.gameStats?.[current.id]) {
        if (result.capturedTokens?.length) room.gameStats[current.id].captures += result.capturedTokens.length;
        if (result.finishedNow) room.gameStats[current.id].finishes += 1;
      }

      // Remove used value from stack
      room.diceStack.values.splice(bestIdx, 1);
      room.diceStack.selectedValue = null;
      room.diceStack.selectedIndex = null;

      // Check for bonus turns (capture or finish)
      const earnedBonus = result.capturedTokens.length > 0 || result.finishedNow;
      if (earnedBonus) {
        room.diceStack.bonusTurns += 1;
      }

      io.to(room.code).emit('tokenMoved', {
        tokenIndex: chosen.tokenIndex,
        tokenId: chosen.tokenId,
        playerColor: current.color,
        from: result.from,
        to: result.to,
        capturedTokens: result.capturedTokens,
        gameState: buildPublicGameState(room.gameState),
        extraTurn: true, // Always true during stack resolution
        currentPlayer: current,
        diceStack: { ...room.diceStack },
        finishedNow: result.finishedNow
      });

      if (result.winner) {
        const xpResults = await recordVictory(result.winner, room);
        io.to(room.code).emit('gameOver', {
          winner: result.winner,
          gameState: buildPublicGameState(room.gameState),
          xpResults
        });
        return;
      }

      // Decide next action
      if (room.diceStack.values.length > 0) {
        // More values in stack — continue selecting
        setTimeout(() => doAiSelectAndMove(), 1000);
      } else if (room.diceStack.bonusTurns > 0) {
        // Bonus turns remaining — roll again
        room.diceStack.bonusTurns -= 1;
        io.to(room.code).emit('stackUpdated', {
          diceStack: { ...room.diceStack },
          phase: 'rolling',
          gameState: buildPublicGameState(room.gameState)
        });
        doAiRoll();
      } else {
        // Stack empty, no bonus — advance turn
        room.diceStack = createDiceStack();
        advanceTurn(room.gameState);
        io.to(room.code).emit('turnPassed', {
          reason: 'Turn ended',
          gameState: buildPublicGameState(room.gameState),
          currentPlayer: getCurrentPlayer(room.gameState),
          diceStack: createDiceStack()
        });
        maybeHandleAiTurn(io, room);
      }
    }, 1500);
  };

  // Start AI turn
  doAiRoll();
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
    socket.on('respondToInvite', async ({ roomCode, accepted, playerId, username }) => {
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
          room: { code: room.code, hostId: room.hostId, isOffline: room.isOffline, passcode: room.passcode },
          diceStack: room.diceStack || createDiceStack()
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

      // Fetch equipped items from DB with full metadata
      const equippedItems = await buildEquippedItems(playerId);

      const playerColor = getNextAvailableColor(room.players);
      room.players.push({
        id: playerId,
        username,
        color: playerColor,
        ready: false,
        connected: true,
        equippedItems
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
          room: { code: room.code, hostId: room.hostId, isOffline: room.isOffline, passcode: room.passcode },
          diceStack: room.diceStack || createDiceStack()
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
        equippedItems: { board: 'b01', cowrie: 'c01', piece: 'p01', boardMeta: { themeId: 0 }, cowrieMeta: { setId: 0 }, pieceMeta: { pieceSetId: 0 } }
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
        equippedItems: { board: 'b01', cowrie: 'c01', piece: 'p01', boardMeta: { themeId: 0 }, cowrieMeta: { setId: 0 }, pieceMeta: { pieceSetId: 0 } }
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
      room.gameStartedAt = Date.now(); // Track game start time for duration calculation
      room.diceStack = createDiceStack(); // Initialize dice stack
      // Initialize per-player game stats for XP tracking
      room.gameStats = {};
      room.players.forEach(p => {
        room.gameStats[p.id] = { captures: 0, finishes: 0 };
      });

      emitGameState(io, room);
      maybeHandleAiTurn(io, room);
    });

    socket.on('rollDice', ({ roomCode, playerId }) => {
      const room = getRoom(rooms, roomCode);
      if (!room || !room.gameState) return;
      if (room.gamePaused) return;

      const current = getCurrentPlayer(room.gameState);
      const hostOverride = room.isOffline && room.hostId === playerId;
      if (!current || (!hostOverride && current.id !== playerId)) return;

      // Initialize stack if needed
      if (!room.diceStack) room.diceStack = createDiceStack();

      const roll = rollCowrie();
      const actingPlayerId = hostOverride ? current.id : playerId;

      const isStackingRoll = roll.move === 4 || roll.move === 8;
      const hasExistingStack = room.diceStack.values.length > 0;

      if (isStackingRoll) {
        // 4 or 8 — push to stack and force re-roll
        room.diceStack.values.push(roll.move);
        io.to(room.code).emit('diceRolled', {
          diceValue: roll.move,
          playerId: actingPlayerId,
          playerColor: current.color,
          validMoves: [],
          gameState: buildPublicGameState(room.gameState),
          diceStack: { ...room.diceStack },
          stackPhase: 'rolling'
        });
        room.gameState.lastRoll = roll;
      } else if (hasExistingStack) {
        // Non-4/8 but there are prior stacked values — finalise the stack
        room.diceStack.values.push(roll.move);
        const { hasAnyMoves, movesPerValue } = getStackMoveSummary(
          room.gameState, actingPlayerId, room.diceStack.values
        );

        io.to(room.code).emit('diceRolled', {
          diceValue: roll.move,
          playerId: actingPlayerId,
          playerColor: current.color,
          validMoves: [],
          gameState: buildPublicGameState(room.gameState),
          diceStack: { ...room.diceStack },
          stackPhase: 'selecting',
          movesPerValue
        });

        if (!hasAnyMoves) {
          // No valid moves for any stack value — auto-pass
          room.diceStack = createDiceStack();
          setTimeout(() => {
            advanceTurn(room.gameState);
            io.to(room.code).emit('turnPassed', {
              reason: 'No valid moves',
              gameState: buildPublicGameState(room.gameState),
              currentPlayer: getCurrentPlayer(room.gameState),
              diceStack: createDiceStack()
            });
            maybeHandleAiTurn(io, room);
          }, 1500);
        }

        room.gameState.lastRoll = roll;
      } else {
        // Plain roll (1, 2, 3) with no prior stack — bypass stack entirely
        room.gameState.lastRoll = roll;
        const validMoves = getValidMoves(room.gameState, actingPlayerId, roll.move);

        // Store on diceStack.selectedValue so moveToken can use it
        room.diceStack.selectedValue = roll.move;
        room.diceStack.selectedIndex = 0;

        io.to(room.code).emit('diceRolled', {
          diceValue: roll.move,
          playerId: actingPlayerId,
          playerColor: current.color,
          validMoves,
          gameState: buildPublicGameState(room.gameState),
          diceStack: createDiceStack(), // empty stack — no panel shown
          stackPhase: 'moving'
        });

        if (!validMoves.length) {
          room.diceStack = createDiceStack();
          setTimeout(() => {
            advanceTurn(room.gameState);
            io.to(room.code).emit('turnPassed', {
              reason: 'No valid moves',
              gameState: buildPublicGameState(room.gameState),
              currentPlayer: getCurrentPlayer(room.gameState),
              diceStack: createDiceStack()
            });
            maybeHandleAiTurn(io, room);
          }, 1500);
        }
      }
    });

    // Player selects a value from the dice stack to use
    socket.on('selectStackValue', ({ roomCode, playerId, stackIndex }) => {
      const room = getRoom(rooms, roomCode);
      if (!room || !room.gameState || !room.diceStack) return;
      if (room.gamePaused) return;

      const current = getCurrentPlayer(room.gameState);
      const hostOverride = room.isOffline && room.hostId === playerId;
      if (!current || (!hostOverride && current.id !== playerId)) return;

      const actingPlayerId = hostOverride ? current.id : playerId;
      const idx = Number(stackIndex);
      if (idx < 0 || idx >= room.diceStack.values.length) return;

      const selectedValue = room.diceStack.values[idx];
      room.diceStack.selectedValue = selectedValue;
      room.diceStack.selectedIndex = idx;

      const validMoves = getValidMoves(room.gameState, actingPlayerId, selectedValue);

      if (validMoves.length === 0) {
        // No valid moves for this value — consume it
        room.diceStack.values.splice(idx, 1);
        room.diceStack.selectedValue = null;
        room.diceStack.selectedIndex = null;

        // Check if any remaining values have moves
        if (room.diceStack.values.length > 0) {
          const { hasAnyMoves, movesPerValue } = getStackMoveSummary(
            room.gameState, actingPlayerId, room.diceStack.values
          );

          io.to(room.code).emit('stackValueSkipped', {
            skippedValue: selectedValue,
            diceStack: { ...room.diceStack },
            movesPerValue,
            gameState: buildPublicGameState(room.gameState)
          });

          if (!hasAnyMoves) {
            // All remaining values also have no moves — pass
            room.diceStack = createDiceStack();
            advanceTurn(room.gameState);
            io.to(room.code).emit('turnPassed', {
              reason: 'No valid moves',
              gameState: buildPublicGameState(room.gameState),
              currentPlayer: getCurrentPlayer(room.gameState),
              diceStack: createDiceStack()
            });
            maybeHandleAiTurn(io, room);
          }
        } else if (room.diceStack.bonusTurns > 0) {
          // Stack empty but bonus turns available
          room.diceStack.bonusTurns -= 1;
          io.to(room.code).emit('stackUpdated', {
            diceStack: { ...room.diceStack },
            phase: 'rolling',
            gameState: buildPublicGameState(room.gameState)
          });
        } else {
          // Stack empty, no bonus — advance
          room.diceStack = createDiceStack();
          advanceTurn(room.gameState);
          io.to(room.code).emit('turnPassed', {
            reason: 'No valid moves remaining',
            gameState: buildPublicGameState(room.gameState),
            currentPlayer: getCurrentPlayer(room.gameState),
            diceStack: createDiceStack()
          });
          maybeHandleAiTurn(io, room);
        }
        return;
      }

      // Has valid moves — send them
      io.to(room.code).emit('stackValueSelected', {
        selectedIndex: idx,
        selectedValue,
        validMoves,
        diceStack: { ...room.diceStack },
        gameState: buildPublicGameState(room.gameState)
      });
    });

    socket.on('moveToken', async ({ roomCode, playerId, tokenIndex, action }) => {
      const room = getRoom(rooms, roomCode);
      if (!room || !room.gameState) return;
      if (room.gamePaused) return;

      const current = getCurrentPlayer(room.gameState);
      const hostOverride = room.isOffline && room.hostId === playerId;
      if (!current || (!hostOverride && current.id !== playerId)) return;

      if (!room.diceStack || room.diceStack.selectedValue === null) return;

      const actingPlayerId = hostOverride ? current.id : playerId;
      const moveSteps = room.diceStack.selectedValue;
      const stackIdx = room.diceStack.selectedIndex;

      const validMoves = getValidMoves(room.gameState, actingPlayerId, moveSteps);
      const targetIndex = Number(tokenIndex);
      const chosen = validMoves.find(move => move.tokenIndex === targetIndex && (!action || move.action === action));

      if (!chosen) return;

      const result = applyMove(room.gameState, actingPlayerId, targetIndex, moveSteps, chosen.action);
      if (!result) return;

      // Track stats for XP calculation (human move)
      if (room.gameStats?.[actingPlayerId]) {
        if (result.capturedTokens?.length) room.gameStats[actingPlayerId].captures += result.capturedTokens.length;
        if (result.finishedNow) room.gameStats[actingPlayerId].finishes += 1;
      }

      // Remove used value from stack
      room.diceStack.values.splice(stackIdx, 1);
      room.diceStack.selectedValue = null;
      room.diceStack.selectedIndex = null;

      // ── PRIORITY RULE: Bonus turn (kill / finish) triggers IMMEDIATELY ──
      // Bonus turn takes priority over any remaining stack values.
      // The stack values are preserved and usable AFTER the bonus turn resolves.
      const earnedBonus = result.capturedTokens.length > 0 || result.finishedNow;
      if (earnedBonus) {
        room.diceStack.bonusTurns += 1;
      }

      const stackHasValues = room.diceStack.values.length > 0;
      const hasBonusTurns = room.diceStack.bonusTurns > 0;
      const turnContinues = stackHasValues || hasBonusTurns;

      io.to(room.code).emit('tokenMoved', {
        tokenIndex,
        tokenId: chosen.tokenId,
        playerColor: current.color,
        from: result.from,
        to: result.to,
        capturedTokens: result.capturedTokens,
        gameState: buildPublicGameState(room.gameState),
        extraTurn: turnContinues,
        currentPlayer: current,
        diceStack: { ...room.diceStack },
        finishedNow: result.finishedNow,
        bonusTriggered: earnedBonus       // flag for client animation
      });

      if (result.winner) {
        const xpResults = await recordVictory(result.winner, room);
        io.to(room.code).emit('gameOver', {
          winner: result.winner,
          gameState: buildPublicGameState(room.gameState),
          xpResults
        });
        return;
      }

      // ── PRIORITY: bonus turn fires before stack values ──
      if (hasBonusTurns) {
        // Consume one bonus turn — player rolls again immediately.
        // Any remaining stack values are preserved and will be offered AFTER the bonus turn.
        room.diceStack.bonusTurns -= 1;
        io.to(room.code).emit('stackUpdated', {
          diceStack: { ...room.diceStack },
          phase: 'rolling',          // player rolls for the bonus turn
          preservedStack: true,      // client hint: stack chips persist but are greyed until roll done
          gameState: buildPublicGameState(room.gameState)
        });
      } else if (stackHasValues) {
        // No bonus pending — offer remaining stack values
        const { hasAnyMoves, movesPerValue } = getStackMoveSummary(
          room.gameState, actingPlayerId, room.diceStack.values
        );
        io.to(room.code).emit('stackUpdated', {
          diceStack: { ...room.diceStack },
          phase: hasAnyMoves ? 'selecting' : 'idle',
          movesPerValue,
          gameState: buildPublicGameState(room.gameState)
        });
        if (!hasAnyMoves) {
          // Remaining values have no moves — discard them, advance turn
          room.diceStack = createDiceStack();
          advanceTurn(room.gameState);
          io.to(room.code).emit('turnPassed', {
            reason: 'Turn ended',
            gameState: buildPublicGameState(room.gameState),
            currentPlayer: getCurrentPlayer(room.gameState),
            diceStack: createDiceStack()
          });
          maybeHandleAiTurn(io, room);
        }
      } else {
        // Nothing left — advance turn
        room.diceStack = createDiceStack();
        advanceTurn(room.gameState);
        io.to(room.code).emit('turnPassed', {
          reason: 'Turn ended',
          gameState: buildPublicGameState(room.gameState),
          currentPlayer: getCurrentPlayer(room.gameState),
          diceStack: createDiceStack()
        });
        maybeHandleAiTurn(io, room);
      }
    });

    // ── Emoji Taunt System ──
    socket.on('sendEmoji', ({ roomCode, playerId, emoji }) => {
      const room = getRoom(rooms, roomCode);
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
      if (!player) return;

      // Cooldown: 2.5 seconds between emojis per player
      const now = Date.now();
      if (player._lastEmojiAt && now - player._lastEmojiAt < 2500) return;
      player._lastEmojiAt = now;

      // Validate emoji is a single printable character (emoji)
      if (!emoji || typeof emoji !== 'string' || emoji.length > 8) return;

      io.to(room.code).emit('emojiReceived', {
        playerId,
        username: player.username,
        color: player.color || 'neutral',
        emoji,
        timestamp: now
      });
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
              // Guard: game may have ended or reset while timer was running
              if (!room.gameState) return;

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
                recordVictory(lastPlayer, room).then(xpResults => {
                  io.to(room.code).emit('gameOver', {
                    winner: lastPlayer,
                    gameState: buildPublicGameState(room.gameState),
                    xpResults
                  });
                });
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
        room: { code: room.code, hostId: room.hostId, isOffline: room.isOffline, passcode: room.passcode },
        diceStack: room.diceStack || createDiceStack()
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

const { v4: uuidv4 } = require('uuid');
const { getPlayerPath, outerPath, innerPath, isSafeCell, CENTER } = require('./path');

const COLOR_ORDER = ['red', 'green', 'yellow', 'blue'];

const rollCowrie = () => {
  let mouthsUp = 0;
  for (let i = 0; i < 4; i++) {
    if (Math.random() < 0.5) mouthsUp += 1;
  }
  const move = mouthsUp === 0 ? 8 : mouthsUp;
  const extraTurn =  move === 4 || move === 8;
  return { mouthsUp, move, extraTurn };
};

const sortPlayersByColor = (players) => {
  return [...players].sort((a, b) => COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color));
};

const createToken = (playerId, index, color) => {
  const path = getPlayerPath(color);
  const start = path[0];
  return {
    id: `${playerId}-t${index + 1}`,
    index,
    positionIndex: 0,
    row: start.row,
    col: start.col,
    isFinished: false
  };
};

const createGameState = (players) => {
  const ordered = sortPlayersByColor(players);
  const statePlayers = ordered.map(p => {
    const tokens = Array.from({ length: 4 }, (_, idx) => createToken(p.id, idx, p.color));
    return {
      id: p.id,
      username: p.username,
      color: p.color,
      isAi: !!p.isAi,
      connected: p.connected !== false,
      hasCaptured: false,
      tokens,
      finishedCount: 0
    };
  });

  return {
    id: uuidv4(),
    players: statePlayers,
    turnIndex: 0,
    diceValue: null,
    extraTurnPending: false,
    lastRoll: null,
    startedAt: new Date().toISOString()
  };
};

const getCurrentPlayer = (gameState) => gameState.players[gameState.turnIndex];

const getTokenCoordinates = (color, positionIndex) => {
  const path = getPlayerPath(color);
  const target = path[positionIndex];
  return { row: target.row, col: target.col };
};

const getValidMoves = (gameState, playerId, moveSteps) => {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return [];

  const playerPath = getPlayerPath(player.color);
  const outerLength = outerPath.length;
  const maxIndex = playerPath.length - 1;

  const moves = [];

  player.tokens
    .filter(token => !token.isFinished)
    .forEach(token => {
      const targetIndex = token.positionIndex + moveSteps;
      if (targetIndex > maxIndex) return;
      
      // Check if player has captured at least once to unlock inner path
      const tokenCurrentlyInner = token.positionIndex >= outerLength;
      const tokenWouldEnterInner = targetIndex >= outerLength && !tokenCurrentlyInner;
      if (tokenWouldEnterInner && !player.hasCaptured) return;

      const to = getTokenCoordinates(player.color, targetIndex);
      const from = { row: token.row, col: token.col };
      const action = targetIndex === maxIndex ? 'finish' : 'move';

      // Regular move option
      moves.push({
        tokenIndex: token.index,
        tokenId: token.id,
        from,
        to,
        action
      });

      // Special case: if moveSteps === 2 and current position has opponent piece
      if (moveSteps === 2 && !isSafeCell(from.row, from.col) && !(from.row === CENTER.row && from.col === CENTER.col)) {
        // Check if there's an opponent piece at current position
        const hasOpponent = gameState.players.some(p => 
          p.id !== playerId && 
          p.tokens.some(t => !t.isFinished && t.row === from.row && t.col === from.col)
        );

        if (hasOpponent) {
          // Add capture-in-place option
          moves.push({
            tokenIndex: token.index,
            tokenId: token.id,
            from,
            to: from, // Stay in same place
            action: 'captureInPlace'
          });
        }
      }
    });

  return moves;
};

const applyMove = (gameState, playerId, tokenIndex, moveSteps, action = null) => {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return null;

  const playerPath = getPlayerPath(player.color);
  const outerLength = outerPath.length;
  const maxIndex = playerPath.length - 1;

  const token = player.tokens.find(t => t.index === tokenIndex);
  if (!token || token.isFinished) return null;

  const from = { row: token.row, col: token.col };

  // Handle capture-in-place action
  if (action === 'captureInPlace') {
    const to = from; // Don't move
    let capturedTokens = [];

    // Capture the opponent piece at current position
    if (!isSafeCell(to.row, to.col) && !(to.row === CENTER.row && to.col === CENTER.col)) {
      let captured = false;
      for (const opponent of gameState.players) {
        if (opponent.id === player.id) continue;
        if (captured) break;
        for (const opToken of opponent.tokens) {
          if (opToken.isFinished) continue;
          if (opToken.row === to.row && opToken.col === to.col) {
            const reset = getTokenCoordinates(opponent.color, 0);
            opToken.positionIndex = 0;
            opToken.row = reset.row;
            opToken.col = reset.col;
            capturedTokens.push({ tokenId: opToken.id, playerId: opponent.id });
            captured = true;
            
            // Check if opponent now has all tokens at base - reset their hasCaptured
            const allAtBase = opponent.tokens.every(t => t.positionIndex === 0);
            if (allAtBase) {
              opponent.hasCaptured = false;
            }
            break;
          }
        }
      }
    }

    if (capturedTokens.length > 0) {
      player.hasCaptured = true;
    }

    return {
      from,
      to,
      token,
      capturedTokens,
      finishedNow: false,
      winner: null
    };
  }

  // Normal move logic
  const targetIndex = token.positionIndex + moveSteps;
  if (targetIndex > maxIndex) return null;
  
  // Check if player has captured at least once to unlock inner path
  const tokenCurrentlyInner = token.positionIndex >= outerLength;
  const tokenWouldEnterInner = targetIndex >= outerLength && !tokenCurrentlyInner;
  if (tokenWouldEnterInner && !player.hasCaptured) return null;

  const to = getTokenCoordinates(player.color, targetIndex);

  token.positionIndex = targetIndex;
  token.row = to.row;
  token.col = to.col;

  let capturedTokens = [];
  if (!isSafeCell(to.row, to.col) && !(to.row === CENTER.row && to.col === CENTER.col)) {
    // Only capture ONE opponent token per landing (traditional rule)
    let captured = false;
    for (const opponent of gameState.players) {
      if (opponent.id === player.id) continue;
      if (captured) break;
      for (const opToken of opponent.tokens) {
        if (opToken.isFinished) continue;
        if (opToken.row === to.row && opToken.col === to.col) {
          const reset = getTokenCoordinates(opponent.color, 0);
          opToken.positionIndex = 0;
          opToken.row = reset.row;
          opToken.col = reset.col;
          capturedTokens.push({ tokenId: opToken.id, playerId: opponent.id });
          captured = true;
          
          // Check if opponent now has all tokens at base - reset their hasCaptured
          const allAtBase = opponent.tokens.every(t => t.positionIndex === 0);
          if (allAtBase) {
            opponent.hasCaptured = false;
          }
          break;
        }
      }
    }
  }

  if (capturedTokens.length > 0) {
    player.hasCaptured = true;
  }

  let finishedNow = false;
  if (targetIndex === maxIndex) {
    token.isFinished = true;
    player.finishedCount += 1;
    finishedNow = true;
  }

  const winner = player.finishedCount === 4 ? player : null;

  return {
    from,
    to,
    token,
    capturedTokens,
    finishedNow,
    winner
  };
};

const advanceTurn = (gameState) => {
  let nextIndex = gameState.turnIndex;
  const total = gameState.players.length;
  for (let i = 0; i < total; i++) {
    nextIndex = (nextIndex + 1) % total;
    const candidate = gameState.players[nextIndex];
    // Skip disconnected and forfeited players
    if (candidate.connected !== false && !candidate.forfeited) break;
  }
  gameState.turnIndex = nextIndex;
};

const buildPublicGameState = (gameState) => {
  if (!gameState) return null;
  return {
    ...gameState,
    players: gameState.players.map(p => ({
      id: p.id,
      username: p.username,
      color: p.color,
      isAi: p.isAi,
      connected: p.connected,
      hasCaptured: p.hasCaptured,
      forfeited: p.forfeited || false,
      finishedCount: p.finishedCount,
      tokens: p.tokens
    }))
  };
};

module.exports = {
  rollCowrie,
  createGameState,
  getCurrentPlayer,
  getValidMoves,
  applyMove,
  advanceTurn,
  buildPublicGameState
};

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

let rooms = {};

router.setRooms = (roomsRef) => {
  rooms = roomsRef;
};

const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const getNextPlayerColor = (existingPlayers) => {
  const playerCount = existingPlayers.length;
  const usedColors = existingPlayers.map(p => p.color);
  
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

// POST /create-room - Create a new game room (requires login)
router.post('/create-room', (req, res) => {
  try {
    const { playerId, username, isOffline, passcode } = req.body;

    if (!playerId || !username) {
      return res.status(400).json({
        success: false,
        message: 'Player ID and username are required'
      });
    }

    // Validate passcode for online rooms (4 digits)
    if (!isOffline && (!passcode || !/^\d{4}$/.test(passcode))) {
      return res.status(400).json({
        success: false,
        message: 'A 4-digit passcode is required for online rooms'
      });
    }

    let roomCode = generateRoomCode();
    while (rooms[roomCode]) {
      roomCode = generateRoomCode();
    }

    rooms[roomCode] = {
      id: uuidv4(),
      code: roomCode,
      isOffline: isOffline || false,
      passcode: isOffline ? null : passcode,
      hostId: playerId,
      players: [{
        id: playerId,
        username,
        color: 'red',
        ready: false,
        connected: true
      }],
      maxPlayers: 4,
      gameStarted: false,
      gameState: null,
      createdAt: new Date()
    };

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room: {
        code: roomCode,
        hostId: rooms[roomCode].hostId,
        players: rooms[roomCode].players,
        isOffline: rooms[roomCode].isOffline,
        passcode: rooms[roomCode].passcode
      }
    });

  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating room'
    });
  }
});

// POST /join-room - Join an existing game room (requires passcode)
router.post('/join-room', (req, res) => {
  try {
    const { playerId, username, roomCode, passcode } = req.body;

    if (!playerId || !username || !roomCode) {
      return res.status(400).json({
        success: false,
        message: 'Player ID, username, and room code are required'
      });
    }

    const room = rooms[roomCode.toUpperCase()];

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (room.gameStarted) {
      return res.status(400).json({
        success: false,
        message: 'Game has already started'
      });
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({
        success: false,
        message: 'Room is full'
      });
    }

    // Verify passcode for online rooms
    if (!room.isOffline && room.passcode && room.passcode !== passcode) {
      return res.status(403).json({
        success: false,
        message: 'Incorrect room passcode'
      });
    }

    const existingPlayer = room.players.find(p => p.id === playerId);
    if (existingPlayer) {
      return res.json({
        success: true,
        message: 'Already in room',
        room: {
          code: roomCode,
          hostId: room.hostId,
          players: room.players,
          isOffline: room.isOffline,
          passcode: room.passcode
        }
      });
    }

    const playerColor = getNextPlayerColor(room.players);

    room.players.push({
      id: playerId,
      username,
      color: playerColor,
      ready: false,
      connected: true
    });

    res.json({
      success: true,
      message: 'Joined room successfully',
      room: {
        code: roomCode.toUpperCase(),
        hostId: room.hostId,
        players: room.players,
        isOffline: room.isOffline,
        passcode: room.passcode
      }
    });

  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error joining room'
    });
  }
});

// GET /room/:code - Get room info
router.get('/room/:code', (req, res) => {
  try {
    const { code } = req.params;
    const room = rooms[code.toUpperCase()];

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      room: {
        code: room.code,
        hostId: room.hostId,
        players: room.players,
        gameStarted: room.gameStarted,
        isOffline: room.isOffline,
        passcode: room.passcode
      }
    });

  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting room'
    });
  }
});

module.exports = router;

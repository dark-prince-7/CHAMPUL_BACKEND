const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { Player, Friendship, isDatabaseAvailable } = require('../models');

const router = express.Router();

// Generate unique 8-digit profile ID
const generateProfileId = async () => {
  let id;
  let exists = true;
  while (exists) {
    id = String(Math.floor(10000000 + Math.random() * 90000000));
    const found = await Player.findOne({ where: { profile_id: id } });
    exists = !!found;
  }
  return id;
};

// POST /register - Register a new player
router.post('/register', async (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ 
      success: false, 
      message: 'Database not available. Use guest mode instead.' 
    });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username must be between 3 and 50 characters' 
      });
    }

    if (password.length < 4) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 4 characters' 
      });
    }

    const existingPlayer = await Player.findOne({ where: { username } });
    if (existingPlayer) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username already taken' 
      });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    const profile_id = await generateProfileId();

    const player = await Player.create({
      id: uuidv4(),
      profile_id,
      username,
      password_hash
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      player: {
        id: player.id,
        profile_id: player.profile_id,
        username: player.username,
        avatar_color: player.avatar_color,
        wins_vs_computer: player.wins_vs_computer,
        losses_vs_computer: player.losses_vs_computer,
        wins_vs_players: player.wins_vs_players,
        losses_vs_players: player.losses_vs_players,
        total_games: player.total_games,
        created_at: player.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// POST /login - Login a player
router.post('/login', async (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ 
      success: false, 
      message: 'Database not available. Use guest mode instead.' 
    });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    const player = await Player.findOne({ where: { username } });
    if (!player) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    const isMatch = await bcrypt.compare(password, player.password_hash);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      player: {
        id: player.id,
        profile_id: player.profile_id,
        username: player.username,
        avatar_color: player.avatar_color,
        wins_vs_computer: player.wins_vs_computer,
        losses_vs_computer: player.losses_vs_computer,
        wins_vs_players: player.wins_vs_players,
        losses_vs_players: player.losses_vs_players,
        total_games: player.total_games,
        created_at: player.created_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// GET /profile/:id - Get player profile
router.get('/profile/:id', async (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database not available' });
  }
  try {
    const player = await Player.findByPk(req.params.id, {
      attributes: ['id', 'profile_id', 'username', 'avatar_color', 'wins_vs_computer', 'losses_vs_computer', 'wins_vs_players', 'losses_vs_players', 'total_games', 'created_at']
    });
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }
    res.json({ success: true, player });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /profile/:id - Update profile
router.put('/profile/:id', async (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database not available' });
  }
  try {
    const player = await Player.findByPk(req.params.id);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }
    const { avatar_color, username } = req.body;
    if (avatar_color) player.avatar_color = avatar_color;
    if (username && username.trim().length >= 3 && username.trim().length <= 50) {
      // Check if new username is taken by someone else
      const existing = await Player.findOne({ where: { username: username.trim(), id: { [Op.ne]: player.id } } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Username already taken' });
      }
      player.username = username.trim();
    }
    await player.save();
    res.json({
      success: true,
      player: {
        id: player.id,
        profile_id: player.profile_id,
        username: player.username,
        avatar_color: player.avatar_color,
        wins_vs_computer: player.wins_vs_computer,
        losses_vs_computer: player.losses_vs_computer,
        wins_vs_players: player.wins_vs_players,
        losses_vs_players: player.losses_vs_players,
        total_games: player.total_games,
        created_at: player.created_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /search-player - Search by profile_id or username
router.post('/search-player', async (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database not available' });
  }
  try {
    const { query, requesterId } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query required' });
    }

    // Build search conditions - search by profile_id (exact or partial) and username
    const searchConditions = [];
    
    // Exact profile_id match
    searchConditions.push({ profile_id: query });
    
    // Partial profile_id match (if numeric)
    if (/^\d+$/.test(query)) {
      searchConditions.push({ profile_id: { [Op.like]: `%${query}%` } });
    }
    
    // Username search (case-insensitive)
    searchConditions.push({ username: { [Op.iLike]: `%${query}%` } });

    const whereClause = {
      [Op.or]: searchConditions
    };
    
    // Exclude the requester if provided
    if (requesterId) {
      whereClause.id = { [Op.ne]: requesterId };
    }

    const players = await Player.findAll({
      where: whereClause,
      attributes: ['id', 'profile_id', 'username', 'avatar_color'],
      limit: 10
    });

    res.json({ success: true, players });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /friend-request - Send friend request
router.post('/friend-request', async (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database not available' });
  }
  try {
    const { requesterId, addresseeId } = req.body;
    if (!requesterId || !addresseeId) {
      return res.status(400).json({ success: false, message: 'Both player IDs required' });
    }
    if (requesterId === addresseeId) {
      return res.status(400).json({ success: false, message: 'Cannot add yourself' });
    }

    // Check existing friendship in either direction
    const existing = await Friendship.findOne({
      where: {
        [Op.or]: [
          { requester_id: requesterId, addressee_id: addresseeId },
          { requester_id: addresseeId, addressee_id: requesterId }
        ]
      }
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ success: false, message: 'Already friends' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ success: false, message: 'Friend request already pending' });
      }
    }

    const friendship = await Friendship.create({
      requester_id: requesterId,
      addressee_id: addresseeId,
      status: 'pending'
    });

    res.status(201).json({ success: true, message: 'Friend request sent', friendship });
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /friend-request/:id - Accept or reject friend request
router.put('/friend-request/:id', async (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database not available' });
  }
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const friendship = await Friendship.findByPk(req.params.id);
    if (!friendship) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }

    friendship.status = status;
    await friendship.save();

    res.json({ success: true, message: `Friend request ${status}`, friendship });
  } catch (error) {
    console.error('Friend request update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /friend/:id - Remove friend 
router.delete('/friend/:id', async (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database not available' });
  }
  try {
    const { playerId } = req.body;
    const friendshipId = req.params.id;

    const friendship = await Friendship.findByPk(friendshipId);
    if (!friendship) {
      return res.status(404).json({ success: false, message: 'Friendship not found' });
    }

    await friendship.destroy();
    res.json({ success: true, message: 'Friend removed' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /friends/:playerId - Get all friends and pending requests
router.get('/friends/:playerId', async (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database not available' });
  }
  try {
    const { playerId } = req.params;

    // Get accepted friends
    const friendships = await Friendship.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [
          { requester_id: playerId },
          { addressee_id: playerId }
        ]
      },
      include: [
        { model: Player, as: 'requester', attributes: ['id', 'profile_id', 'username', 'avatar_color'] },
        { model: Player, as: 'addressee', attributes: ['id', 'profile_id', 'username', 'avatar_color'] }
      ]
    });

    const friends = friendships.map(f => {
      const friend = f.requester_id === playerId ? f.addressee : f.requester;
      return { ...friend.toJSON(), friendshipId: f.id };
    });

    // Get pending requests received
    const pendingReceived = await Friendship.findAll({
      where: {
        addressee_id: playerId,
        status: 'pending'
      },
      include: [
        { model: Player, as: 'requester', attributes: ['id', 'profile_id', 'username', 'avatar_color'] }
      ]
    });

    // Get pending requests sent
    const pendingSent = await Friendship.findAll({
      where: {
        requester_id: playerId,
        status: 'pending'
      },
      include: [
        { model: Player, as: 'addressee', attributes: ['id', 'profile_id', 'username', 'avatar_color'] }
      ]
    });

    res.json({
      success: true,
      friends,
      pendingReceived: pendingReceived.map(f => ({
        friendshipId: f.id,
        ...f.requester.toJSON()
      })),
      pendingSent: pendingSent.map(f => ({
        friendshipId: f.id,
        ...f.addressee.toJSON()
      }))
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

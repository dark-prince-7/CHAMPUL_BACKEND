const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { Player, Friendship, PlayerItem, StoreItem, MatchHistory, isDatabaseAvailable } = require('../models');

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

exports.register = async (req, res) => {
    if (!isDatabaseAvailable()) {
        return res.status(503).json({ success: false, message: 'Database not available. Use guest mode instead.' });
    }

    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({ success: false, message: 'Username must be between 3 and 50 characters' });
        }

        if (password.length < 4) {
            return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
        }

        const existingPlayer = await Player.findOne({ where: { username } });
        if (existingPlayer) {
            return res.status(409).json({ success: false, message: 'Username already taken' });
        }

        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        const profile_id = await generateProfileId();

        const player = await Player.create({
            id: uuidv4(),
            profile_id,
            username,
            password_hash,
            coins: 5000,
            gems: 100
        });

        const defaults = [
            { id: 'b01', cat: 'board' },
            { id: 'c01', cat: 'cowrie' },
            { id: 'p01', cat: 'piece' }
        ];
        for (const d of defaults) {
            await PlayerItem.create({
                player_id: player.id,
                item_id: d.id,
                category: d.cat,
                equipped: true
            }).catch(err => console.error('Failed granting default item:', err));
        }

        const token = jwt.sign(
            { id: player.id, username: player.username, profile_id: player.profile_id },
            process.env.JWT_SECRET || 'champul-super-secret-key',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                token,
                player: { id: player.id, username: player.username, profile_id: player.profile_id, coins: player.coins, gems: player.gems }
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.login = async (req, res) => {
    if (!isDatabaseAvailable()) {
        return res.status(503).json({ success: false, message: 'Database not available' });
    }

    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        const player = await Player.findOne({ where: { username } });

        if (!player) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, player.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: player.id, username: player.username, profile_id: player.profile_id },
            process.env.JWT_SECRET || 'champul-super-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                player: { id: player.id, username: player.username, coins: player.coins, gems: player.gems, profile_id: player.profile_id }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        if (req.user.id !== req.params.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to profile' });
        }

        const player = await Player.findByPk(req.params.id, {
            attributes: { exclude: ['password_hash'] }
        });

        if (!player) {
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        res.json({ success: true, message: 'Profile fetched', data: { player } });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        if (req.user.id !== req.params.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized update attempt' });
        }

        const { avatar_url, title_status, is_online } = req.body;
        const player = await Player.findByPk(req.params.id);

        if (!player) {
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        if (avatar_url !== undefined) player.avatar_url = avatar_url;
        if (title_status !== undefined) player.title_status = title_status;
        if (is_online !== undefined) player.is_online = is_online;

        await player.save();

        const updatedPlayerData = player.toJSON();
        delete updatedPlayerData.password_hash;

        res.json({ success: true, message: 'Profile updated', data: { player: updatedPlayerData } });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.searchPlayers = async (req, res) => {
    try {
        const { query, currentUserId } = req.body;
        if (!query || query.length < 3) {
            return res.status(400).json({ success: false, message: 'Query must be at least 3 characters long', data: null });
        }

        const exactProfileMatch = await Player.findOne({
            where: { profile_id: query },
            attributes: ['id', 'username', 'profile_id', 'avatar_color']
        });

        const usernameMatches = await Player.findAll({
            where: {
                username: { [Op.iLike]: `%${query}%` },
                ...(currentUserId ? { id: { [Op.ne]: currentUserId } } : {})
            },
            attributes: ['id', 'username', 'profile_id', 'avatar_color'],
            limit: 20
        });

        const allPlayers = [];
        if (exactProfileMatch && exactProfileMatch.id !== currentUserId) {
            allPlayers.push(exactProfileMatch);
        }

        usernameMatches.forEach(p => {
            if (!allPlayers.find(existing => existing.id === p.id)) {
                allPlayers.push(p);
            }
        });

        res.json({ success: true, message: 'Players found', data: { players: allPlayers } });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, message: 'Search failed', data: null });
    }
};

exports.sendFriendRequest = async (req, res) => {
    try {
        const { requesterId, addresseeId } = req.body;
        if (req.user.id !== requesterId) {
            return res.status(403).json({ success: false, message: 'Unauthorized friend request attempt', data: null });
        }
        if (requesterId === addresseeId) {
            return res.status(400).json({ success: false, message: 'Cannot add yourself', data: null });
        }

        const existing = await Friendship.findOne({
            where: {
                [Op.or]: [
                    { requester_id: requesterId, addressee_id: addresseeId },
                    { requester_id: addresseeId, addressee_id: requesterId }
                ]
            }
        });

        if (existing) {
            if (existing.status === 'rejected') {
                // Overwrite the rejected request with a new pending one
                existing.requester_id = requesterId;
                existing.addressee_id = addresseeId;
                existing.status = 'pending';
                await existing.save();
                return res.status(201).json({ success: true, message: 'Friend request sent', data: { friendship: existing } });
            }
            return res.status(400).json({ success: false, message: 'Friendship or request already exists', data: null });
        }

        const friendship = await Friendship.create({
            id: uuidv4(),
            requester_id: requesterId,
            addressee_id: addresseeId,
            status: 'pending'
        });

        res.status(201).json({ success: true, message: 'Friend request sent', data: { friendship } });
    } catch (error) {
        console.error('Friend request error:', error);
        res.status(500).json({ success: false, message: 'Failed to send friend request', data: null });
    }
};

exports.respondFriendRequest = async (req, res) => {
    try {
        const { friendshipId } = req.params;
        const { status } = req.body;
        const friendship = await Friendship.findByPk(friendshipId);

        if (!friendship) return res.status(404).json({ success: false, message: 'Request not found', data: null });
        if (req.user.id !== friendship.addressee_id) {
            return res.status(403).json({ success: false, message: 'Unauthorized response attempt', data: null });
        }

        friendship.status = status;
        await friendship.save();

        res.json({ success: true, message: 'Friend request updated', data: { friendship } });
    } catch (error) {
        console.error('Friend response error:', error);
        res.status(500).json({ success: false, message: 'Failed to respond', data: null });
    }
};

exports.getFriends = async (req, res) => {
    try {
        const { playerId } = req.params;
        if (req.user.id !== playerId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to friends list', data: null });
        }

        const friendships = await Friendship.findAll({
            where: {
                [Op.or]: [{ requester_id: playerId }, { addressee_id: playerId }]
            },
            include: [
                { model: Player, as: 'requester', attributes: ['id', 'username', 'avatar_color', 'profile_id'] },
                { model: Player, as: 'addressee', attributes: ['id', 'username', 'avatar_color', 'profile_id'] }
            ]
        });

        const friends = [];
        const pendingSent = [];
        const pendingReceived = [];

        friendships.forEach(f => {
            const isRequester = f.requester_id === playerId;
            const otherUser = isRequester ? f.addressee : f.requester;

            const friendData = {
                friendship_id: f.id,
                id: otherUser.id,
                username: otherUser.username,
                profile_id: otherUser.profile_id,
                avatar_color: otherUser.avatar_color,
                created_at: f.createdAt
            };

            if (f.status === 'accepted') {
                friends.push(friendData);
            } else if (f.status === 'pending') {
                if (isRequester) pendingSent.push(friendData);
                else pendingReceived.push(friendData);
            }
        });

        res.json({ success: true, message: 'Friends fetched', data: { friends, pendingReceived, pendingSent } });
    } catch (error) {
        console.error('Fetch friends error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch friends', data: null });
    }
};

exports.removeFriend = async (req, res) => {
    try {
        const { friendshipId } = req.params;
        const { requesterId } = req.body;
        if (req.user.id !== requesterId) {
            return res.status(403).json({ success: false, message: 'Unauthorized removal attempt', data: null });
        }

        const friendship = await Friendship.findByPk(friendshipId);
        if (!friendship) return res.status(404).json({ success: false, message: 'Friendship not found', data: null });

        await friendship.destroy();
        res.json({ success: true, message: 'Friend removed', data: null });
    } catch (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove friend', data: null });
    }
};

exports.getHistory = async (req, res) => {
    try {
        if (req.user.id !== req.params.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to match history', data: null });
        }

        const history = await MatchHistory.findAll({
            where: {
                player_id: req.params.id
            },
            order: [['created_at', 'DESC']],
            limit: 50
        });

        res.json({ success: true, message: 'Match history fetched', data: { history } });
    } catch (error) {
        console.error('History fetch error:', error);
        res.status(500).json({ success: false, message: 'Internal server error', data: null });
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const leaderboard = await Player.findAll({
            attributes: ['id', 'username', 'wins_vs_players', 'total_games', 'profile_id', 'avatar_url'],
            order: [['wins_vs_players', 'DESC']],
            limit: 50
        });

        res.json({ success: true, message: 'Leaderboard fetched', data: { leaderboard } });
    } catch (error) {
        console.error('Leaderboard fetch error:', error);
        res.status(500).json({ success: false, message: 'Internal server error', data: null });
    }
};

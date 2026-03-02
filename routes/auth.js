const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const authController = require('../controllers/authController');

const router = express.Router();

// Auth
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters').escape(),
  body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters')
], validateRequest, authController.register);

router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required').escape(),
  body('password').notEmpty().withMessage('Password is required')
], validateRequest, authController.login);

// Profile
router.get('/profile/:id', authenticateToken, authController.getProfile);
router.put('/profile/:id', [
  authenticateToken,
  body('avatar_url').optional().isString().trim(),
  body('title_status').optional().isString().trim(),
  body('is_online').optional().isBoolean()
], validateRequest, authController.updateProfile);

// Social (Search & Friends)
router.post('/search', [
  authenticateToken,
  body('query').trim().isLength({ min: 3 }).withMessage('Query must be at least 3 characters long').escape(),
  body('currentUserId').optional().isString().withMessage('Invalid user ID')
], validateRequest, authController.searchPlayers);

router.post('/friend-request', [
  authenticateToken,
  body('requesterId').isString().withMessage('Invalid requester ID'),
  body('addresseeId').isString().withMessage('Invalid addressee ID')
], validateRequest, authController.sendFriendRequest);

router.put('/friend-request/:friendshipId', [
  authenticateToken,
  body('status').isIn(['accepted', 'rejected']).withMessage('Invalid status')
], validateRequest, authController.respondFriendRequest);

router.get('/friends/:playerId', authenticateToken, authController.getFriends);

router.delete('/friends/:friendshipId', [
  authenticateToken,
  body('requesterId').isString().withMessage('Invalid requester ID')
], validateRequest, authController.removeFriend);

// History & Leaderboard
router.get('/history/:id', authenticateToken, authController.getHistory);
router.get('/leaderboard', authController.getLeaderboard);

// Rank reward claiming
router.post('/claim-rank-reward', [
  authenticateToken,
  body('rankId').isString().notEmpty().withMessage('Invalid rank ID')
], validateRequest, authController.claimRankReward);

module.exports = router;

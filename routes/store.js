const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const storeController = require('../controllers/storeController');

const router = express.Router();

router.get('/store', storeController.getStoreItems);
router.get('/collection/:playerId', authenticateToken, storeController.getCollection);

router.post('/store/buy', [
    authenticateToken,
    body('playerId').isUUID().withMessage('Invalid player ID'),
    body('itemId').isString().notEmpty().withMessage('Invalid item ID')
], validateRequest, storeController.buyItem);

router.put('/collection/equip', [
    authenticateToken,
    body('playerId').isUUID().withMessage('Invalid player ID'),
    body('itemId').isString().notEmpty().withMessage('Invalid item ID'),
    body('category').isIn(['board', 'cowrie', 'piece', 'theme', 'avatar', 'emote']).withMessage('Invalid category')
], validateRequest, storeController.equipItem);

module.exports = router;

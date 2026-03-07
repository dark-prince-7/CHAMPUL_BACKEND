const { StoreItem, PlayerItem, Player, PurchaseHistory, sequelize } = require('../models');
const { buildEquippedItems } = require('../utils/equippedItems');

exports.getStoreItems = async (req, res) => {
    try {
        const items = await StoreItem.findAll({
            order: [['category', 'ASC'], ['price', 'ASC']]
        });
        res.json({ success: true, message: 'Store items fetched', data: items });
    } catch (error) {
        console.error('Fetch store error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch store items' });
    }
};

exports.getCollection = async (req, res) => {
    try {
        const { playerId } = req.params;

        // Auto-grant default items if they don't exist for this player
        const DEFAULT_ITEMS = [
            { id: 'b01', cat: 'board' },
            { id: 'c01', cat: 'cowrie' },
            { id: 'p01', cat: 'piece' }
        ];
        for (const d of DEFAULT_ITEMS) {
            const exists = await PlayerItem.findOne({
                where: { player_id: playerId, item_id: d.id }
            });
            if (!exists) {
                // Check if player owns ANY item in this category
                const hasCategory = await PlayerItem.findOne({
                    where: { player_id: playerId, category: d.cat }
                });
                await PlayerItem.create({
                    player_id: playerId,
                    item_id: d.id,
                    category: d.cat,
                    equipped: !hasCategory  // equip default only if no other item in category is owned
                }).catch(() => {});
            }
        }

        const inventory = await PlayerItem.findAll({
            where: { player_id: playerId },
            include: [{ model: StoreItem, as: 'store_item' }],
            order: [['acquired_at', 'DESC']]
        });

        const grouped = { boards: [], cowries: [], pieces: [], themes: [], avatars: [], emotes: [] };
        inventory.forEach(inv => {
            if (!inv.store_item) return;
            const item = {
                ...(inv.store_item.toJSON ? inv.store_item.toJSON() : inv.store_item),
                equipped: inv.equipped
            };
            let cat = item.category + 's';
            if (item.category === 'cowrie') cat = 'cowries';
            if (grouped[cat]) grouped[cat].push(item);
            else grouped[cat] = [item];
        });

        res.json({ success: true, message: 'Collection fetched', data: { collection: grouped, raw: inventory } });
    } catch (error) {
        console.error('Fetch collection error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch collection', data: null });
    }
};

exports.buyItem = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { playerId, itemId } = req.body;

        if (req.user.id !== playerId) {
            await transaction.rollback();
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const player = await Player.findByPk(playerId, { transaction });
        const item = await StoreItem.findByPk(itemId, { transaction });

        if (!player || !item) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Player or Item not found', data: null });
        }

        const existingItem = await PlayerItem.findOne({
            where: { player_id: playerId, item_id: itemId },
            transaction
        });

        if (existingItem) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Item already owned', data: null });
        }

        if (item.currency === 'coins' && player.coins < item.price) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Not enough coins', data: null });
        }
        if (item.currency === 'gems' && player.gems < item.price) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Not enough gems', data: null });
        }

        if (item.currency === 'coins') player.coins -= item.price;
        if (item.currency === 'gems') player.gems -= item.price;
        await player.save({ transaction });

        const playerItem = await PlayerItem.create({
            player_id: playerId,
            item_id: itemId,
            category: item.category,
            equipped: false
        }, { transaction });

        // Record purchase history (non-blocking — don't fail the purchase if history logging fails)
        try {
            await PurchaseHistory.create({
                player_id: playerId,
                item_id: itemId,
                item_name: item.name,
                category: item.category,
                rarity: item.rarity,
                currency: item.currency,
                amount_spent: item.price,
                coins_before: item.currency === 'coins' ? player.coins + item.price : player.coins,
                coins_after: player.coins,
                gems_before: item.currency === 'gems' ? player.gems + item.price : player.gems,
                gems_after: player.gems
            }, { transaction });
        } catch (historyErr) {
            console.error('Warning: Failed to record purchase history:', historyErr.message);
            // Continue with the purchase — history is nice-to-have, not critical
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'Purchase successful',
            data: { coins: player.coins, gems: player.gems, item: playerItem }
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Buy item error:', error);
        res.status(500).json({ success: false, message: 'Failed to buy item', data: null });
    }
};

exports.equipItem = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { playerId, itemId, category } = req.body;
        if (req.user.id !== playerId) {
            await transaction.rollback();
            return res.status(403).json({ success: false, message: 'Unauthorized equip attempt', data: null });
        }

        const targetItem = await PlayerItem.findOne({
            where: { player_id: playerId, item_id: itemId },
            transaction
        });

        if (!targetItem) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Item not owned', data: null });
        }

        await PlayerItem.update(
            { equipped: false },
            { where: { player_id: playerId, category: category }, transaction }
        );

        targetItem.equipped = true;
        await targetItem.save({ transaction });

        await transaction.commit();
        res.json({ success: true, message: 'Item equipped', data: null });
    } catch (error) {
        await transaction.rollback();
        console.error('Equip item error:', error);
        res.status(500).json({ success: false, message: 'Failed to equip item', data: null });
    }
};

exports.getPurchaseHistory = async (req, res) => {
    try {
        const { playerId } = req.params;
        const history = await PurchaseHistory.findAll({
            where: { player_id: playerId },
            order: [['purchased_at', 'DESC']],
            limit: 100
        });

        // Compute totals
        let totalCoinsSpent = 0;
        let totalGemsSpent = 0;
        history.forEach(h => {
            if (h.currency === 'coins') totalCoinsSpent += h.amount_spent;
            if (h.currency === 'gems') totalGemsSpent += h.amount_spent;
        });

        res.json({
            success: true,
            data: {
                purchases: history,
                summary: {
                    totalCoinsSpent,
                    totalGemsSpent,
                    totalPurchases: history.length
                }
            }
        });
    } catch (error) {
        console.error('Fetch purchase history error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch purchase history' });
    }
};

// GET equipped items with full metadata for a player
exports.getEquippedItems = async (req, res) => {
    try {
        const { playerId } = req.params;
        const equipped = await buildEquippedItems(playerId);
        res.json({
            success: true,
            data: {
                board: { id: equipped.board, themeId: equipped.boardMeta.themeId ?? 0, metadata: equipped.boardMeta },
                cowrie: { id: equipped.cowrie, setId: equipped.cowrieMeta.setId ?? 0, metadata: equipped.cowrieMeta },
                piece: { id: equipped.piece, pieceSetId: equipped.pieceMeta.pieceSetId ?? 0, metadata: equipped.pieceMeta },
            }
        });
    } catch (error) {
        console.error('Fetch equipped items error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch equipped items' });
    }
};

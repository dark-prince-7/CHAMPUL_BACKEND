const { StoreItem, PlayerItem, Player, sequelize } = require('../models');

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
        let inventory = await PlayerItem.findAll({
            where: { player_id: playerId },
            include: [{ model: StoreItem, as: 'store_item' }]
        });

        if (inventory.length === 0) {
            const defaults = await StoreItem.findAll({
                where: { id: ['b01', 'c01', 'p01'] }
            });
            inventory = defaults.map(item => ({
                store_item: item,
                equipped: true,
                is_default: true
            }));
        }

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
            return res.status(403).json({ success: false, error: 'Unauthorized' });
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

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PurchaseHistory = sequelize.isDefined('PurchaseHistory') ? sequelize.model('PurchaseHistory') : sequelize.define('PurchaseHistory', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    player_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'players',
            key: 'id'
        }
    },
    item_id: {
        type: DataTypes.STRING(20),
        allowNull: false,
        references: {
            model: 'store_items',
            key: 'id'
        }
    },
    item_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Snapshot of item name at time of purchase'
    },
    category: {
        type: DataTypes.ENUM('board', 'cowrie', 'piece', 'theme', 'avatar', 'emote'),
        allowNull: false
    },
    rarity: {
        type: DataTypes.ENUM('common', 'rare', 'epic', 'legendary'),
        allowNull: false,
        defaultValue: 'common'
    },
    currency: {
        type: DataTypes.ENUM('coins', 'gems'),
        allowNull: false,
        defaultValue: 'coins'
    },
    amount_spent: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    coins_before: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Player coins balance before this purchase'
    },
    coins_after: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Player coins balance after this purchase'
    },
    gems_before: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Player gems balance before this purchase'
    },
    gems_after: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Player gems balance after this purchase'
    }
}, {
    tableName: 'purchase_history',
    timestamps: true,
    createdAt: 'purchased_at',
    updatedAt: false,
    indexes: [
        { fields: ['player_id'] },
        { fields: ['purchased_at'] }
    ]
});

module.exports = PurchaseHistory;

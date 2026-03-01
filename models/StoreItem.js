const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreItem = sequelize.isDefined('StoreItem') ? sequelize.model('StoreItem') : sequelize.define('StoreItem', {
    id: {
        type: DataTypes.STRING(20),
        primaryKey: true,
        comment: 'Custom ID like c01, b02, p05'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    category: {
        type: DataTypes.ENUM('board', 'cowrie', 'piece', 'theme', 'avatar', 'emote'),
        allowNull: false
    },
    price: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    currency: {
        type: DataTypes.ENUM('coins', 'gems'),
        allowNull: false,
        defaultValue: 'coins'
    },
    rarity: {
        type: DataTypes.ENUM('common', 'rare', 'epic', 'legendary'),
        allowNull: false,
        defaultValue: 'common'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Stores design-specific properties like boardBg, shellBg, auraType, etc.'
    }
}, {
    tableName: 'store_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = StoreItem;

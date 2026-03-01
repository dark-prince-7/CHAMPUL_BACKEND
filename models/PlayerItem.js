const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlayerItem = sequelize.isDefined('PlayerItem') ? sequelize.model('PlayerItem') : sequelize.define('PlayerItem', {
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
    category: {
        type: DataTypes.ENUM('board', 'cowrie', 'piece', 'theme', 'avatar', 'emote'),
        allowNull: false,
        comment: 'Denormalized category for faster equip checks'
    },
    equipped: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'player_items',
    timestamps: true,
    createdAt: 'acquired_at',
    updatedAt: false,
    indexes: [
        {
            unique: true,
            fields: ['player_id', 'item_id']
        }
    ]
});

module.exports = PlayerItem;

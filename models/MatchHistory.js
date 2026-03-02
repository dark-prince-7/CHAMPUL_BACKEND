const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MatchHistory = sequelize.isDefined('MatchHistory') ? sequelize.model('MatchHistory') : sequelize.define('MatchHistory', {
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
    opponent_name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Name of the opponent (player username or AI difficulty)'
    },
    result: {
        type: DataTypes.ENUM('win', 'loss', 'draw'),
        allowNull: false
    },
    mode: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Classic'
    },
    duration: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Duration of the match e.g. "12:34"'
    },
    xp_gained: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    captures: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of opponent pieces captured during the match'
    },
    finishes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of own pieces that reached home during the match'
    },
    players_count: {
        type: DataTypes.INTEGER,
        defaultValue: 2,
        comment: 'Number of players in the match (2-4)'
    }
}, {
    tableName: 'match_history',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = MatchHistory;

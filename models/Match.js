const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Match model for storing completed games
const Match = sequelize.isDefined('Match') ? sequelize.model('Match') : sequelize.define('Match', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  winner_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'players',
      key: 'id'
    }
  },
  room_code: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  players_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'JSON data of all players in the match'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'matches',
  timestamps: false
});

module.exports = Match;

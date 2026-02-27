const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Player model for user authentication and profile
const Player = sequelize.define('Player', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  profile_id: {
    type: DataTypes.STRING(8),
    allowNull: true,
    unique: true,
    comment: '8-digit unique profile ID for friend search'
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50]
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  avatar_color: {
    type: DataTypes.STRING(20),
    defaultValue: 'red',
    comment: 'Preferred avatar color'
  },
  wins_vs_computer: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  losses_vs_computer: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  wins_vs_players: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  losses_vs_players: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_games: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'players',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Player;

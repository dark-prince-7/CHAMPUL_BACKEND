const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Friendship model for managing friend relationships
const Friendship = sequelize.define('Friendship', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  requester_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'players',
      key: 'id'
    }
  },
  addressee_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'players',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'friendships',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['requester_id', 'addressee_id']
    }
  ]
});

module.exports = Friendship;

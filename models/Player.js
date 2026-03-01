const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// UserPlayer model for user authentication and profile
const UserPlayer = sequelize.isDefined('UserPlayer') ? sequelize.model('UserPlayer') : sequelize.define('UserPlayer', {
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
  },
  coins: {
    type: DataTypes.INTEGER,
    defaultValue: 5000,
    comment: 'In-game currency for purchasing items'
  },
  gems: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    comment: 'Premium currency'
  },
  xp: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Experience points earned from matches'
  },
  level: {
    type: DataTypes.VIRTUAL,
    get() {
      const currentXp = this.getDataValue('xp') || 0;
      return Math.max(1, Math.floor(currentXp / 1000) + 1);
    }
  },
  rank: {
    type: DataTypes.VIRTUAL,
    get() {
      const xp = this.getDataValue('xp') || 0;

      // Calculate Shellmaster independently as it has custom scaling at the top
      if (xp >= 700000) {
        if (xp >= 1000000) return 'Shellmaster III';
        if (xp >= 850000) return 'Shellmaster II';
        return 'Shellmaster I';
      }

      const tiers = [
        { name: 'Bronze', start: 0, range: 5000 },
        { name: 'Silver', start: 5000, range: 10000 }, // 5000 to 14999
        { name: 'Gold', start: 15000, range: 20000 }, // 15000 to 34999
        { name: 'Platinum', start: 35000, range: 30000 }, // 35000 to 64999
        { name: 'Diamond', start: 65000, range: 40000 }, // 65000 to 104999
        { name: 'Sapphire', start: 105000, range: 50000 }, // 105000 to 154999
        { name: 'Elite', start: 155000, range: 70000 }, // 155000 to 224999
        { name: 'Master', start: 225000, range: 100000 }, // 225000 to 324999
        { name: 'Grandmaster', start: 325000, range: 150000 }, // 325000 to 474999
        { name: 'Legendary', start: 475000, range: 225000 }, // 475000 to 699999
      ];

      // Find the appropriate tier
      let currentTier = tiers[0];
      for (let i = tiers.length - 1; i >= 0; i--) {
        if (xp >= tiers[i].start) {
          currentTier = tiers[i];
          break;
        }
      }

      // Calculate stage (I, II, III) within the tier based on exact sub-ranges
      // To match the requested thresholds perfectly, we specify them manually since they aren't linear 
      // e.g. Bronze: 0, 1500, 3000
      let stage = 'I';

      if (currentTier.name === 'Bronze') {
        if (xp >= 3000) stage = 'III';
        else if (xp >= 1500) stage = 'II';
      } else if (currentTier.name === 'Silver') {
        if (xp >= 11000) stage = 'III';
        else if (xp >= 8000) stage = 'II';
      } else if (currentTier.name === 'Gold') {
        if (xp >= 27000) stage = 'III';
        else if (xp >= 21000) stage = 'II';
      } else if (currentTier.name === 'Platinum') {
        if (xp >= 55000) stage = 'III';
        else if (xp >= 45000) stage = 'II';
      } else if (currentTier.name === 'Diamond') {
        if (xp >= 91000) stage = 'III';
        else if (xp >= 78000) stage = 'II';
      } else if (currentTier.name === 'Sapphire') {
        if (xp >= 138000) stage = 'III';
        else if (xp >= 121000) stage = 'II';
      } else if (currentTier.name === 'Elite') {
        if (xp >= 201000) stage = 'III';
        else if (xp >= 178000) stage = 'II';
      } else if (currentTier.name === 'Master') {
        if (xp >= 291000) stage = 'III';
        else if (xp >= 258000) stage = 'II';
      } else if (currentTier.name === 'Grandmaster') {
        if (xp >= 425000) stage = 'III';
        else if (xp >= 375000) stage = 'II';
      } else if (currentTier.name === 'Legendary') {
        if (xp >= 625000) stage = 'III';
        else if (xp >= 550000) stage = 'II';
      }

      return `${currentTier.name} ${stage}`;
    }
  }
}, {
  tableName: 'players',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = UserPlayer;

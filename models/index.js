const { sequelize, isDatabaseAvailable } = require('../config/database');

const UserPlayer = require('./Player');
const Match = require('./Match');
const Friendship = require('./Friendship');
const StoreItem = require('./StoreItem');
const PlayerItem = require('./PlayerItem');
const MatchHistory = require('./MatchHistory');

// Initialize associations function
const setupAssociations = require('./associations');
setupAssociations();

// Sync all models with database
const syncDatabase = async () => {
  if (!isDatabaseAvailable()) {
    console.log('⚠ Skipping database sync - database not available');
    return;
  }

  try {
    setupAssociations();
    await sequelize.sync({ alter: true });
    console.log('✓ Database models synchronized successfully.');
  } catch (error) {
    console.error('✗ Error synchronizing database:', error.message);
  }
};

module.exports = {
  sequelize,
  Player: UserPlayer,
  Match,
  Friendship,
  StoreItem,
  PlayerItem,
  MatchHistory,
  syncDatabase,
  isDatabaseAvailable
};

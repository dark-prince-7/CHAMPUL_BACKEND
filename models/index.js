const { sequelize, isDatabaseAvailable } = require('../config/database');
const Player = require('./Player');
const Match = require('./Match');
const Friendship = require('./Friendship');

// Set up associations
Player.hasMany(Match, { foreignKey: 'winner_id', as: 'wins' });
Match.belongsTo(Player, { foreignKey: 'winner_id', as: 'winner' });

// Friendship associations
Player.hasMany(Friendship, { foreignKey: 'requester_id', as: 'sentRequests' });
Player.hasMany(Friendship, { foreignKey: 'addressee_id', as: 'receivedRequests' });
Friendship.belongsTo(Player, { foreignKey: 'requester_id', as: 'requester' });
Friendship.belongsTo(Player, { foreignKey: 'addressee_id', as: 'addressee' });

// Sync all models with database
const syncDatabase = async () => {
  if (!isDatabaseAvailable()) {
    console.log('⚠ Skipping database sync - database not available');
    return;
  }
  
  try {
    // Use basic sync to avoid ALTER TABLE issues with UNIQUE constraints
    // This creates tables if they don't exist but won't modify existing ones
    await sequelize.sync();
    console.log('✓ Database models synchronized successfully.');
  } catch (error) {
    console.error('✗ Error synchronizing database:', error.message);
  }
};

module.exports = {
  sequelize,
  Player,
  Match,
  Friendship,
  syncDatabase,
  isDatabaseAvailable
};

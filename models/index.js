const { sequelize, isDatabaseAvailable } = require('../config/database');

const UserPlayer = require('./Player');
const Match = require('./Match');
const Friendship = require('./Friendship');
const StoreItem = require('./StoreItem');
const PlayerItem = require('./PlayerItem');
const MatchHistory = require('./MatchHistory');
const PurchaseHistory = require('./PurchaseHistory');

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
    // Use alter:{drop:false} — safe for PostgreSQL: adds missing tables/columns but never drops.
    // Unique constraints are defined in model indexes arrays so Sequelize generates
    // CREATE UNIQUE INDEX IF NOT EXISTS (idempotent) instead of the invalid ALTER COLUMN SET UNIQUE.
    await sequelize.sync({ alter: { drop: false } });
    console.log('✓ Database models synchronized successfully.');
  } catch (error) {
    const msg = error.message || '';
    const isConstraintError = msg.includes('UNIQUE') || msg.includes('already exists') ||
      msg.includes('duplicate') || msg.includes('42710') || msg.includes('42P07');

    if (isConstraintError) {
      console.warn('⚠ Constraint conflict during sync (tables already have these constraints) — running create-only sync...');
      try {
        // CREATE TABLE IF NOT EXISTS — safe no-op on existing tables
        await sequelize.sync({ force: false });
        console.log('✓ Create-only sync complete.');
      } catch (createErr) {
        console.error('✗ Create-only sync also failed:', createErr.message);
      }
    } else {
      console.error('✗ Bulk sync failed:', msg, '— falling back to individual model sync...');
    }

    // Fallback: sync each model individually so new tables still get created
    const models = [UserPlayer, Match, Friendship, StoreItem, PlayerItem, MatchHistory, PurchaseHistory];
    for (const model of models) {
      try {
        await model.sync({ force: false });
      } catch (modelErr) {
        // Ignore duplicate constraint/index errors on individual syncs
        const mMsg = modelErr.message || '';
        if (!mMsg.includes('already exists') && !mMsg.includes('42710') && !mMsg.includes('42P07')) {
          console.error(`  ✗ Failed to sync ${model.name || 'unknown'}:`, mMsg);
        }
      }
    }
    console.log('✓ Individual model sync complete (tables ensured).');
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
  PurchaseHistory,
  syncDatabase,
  isDatabaseAvailable
};

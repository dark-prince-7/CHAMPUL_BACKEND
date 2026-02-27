const { Sequelize } = require('sequelize');

// PostgreSQL database configuration
const sequelize = new Sequelize('champul_game', 'postgres', 'postgres', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Track if database is available
let databaseAvailable = false;

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');
    databaseAvailable = true;
  } catch (error) {
    console.warn('⚠ Database not available:', error.message);
    console.warn('⚠ Running in offline mode - authentication features disabled');
    console.warn('⚠ To enable database: Create PostgreSQL database "champul_game"');
    databaseAvailable = false;
  }
};

const isDatabaseAvailable = () => databaseAvailable;

module.exports = { sequelize, testConnection, isDatabaseAvailable };

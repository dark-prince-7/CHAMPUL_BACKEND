const { Sequelize } = require('sequelize');

// Implement global singleton to prevent multiple instances on some environments (like Windows drive casing issues)
if (!global._sequelize) {
  global._sequelize = new Sequelize(
    process.env.DB_NAME || 'champul_game',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
  console.log('--- Initialized NEW global sequelize instance');
} else {
  console.log('--- Using EXISTING global sequelize instance');
}

const sequelize = global._sequelize;

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

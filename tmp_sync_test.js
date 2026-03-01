require('dotenv').config();
const { sequelize } = require('./config/database');
const { syncDatabase } = require('./models');

(async () => {
    try {
        sequelize.options.logging = console.log;
        await syncDatabase();
        console.log("Sync success");
    } catch (err) {
        console.error("SYNC FAILED:");
        console.error(err);
    } finally {
        process.exit(0);
    }
})();

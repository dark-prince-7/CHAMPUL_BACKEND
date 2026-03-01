const isProduction = process.env.NODE_ENV === 'production';

// Centralized logging interface to make it easy to swap out with Winston/Morgan later
const logger = {
    info: (...args) => {
        console.log(`[INFO] [${new Date().toISOString()}]`, ...args);
    },
    warn: (...args) => {
        console.warn(`[WARN] [${new Date().toISOString()}]`, ...args);
    },
    error: (...args) => {
        console.error(`[ERROR] [${new Date().toISOString()}]`, ...args);
    },
    debug: (...args) => {
        if (!isProduction) {
            console.debug(`[DEBUG] [${new Date().toISOString()}]`, ...args);
        }
    }
};

module.exports = logger;

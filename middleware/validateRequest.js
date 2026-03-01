const fs = require('fs');
const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        const logData = `[${new Date().toISOString()}] ${req.originalUrl} - Body: ${JSON.stringify(req.body)} - Errors: ${JSON.stringify(errorMessages)}\n`;
        try { fs.appendFileSync('validation_errors.log', logData); } catch (e) { }
        console.error('Validation failed:', { url: req.originalUrl, body: req.body, errors: errorMessages });
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            data: errorMessages
        });
    }
    next();
};

module.exports = { validateRequest };

const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${err.message}`);
    console.error(err.stack);

    // Default to 500 server error
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Format response
    res.status(statusCode).json({
        success: false,
        message,
        data: null
    });
};

module.exports = errorHandler;

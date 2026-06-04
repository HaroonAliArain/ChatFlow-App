const errorMiddleware = (err, req, res, next) => {
    // Use the error's status code if already set, otherwise determine from error type
    let statusCode = res.statusCode !== 200 ? res.statusCode : 500;

    // Handle Mongoose validation errors as 400 Bad Request
    if (err.name === "ValidationError") {
        statusCode = 400;
    }

    // Handle Mongoose cast errors (invalid ObjectId, etc.)
    if (err.name === "CastError") {
        statusCode = 400;
    }

    res.status(statusCode).json({
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack
    });
}

export default errorMiddleware;
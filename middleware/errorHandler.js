const multer = require("multer");

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const globalErrorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
    const isDev = process.env.NODE_ENV === "development";
    let isOperational = err.isOperational || false;
    let message = "Internal Server Error";

    if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid resource identifier format: ${err.path}`;
        isOperational = true;
    } else if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0] || "field";
        message = `Duplicate field value entered for: ${field}`;
        isOperational = true;
    } else if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors).map(val => val.message).join(", ");
        isOperational = true;
    } else if (err instanceof multer.MulterError) {
        statusCode = 400;
        isOperational = true;
        if (err.code === "LIMIT_FILE_SIZE") {
            message = "File too large. Maximum allowed size is 2MB.";
        } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
            message = "Unexpected field name for file upload.";
        } else {
            message = `File upload error: ${err.message}`;
        }
    }

    if (!isOperational && !isDev) {
        statusCode = 500;
        message = "Internal Server Error";
    } else {
        message = err.message || message;
    }

    return res.status(statusCode).json({
        status: statusCode >= 500 ? "error" : "fail",
        message,
        ...(isDev && { stack: err.stack })
    });
};

module.exports = { AppError, asyncHandler, globalErrorHandler };
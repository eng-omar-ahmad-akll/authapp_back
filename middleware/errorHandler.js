// 1. Custom Async Handler لتغليف الـ async functions ومنع try-catch المتكرر
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// 2. Global Error Handling Middleware
const globalErrorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
    let message = err.message || "Internal Server Error";

    // معالجة خطأ معرف Mongoose غير المكتمل أو المطبوع بخطأ (CastError)
    if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid resource ID format: ${err.value}`;
    }

    // معالجة أخطاء القيود المكررة مثل الإيميل المكرر في Mongoose (Duplicate Key Error)
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0] || "field";
        message = `A record with this ${field} already exists`;
    }

    // معالجة أخطاء الـ Validation الخاصة بـ Mongoose Schema
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors).map((val) => val.message).join(", ");
    }

    // معالجة أخطاء التوكين الفاسد أو المنتهي (JWT Errors)
    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid token, authorization denied";
    }

    if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token has expired, please log in again";
    }

    return res.status(statusCode).json({
        status: "error",
        message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack
    });
};

module.exports = {
    asyncHandler,
    globalErrorHandler
};
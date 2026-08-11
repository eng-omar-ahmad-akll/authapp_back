const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const globalErrorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    // إخفاء التفاصيل في بيئة الإنتاج لأخطاء السيرفر الداخلي
    const isDev = process.env.NODE_ENV === "development";
    let message = (statusCode === 500 && !isDev)
        ? "Internal Server Error"
        : (err.message || "Internal Server Error");

    if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid resource identifier format: ${err.path}`;
    }

    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0] || "field";
        message = `Duplicate field value entered for: ${field}`;
    }

    if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors).map(val => val.message).join(", ");
    }

    return res.status(statusCode).json({
        status: "error",
        message,
        ...(isDev && { stack: err.stack })
    });
};

module.exports = { asyncHandler, globalErrorHandler };
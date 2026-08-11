const rateLimit = require("express-rate-limit");

// 1. Limiter عام لجميع مسارات الـ API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100,
    message: { 
        status: "fail", 
        message: "Too many requests from this IP, please try again after 15 minutes" 
    },
    standardHeaders: true,
    legacyHeaders: false
});

// 2. Limiter شديد الحماية لمسار تسجيل الدخول
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 5,
    message: { 
        status: "fail", 
        message: "Too many login attempts, please try again after 15 minutes" 
    },
    standardHeaders: true,
    legacyHeaders: false
});

// 3. Limiter لمسارات Auth العامة (مثل إنشاء الحسابات)
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // ساعة كاملة
    max: 10,
    message: { 
        status: "fail", 
        message: "Too many accounts created from this IP, please try again later" 
    },
    standardHeaders: true,
    legacyHeaders: false
});

// 4. Limiter لمسارات الـ OTP وتغيير كلمة السر
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 3,
    message: { 
        status: "fail", 
        message: "Too many password reset/OTP requests, please try again after 15 minutes" 
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    apiLimiter,
    loginLimiter,
    authLimiter,
    otpLimiter
};
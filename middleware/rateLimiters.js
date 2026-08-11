// rateLimiters.js
const rateLimit = require("express-rate-limit");

/**
 * دالة آمنة لاستخراج IP الحقيقي للعميل لتفادي IP Spoofing و IP Collisions خلف البروكسي
 */
const getClientIp = (req) => {
    return req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
};

/**
 * تطهير ومعايرة البريد الإلكتروني لمنع الثغرات الترتيبية ومحاولات التجاوز
 */
const getNormalizedEmail = (req) => {
    const rawEmail = req.body && typeof req.body.email === "string" ? req.body.email : "";
    return rawEmail.toLowerCase().replace(/\s+/g, "");
};

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    keyGenerator: (req) => getClientIp(req),
    message: { 
        status: "fail", 
        message: "Too many requests from this IP, please try again after 15 minutes" 
    },
    standardHeaders: true,
    legacyHeaders: false
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => {
        const clientIp = getClientIp(req);
        const email = getNormalizedEmail(req);
        return email ? `${clientIp}_${email}` : clientIp;
    },
    message: { 
        status: "fail", 
        message: "Too many login attempts for this account, please try again after 15 minutes" 
    },
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => getClientIp(req),
    message: { 
        status: "fail", 
        message: "Too many accounts created from this IP, please try again later" 
    },
    standardHeaders: true,
    legacyHeaders: false
});

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    keyGenerator: (req) => {
        const clientIp = getClientIp(req);
        const email = getNormalizedEmail(req);
        return email ? `${clientIp}_${email}` : clientIp;
    },
    message: { 
        status: "fail", 
        message: "Too many password reset/OTP requests for this account, please try again after 15 minutes" 
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
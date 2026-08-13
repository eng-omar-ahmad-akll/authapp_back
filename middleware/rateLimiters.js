/**
 * @file Rate Limiting Middleware
 * @description Provides rate limiting protections against Denial of Service (DoS) and Brute-Force attacks.
 * 
 * @author 3akl
 */

const rateLimit = require("express-rate-limit");

/**
 * Safely extracts client IP relying on validated Express req.ip
 * @param {Object} req - Express Request
 * @returns {string} Client IP address
 */
const getClientIp = (req) => {
    return req.ip || req.socket.remoteAddress || "127.0.0.1";
};

/**
 * Normalizes email address to avoid bypass variations
 * @param {Object} req - Express Request
 * @returns {string} Clean lowercase email address
 */
const getNormalizedEmail = (req) => {
    const rawEmail = req.body && typeof req.body.email === "string" ? req.body.email : "";
    return rawEmail.toLowerCase().replace(/\s+/g, "");
};

/**
 * Global API rate limiter (100 requests per 15 mins)
 * @author 3akl
 */
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

/**
 * Login endpoint rate limiter (5 attempts per IP + Email combination per 15 mins)
 * @author 3akl
 */
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

/**
 * Account registration rate limiter (10 registrations per IP per hour)
 * @author 3akl
 */
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

/**
 * Password reset / OTP request limiter (3 attempts per IP + Email combination per 15 mins)
 * @author 3akl
 */
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
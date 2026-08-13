/**
 * @file In-Memory Synchronous Token Blacklist Utility
 * @description Provides instant revocation checking for JWTs with automatic periodic cleanup mechanisms.
 * 
 * @author 3akl
 */

const MAX_BLACKLIST_SIZE = 50000;
const tokenBlacklist = new Map();

/**
 * Adds a revoked JWT to the in-memory blacklist
 * @param {string} token 
 * @param {number} expiresInMs - Expiration duration in ms (Default: 15 mins)
 * @author 3akl
 */
const addTokenToBlacklist = (token, expiresInMs = 15 * 60 * 1000) => {
    if (!token || typeof token !== "string") return;

    if (tokenBlacklist.size >= MAX_BLACKLIST_SIZE) {
        const firstKey = tokenBlacklist.keys().next().value;
        tokenBlacklist.delete(firstKey);
    }

    const expiresAt = Date.now() + expiresInMs;
    tokenBlacklist.set(token, expiresAt);
};

/**
 * Checks synchronously whether a JWT is blacklisted
 * @param {string} token 
 * @returns {boolean}
 * @author 3akl
 */
const isTokenBlacklisted = (token) => {
    if (!token) return false;
    const expiresAt = tokenBlacklist.get(token);
    if (!expiresAt) return false;

    if (Date.now() > expiresAt) {
        tokenBlacklist.delete(token);
        return false;
    }
    return true;
};

// Automatic cleanup interval every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [token, expiresAt] of tokenBlacklist.entries()) {
        if (now > expiresAt) tokenBlacklist.delete(token);
    }
}, 10 * 60 * 1000).unref();

module.exports = { isTokenBlacklisted, addTokenToBlacklist };
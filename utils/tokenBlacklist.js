// tokenBlacklist.js
const MAX_BLACKLIST_SIZE = 50000;
const tokenBlacklist = new Map();

/**
 * إضافة توكن إلى الـ Blacklist مع تحديد الحد الأقصى لحجم الذاكرة
 * @param {string} token 
 * @param {number} expiresInMs Default: 15 minutes
 */
const addTokenToBlacklist = async (token, expiresInMs = 15 * 60 * 1000) => {
    if (!token || typeof token !== "string") return;

    // Protection against Unbounded Memory Growth (Evict oldest if full)
    if (tokenBlacklist.size >= MAX_BLACKLIST_SIZE) {
        const firstKey = tokenBlacklist.keys().next().value;
        tokenBlacklist.delete(firstKey);
    }

    const expiresAt = Date.now() + expiresInMs;
    tokenBlacklist.set(token, expiresAt);
};

/**
 * التحقق مما إذا كان التوكن مضافاً للـ Blacklist وغير منتهي الصلاحية
 * @param {string} token 
 * @returns {Promise<boolean>}
 */
const isTokenBlacklisted = async (token) => {
    if (!token) return false;
    const expiresAt = tokenBlacklist.get(token);
    if (!expiresAt) return false;

    if (Date.now() > expiresAt) {
        tokenBlacklist.delete(token);
        return false;
    }
    return true;
};

// Single Periodic Timer بدلاً من آلاف الـ setTimeouts الفردية
setInterval(() => {
    const now = Date.now();
    for (const [token, expiresAt] of tokenBlacklist.entries()) {
        if (now > expiresAt) tokenBlacklist.delete(token);
    }
}, 10 * 60 * 1000).unref();

module.exports = { isTokenBlacklisted, addTokenToBlacklist };
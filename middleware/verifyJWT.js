const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { isTokenBlacklisted } = require("../utils/tokenBlacklist");

const verifyJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ status: "fail", message: "Unauthorized - Missing Token" });
    }

    const token = authHeader.split(" ")[1];

    try {
        // 1. التحقق من صحة التوكن وفك التشفير
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // 2. التحقق من الـ Blacklist بشكل Synchronous مباشر
        if (isTokenBlacklisted(token)) {
            return res.status(401).json({ status: "fail", message: "Unauthorized - Token has been revoked" });
        }

        // 3. جلب بيانات المستخدم مع الحقول الحساسة
        const user = await User.findById(decoded.UserInfo.id).select("+passwordChangedAt +isActive");

        if (!user) {
            return res.status(401).json({ status: "fail", message: "Unauthorized - User no longer exists" });
        }

        if (user.isActive === false) {
            return res.status(401).json({ status: "fail", message: "Unauthorized - Account deactivated or banned" });
        }

        // 4. التحقق من تغيير كلمة المرور بعد إصدار التوكن
        if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
            return res.status(401).json({ status: "fail", message: "Unauthorized - Password recently changed. Please log in again." });
        }

        req.user = {
            id: user._id.toString(),
            role: (user.role || "user").toLowerCase()
        };

        next();
    } catch (err) {
        if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
            return res.status(403).json({ status: "fail", message: "Forbidden - Invalid or Expired Token" });
        }
        return res.status(500).json({ status: "error", message: "Internal Server Error during Authentication" });
    }
};

module.exports = verifyJWT;
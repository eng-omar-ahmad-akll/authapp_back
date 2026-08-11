const jwt = require("jsonwebtoken");

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ status: "fail", message: "Unauthorized - Missing Token" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ status: "fail", message: "Forbidden - Invalid or Expired Token" });
        }

        // توحيد الحقول لتسهيل استخدام req.user في كل السيرفر
        req.user = {
            id: decoded.UserInfo.id,
            role: (decoded.UserInfo.role || "user").toLowerCase()
        };

        next();
    });
};

module.exports = verifyJWT;
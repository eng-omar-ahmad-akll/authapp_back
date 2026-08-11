const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ status: "fail", message: "Unauthorized - Missing Token" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ status: "fail", message: "Forbidden - Invalid or Expired Token" });
        }

        try {
            const user = await User.findById(decoded.UserInfo.id).select("+passwordChangedAt");
            if (!user) {
                return res.status(401).json({ status: "fail", message: "Unauthorized - User no longer exists" });
            }

            if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
                return res.status(401).json({ status: "fail", message: "Unauthorized - Password recently changed. Please log in again." });
            }

            req.user = {
                id: user._id.toString(),
                role: (user.role || "user").toLowerCase()
            };

            next();
        } catch (dbErr) {
            return res.status(500).json({ status: "error", message: "Internal Server Error during Authentication" });
        }
    });
};

module.exports = verifyJWT;
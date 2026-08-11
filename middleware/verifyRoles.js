const User = require("../models/User");

const verifyRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id || req.user;

            if (!userId) {
                return res.status(401).json({
                    status: "fail",
                    message: "Unauthorized - Missing user identity"
                });
            }

            const currentUser = await User.findById(userId).select("role").lean().exec();

            if (!currentUser) {
                return res.status(403).json({
                    status: "fail",
                    message: "Forbidden - Insufficient privileges"
                });
            }

            const userRole = (currentUser.role || "").toLowerCase();
            const normalizedAllowed = allowedRoles.map(r => String(r).toLowerCase());

            if (!normalizedAllowed.includes(userRole)) {
                return res.status(403).json({
                    status: "fail",
                    message: "Forbidden - Insufficient privileges"
                });
            }

            req.role = userRole;
            next();
        } catch (err) {
            next(err);
        }
    };
};

module.exports = verifyRoles;
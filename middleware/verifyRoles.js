const User = require("../models/User");

const verifyRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        const userId = req.user?.id || req.user;

        if (!userId) {
            res.status(401);
            throw new Error("Unauthorized - Missing user identity");
        }

        // الاستعلام المباشر من الداتابيز لضمان أحدث صلاحية للمستخدم
        const currentUser = await User.findById(userId).select("role").lean().exec();

        if (!currentUser || !allowedRoles.includes(currentUser.role)) {
            res.status(403);
            throw new Error("Forbidden - Insufficient privileges");
        }

        req.role = currentUser.role;
        next();
    };
};

module.exports = verifyRoles;
const verifyOwnershipOrAdmin = (getTargetUserIdFn) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: "fail", message: "Unauthorized" });
        }

        const targetUserId = getTargetUserIdFn(req);
        const currentUserId = req.user.id.toString();
        const currentUserRole = req.user.role;

        const isOwner = currentUserId === targetUserId?.toString();
        const isAdmin = currentUserRole === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                status: "fail",
                message: "Access Denied: You can only manage your own profile"
            });
        }

        next();
    };
};

module.exports = { verifyOwnershipOrAdmin };
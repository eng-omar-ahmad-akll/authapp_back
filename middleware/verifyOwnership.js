const verifyOwnershipOrAdmin = (getTargetUserIdFn) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: "fail", message: "Unauthorized" });
        }

        const rawTargetId = getTargetUserIdFn(req);
        // التقط المعرف سواء كان ObjectId مجرد أو Object مأهول بـ populate
        const targetUserId = rawTargetId?._id ? rawTargetId._id.toString() : rawTargetId?.toString();
        
        const currentUserId = req.user.id?.toString() || req.user._id?.toString() || req.user.toString();
        const currentUserRole = req.user.role;

        const isOwner = currentUserId === targetUserId;
        const isAdmin = currentUserRole === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                status: "fail",
                message: "Access Denied: You can only manage your own profile or resources"
            });
        }

        next();
    };
};

module.exports = { verifyOwnershipOrAdmin };
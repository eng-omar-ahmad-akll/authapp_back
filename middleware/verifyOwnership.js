const verifyOwnershipOrAdmin = (getResourceUserId) => {
    return (req, res, next) => {
        const currentUserId = (req.user?.id || req.user)?._id?.toString() || (req.user?.id || req.user)?.toString();
        const resourceUserId = getResourceUserId(req)?.toString();

        // قراءة الـ role سواء تم تعيينه من verifyRoles أو قادم مباشرة من verifyJWT
        const userRole = (req.role || req.user?.role || "").toString().toLowerCase();
        const userRoles = Array.isArray(req.user?.roles) 
            ? req.user.roles.map(r => String(r).toLowerCase()) 
            : [];

        const isOwner = Boolean(currentUserId && resourceUserId && currentUserId === resourceUserId);
        const isAdmin = userRole === "admin" || userRoles.includes("admin");

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                status: "fail",
                message: "Forbidden - You do not own this resource"
            });
        }

        next();
    };
};

module.exports = { verifyOwnershipOrAdmin };
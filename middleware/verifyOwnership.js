const verifyOwnershipOrAdmin = (getResourceUserId) => {
    return (req, res, next) => {
        const currentUserId = (req.user?.id || req.user)?.toString();
        const resourceUserId = getResourceUserId(req)?.toString();

        const isOwner = currentUserId === resourceUserId;
        const isAdmin = req.role === "admin";

        if (!isOwner && !isAdmin) {
            res.status(403);
            throw new Error("Forbidden - You do not own this resource");
        }

        next();
    };
};

module.exports = { verifyOwnershipOrAdmin };
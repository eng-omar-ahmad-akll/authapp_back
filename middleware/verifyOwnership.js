/**
 * @file Resource Ownership / Admin Access Middleware
 * @description Higher-Order Function dynamically resolving target resource ownership against the requesting user context.
 * 
 * @author 3akl
 */

/**
 * Generates an authorization middleware matching the requester with a resource owner ID
 * @param {Function} getTargetUserIdFn - Callback resolving target user ID from request context
 * @returns {Function} Express Middleware
 * @author 3akl
 */
const verifyOwnershipOrAdmin = (getTargetUserIdFn) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: "fail", message: "Unauthorized" });
        }

        if (typeof getTargetUserIdFn !== "function") {
            return res.status(500).json({ status: "error", message: "Internal Server Error - Invalid ownership resolver" });
        }

        const rawTargetId = getTargetUserIdFn(req);
        
        if (!rawTargetId) {
            return res.status(400).json({ status: "fail", message: "Bad Request - Unable to identify target resource owner" });
        }

        const targetUserId = rawTargetId?._id ? rawTargetId._id.toString() : rawTargetId?.toString();
        const currentUserId = req.user.id?.toString() || req.user._id?.toString() || req.user.toString();
        const currentUserRole = req.user.role;

        const isOwner = Boolean(currentUserId && targetUserId && currentUserId === targetUserId);
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
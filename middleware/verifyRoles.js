const verifyRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ status: "fail", message: "Unauthorized - User role not identified" });
        }

        const userRole = req.user.role.toLowerCase();
        const rolesArray = allowedRoles.map((role) => role.toLowerCase());

        const hasPermission = rolesArray.includes(userRole);

        if (!hasPermission) {
            return res.status(403).json({ 
                status: "fail", 
                message: "Access Denied: You do not have the required permissions for this action" 
            });
        }

        next();
    };
};

module.exports = verifyRoles;
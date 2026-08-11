const jwt = require("jsonwebtoken");

const verifyJwt = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            status: "fail",
            message: "Unauthorized - Access Token Missing or Invalid"
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            status: "fail",
            message: "Unauthorized - Malformed Token Header"
        });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                status: "fail",
                message: err.name === "TokenExpiredError" 
                    ? "Unauthorized - Token Expired" 
                    : "Unauthorized - Invalid Token"
            });
        }

        const userInfo = decoded?.UserInfo || decoded;
        const userId = userInfo?.id || userInfo?._id;

        if (!userId) {
            return res.status(401).json({
                status: "fail",
                message: "Unauthorized - Invalid Token Payload Structure"
            });
        }

        // توحيد قراءة الـ role سواء كانت String أو Array لحل مشكلة الـ RBAC
        const rawRole = userInfo.role || userInfo.roles || "user";
        const normalizedRole = Array.isArray(rawRole) 
            ? rawRole.map(r => String(r).toLowerCase()) 
            : String(rawRole).toLowerCase();

        req.user = {
            id: userId,
            role: normalizedRole,   // للـ Controllers اللي بتطلب req.user.role
            roles: Array.isArray(normalizedRole) ? normalizedRole : [normalizedRole] // للميدلوير المعتمد على الأراي
        };

        next();
    });
};

module.exports = verifyJwt;
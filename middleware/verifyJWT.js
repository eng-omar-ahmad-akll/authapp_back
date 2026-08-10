const jwt = require("jsonwebtoken");

const verifyjwt = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    // 1. التحقق من وجود الهيدر وصحة التنسيق
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
            status: "fail",
            message: "Unauthorized - Access Token Missing or Invalid"
        });
    }

    const token = authHeader.split(" ")[1];

    // 2. التحقق من صحة وصلاحية التوكين
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                status: "fail",
                message: "Forbidden - Invalid or Expired Token"
            });
        }

        // 3. تعيين كائن المستخدم الموحد القابل للقراءة في الـ Controllers
        req.user = {
            id: decoded.UserInfo.id,
            roles: decoded.UserInfo.roles || []
        };

        next();
    });
};

module.exports = verifyjwt;
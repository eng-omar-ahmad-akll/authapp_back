const jwt = require("jsonwebtoken");

const verifyJwt = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    // 1. التحقق من وجود الهيدر وصحة التنسيق
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

    // 2. التحقق من صحة وصلاحية التوكين
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            // إرجاع 401 في حالة انتهاء الصلاحية أو عدم صحة التوكين لتمكين الـ Client من الـ Refresh
            return res.status(401).json({
                status: "fail",
                message: err.name === "TokenExpiredError" 
                    ? "Unauthorized - Token Expired" 
                    : "Unauthorized - Invalid Token"
            });
        }

        // 3. التحقق الأمني من وجود structure الـ Payload لتجنب App Crashes
        const userInfo = decoded?.UserInfo || decoded;
        const userId = userInfo?.id || userInfo?._id;

        if (!userId) {
            return res.status(401).json({
                status: "fail",
                message: "Unauthorized - Invalid Token Payload Structure"
            });
        }

        // 4. تعيين كائن المستخدم الموحد القابل للقراءة في الـ Controllers
        req.user = {
            id: userId,
            roles: userInfo.roles || []
        };

        next();
    });
};

module.exports = verifyJwt;
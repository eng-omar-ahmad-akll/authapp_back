const jwt = require("jsonwebtoken");

const verifyjwt = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized - Missing or Invalid Header" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Forbidden - Invalid Token" });
        }
        
        req.user = decoded.UserInfo.id;
        // لو الـ roles مش مستخدمة في الـ payload تأكد إنها مش بترمى undefined
        req.roles = decoded.UserInfo.roles; 
        next();
    });
};

module.exports = verifyjwt;
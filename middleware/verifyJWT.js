const User = require("../models/User"); 
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const verifyjwt = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.sendStatus(401).json({ message: "Unauthorized" }); // Unauthorized
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.sendStatus(403).json({ message: "Forbidden" }); // Forbidden
        req.user = decoded.UserInfo.id;
        req.roles = decoded.UserInfo.roles;
        next();
    });
};

module.exports = verifyjwt;
const User = require("../models/User"); 
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const getallusers = async (req, res) => { 
        const users = await User.find().select("-password").lean();
        if (!users.length) {
            return res.status(409).json({ message: "no user found " });
        }
        res.json(users);
    };
module.exports = {
    getallusers,
};
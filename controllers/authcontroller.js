const User = require("../models/User"); 
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req, res) => { // أضيفت async هنا
    try {
        const { first_name, last_name, email, password } = req.body;
        
        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const foundUser = await User.findOne({ email }).exec();
        if (foundUser) {
            return res.status(409).json({ message: "User with this email already exists" });
        }

        // تم تغيير 16 إلى 10 تحسيناً للأداء
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            first_name,
            last_name,
            email,
            password: hashedPassword,
        });

        const accessToken = jwt.sign(
            {
                UserInfo: {
                    id: user._id,
                }
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "5m" }
        );

        const refreshToken = jwt.sign(
            {
                UserInfo: {
                    id: user._id,
                }
            },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("jwt", refreshToken, {
            httpOnly: true, // web
            secure: true,   // https
            sameSite: "None", // cross-site
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            accessToken, 
            email: user.email, 
            first_name: user.first_name, 
            last_name: user.last_name,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const login = async (req, res) => {
    try {
        const {email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: "email and password are required" });
        }

        const foundUser = await User.findOne({ email }).exec();
        if (!foundUser) {
            return res.status(409).json({ message: "User  does not exist" });
        }

        const match = await bcrypt.compare(password, foundUser.password);
        if (!match) {
            return res.status(409).json({ message: "wrong password" });
        }

        const accessToken = jwt.sign(
            {
                UserInfo: {
                    id: foundUser._id,
                }
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "5m" }
        );

        const refreshToken = jwt.sign(
            {
                UserInfo: {
                    id: foundUser._id,
                }
            },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("jwt", refreshToken, {
            httpOnly: true, // web
            secure: true,   // https
            sameSite: "None", // cross-site
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            accessToken, 
            email: foundUser.email, 
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

const refresh = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const refreshToken = cookies.jwt;
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const foundUser = await User.findById(decoded.UserInfo.id).exec();
        if (!foundUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const accessToken = jwt.sign(
            {
                UserInfo: {
                    id: foundUser._id,
                }
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "5m" }
        );
        res.json({ accessToken });
    });
};
const logout = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
        return res.status(204).json({ message: "no content" });
    }
        res.clearCookie("jwt",  {
            httpOnly: true, // web
            secure: true,   // https
            sameSite: "None", // cross-site
        });
        res.json({ message: "cookie cleared" });
    };

module.exports = {
    register,
    login,
    refresh,
    logout,
};
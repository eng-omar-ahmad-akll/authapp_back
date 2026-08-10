const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { asyncHandler } = require("../middleware/errorHandler");

// 1. Register User
const register = asyncHandler(async (req, res) => {
    const { first_name, last_name, email, password } = req.body;

    const foundUser = await User.findOne({ email }).exec();
    if (foundUser) {
        res.status(409);
        throw new Error("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        first_name,
        last_name,
        email,
        password: hashedPassword,
    });

    const accessToken = jwt.sign(
        { UserInfo: { id: user._id } },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
        { UserInfo: { id: user._id } },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie("jwt", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
        accessToken,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
    });
});

// 2. Login User
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const foundUser = await User.findOne({ email }).exec();
    if (!foundUser) {
        res.status(401);
        throw new Error("Invalid email or password");
    }

    const match = await bcrypt.compare(password, foundUser.password);
    if (!match) {
        res.status(401);
        throw new Error("Invalid email or password");
    }

    const accessToken = jwt.sign(
        { UserInfo: { id: foundUser._id } },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
        { UserInfo: { id: foundUser._id } },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie("jwt", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
        accessToken,
        email: foundUser.email,
    });
});

// 3. Refresh Access Token
const refresh = asyncHandler(async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
        res.status(401);
        throw new Error("Unauthorized - Missing Refresh Token");
    }

    const refreshToken = cookies.jwt;

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, asyncHandler(async (err, decoded) => {
        if (err) {
            res.status(403);
            throw new Error("Forbidden - Invalid Refresh Token");
        }

        const foundUser = await User.findById(decoded.UserInfo.id).exec();
        if (!foundUser) {
            res.status(401);
            throw new Error("Unauthorized - User Not Found");
        }

        const accessToken = jwt.sign(
            { UserInfo: { id: foundUser._id } },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
        );

        return res.json({ accessToken });
    }));
});

// 4. Logout User
const logout = asyncHandler(async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
        return res.sendStatus(204);
    }

    res.clearCookie("jwt", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
    });

    return res.status(200).json({ message: "Cookie cleared successfully" });
});

module.exports = {
    register,
    login,
    refresh,
    logout,
};
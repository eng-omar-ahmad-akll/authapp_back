const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const User = require("../models/User");
const OTP = require("../models/OTP");
const sendEmail = require("../config/sendEmail");
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
    console.log("RECEIVED BODY AT LOGIN:", req.body);

    const { email, password } = req.body;
    
    // استخراج دقيق ومرن لحقل كود الـ 2FA بغض النظر عن اسمه في الـ Payload
    const rawCode = req.body?.twoFactorCode || req.body?.code || req.body?.token || req.body?.totpCode;

    if (!email || !password) {
        res.status(400);
        throw new Error("Email and password are required");
    }

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

    // التحقق من 2FA
    if (foundUser.isTwoFactorEnabled) {
        if (rawCode === undefined || rawCode === null || String(rawCode).trim() === "") {
            return res.status(403).json({
                message: "2FA code required",
                require2FA: true
            });
        }

        const cleanToken = String(rawCode).replace(/\s+/g, "").trim();

        const verified = speakeasy.totp.verify({
            secret: foundUser.twoFactorSecret,
            encoding: "base32",
            token: cleanToken,
            window: 2
        });

        if (!verified) {
            res.status(400);
            throw new Error("Invalid 2FA code");
        }
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

// 3. Refresh Access Token (معدل بدون nested async callback)
const refresh = asyncHandler(async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
        res.status(401);
        throw new Error("Unauthorized - Missing Refresh Token");
    }

    const refreshToken = cookies.jwt;

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
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

// 5. Forgot Password
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        res.status(400);
        throw new Error("Email is required");
    }

    const user = await User.findOne({ email }).exec();
    if (!user) {
        res.status(404);
        throw new Error("User with this email does not exist");
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    await OTP.deleteMany({ email });
    await OTP.create({ email, otp: hashedOtp });

    await sendEmail({
        email: user.email,
        subject: "Password Reset OTP Code",
        message: `Your password reset code is: ${otpCode}. It is valid for 10 minutes.`
    });

    return res.status(200).json({
        message: "OTP code sent to your email successfully"
    });
});

// 6. Reset Password
const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        res.status(400);
        throw new Error("Email, OTP, and new password are required");
    }

    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord) {
        res.status(400);
        throw new Error("Invalid or expired OTP code");
    }

    const isValidOtp = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValidOtp) {
        res.status(400);
        throw new Error("Invalid OTP code");
    }

    const user = await User.findOne({ email });
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await OTP.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({
        message: "Password reset successfully"
    });
});

// 7. Setup 2FA
const setup2FA = asyncHandler(async (req, res) => {
    const userId = req.user.id || req.user;

    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    const secret = speakeasy.generateSecret({
        name: `App (${user.email})`
    });

    user.twoFactorSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.status(200).json({
        message: "Scan QR code or use secret key",
        secret: secret.base32,
        qrCode: qrCodeUrl
    });
});

// 8. Verify & Enable 2FA
const verify2FA = asyncHandler(async (req, res) => {
    const rawToken = req.body?.token || req.body?.twoFactorCode || req.body?.code;
    const userId = req.user.id || req.user;

    if (!rawToken) {
        res.status(400);
        throw new Error("2FA Token is required");
    }

    const user = await User.findById(userId);
    if (!user || !user.twoFactorSecret) {
        res.status(400);
        throw new Error("Please setup 2FA first");
    }

    const cleanToken = String(rawToken).replace(/\s+/g, "").trim();

    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: cleanToken,
        window: 2
    });

    if (!verified) {
        res.status(400);
        throw new Error("Invalid 2FA token");
    }

    user.isTwoFactorEnabled = true;
    await user.save();

    return res.status(200).json({
        message: "Two-Factor Authentication enabled successfully"
    });
});

module.exports = {
    register,
    login,
    refresh,
    logout,
    forgotPassword,
    resetPassword,
    setup2FA,
    verify2FA
};
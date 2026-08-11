const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const crypto = require("crypto");

const User = require("../models/User");
const OTP = require("../models/OTP");
const sendEmail = require("../config/sendEmail");
const { asyncHandler } = require("../middleware/errorHandler");

// 1. Register User
const register = asyncHandler(async (req, res) => {
    const { first_name, last_name, email, password } = req.body;
    if (!email || !password) {
        res.status(400);
        throw new Error("Email and password are required");
    }

    const cleanEmail = email.toLowerCase().trim();

    const foundUser = await User.findOne({ email: cleanEmail }).exec();
    if (foundUser) {
        res.status(409);
        throw new Error("User with this email already exists");
    }

    const user = await User.create({
        first_name,
        last_name,
        email: cleanEmail,
        password,
        role: "user"
    });

    const normalizedRole = user.role.toLowerCase();

    const accessToken = jwt.sign(
        { UserInfo: { id: user._id, role: normalizedRole } },
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
        status: "success",
        accessToken,
        user: {
            id: user._id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: normalizedRole
        }
    });
});

// 2. Login User (تمت إضافة تسجيل lastLoginAt)
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const rawCode = req.body?.twoFactorCode || req.body?.code || req.body?.token || req.body?.totpCode;

    if (!email || !password) {
        res.status(400);
        throw new Error("Email and password are required");
    }

    const cleanEmail = email.toLowerCase().trim();

    const foundUser = await User.findOne({ email: cleanEmail })
        .select("+password +twoFactorSecret")
        .exec();

    if (!foundUser || !foundUser.password) {
        res.status(401);
        throw new Error("Invalid email or password");
    }

    const match = await foundUser.matchPassword(password);
    if (!match) {
        res.status(401);
        throw new Error("Invalid email or password");
    }

    if (foundUser.isTwoFactorEnabled) {
        if (rawCode === undefined || rawCode === null || String(rawCode).trim() === "") {
            return res.status(401).json({
                status: "fail",
                message: "2FA code is required",
                require2FA: true
            });
        }

        const cleanToken = String(rawCode).replace(/\s+/g, "").trim();

        const verified = speakeasy.totp.verify({
            secret: foundUser.twoFactorSecret,
            encoding: "base32",
            token: cleanToken,
            window: 1
        });

        if (!verified) {
            res.status(401);
            throw new Error("Invalid 2FA code");
        }
    }

    // تسجيل وتحديث تاريخ آخر دخول
    foundUser.lastLoginAt = new Date();
    await foundUser.save();

    const normalizedRole = (foundUser.role || "user").toLowerCase();

    const accessToken = jwt.sign(
        { UserInfo: { id: foundUser._id, role: normalizedRole } },
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
        status: "success",
        accessToken,
        user: {
            id: foundUser._id,
            email: foundUser.email,
            first_name: foundUser.first_name,
            last_name: foundUser.last_name,
            role: normalizedRole,
            lastLoginAt: foundUser.lastLoginAt
        }
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

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
        res.status(403);
        throw new Error("Forbidden - Invalid Refresh Token");
    }

    const foundUser = await User.findById(decoded.UserInfo.id).select("+passwordChangedAt").exec();
    if (!foundUser) {
        res.status(401);
        throw new Error("Unauthorized - User Not Found");
    }

    if (foundUser.changedPasswordAfter && foundUser.changedPasswordAfter(decoded.iat)) {
        res.clearCookie("jwt", { httpOnly: true, secure: true, sameSite: "None" });
        res.status(401);
        throw new Error("Unauthorized - Password recently changed. Please log in again.");
    }

    const normalizedRole = (foundUser.role || "user").toLowerCase();

    const newAccessToken = jwt.sign(
        { UserInfo: { id: foundUser._id, role: normalizedRole } },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    );

    const newRefreshToken = jwt.sign(
        { UserInfo: { id: foundUser._id } },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie("jwt", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({ 
        status: "success",
        accessToken: newAccessToken,
        role: normalizedRole 
    });
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

    return res.status(200).json({ status: "success", message: "Cookie cleared successfully" });
});

// 5. Forgot Password
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        res.status(400);
        throw new Error("Email is required");
    }

    const cleanEmail = email.toLowerCase().trim();
    const genericResponse = {
        status: "success",
        message: "If that email is registered, an OTP code has been sent to your email."
    };

    const user = await User.findOne({ email: cleanEmail }).exec();
    if (!user) {
        return res.status(200).json(genericResponse);
    }

    const otpCode = crypto.randomInt(100000, 1000000).toString();

    await OTP.deleteMany({ email: cleanEmail });
    await OTP.create({ email: cleanEmail, otp: otpCode });

    await sendEmail({
        email: user.email,
        subject: "Password Reset OTP Code",
        message: `Your password reset code is: ${otpCode}. It is valid for 10 minutes.`
    });

    return res.status(200).json(genericResponse);
});

// 6. Reset Password (تمت إضافة تسجيل lastOtpUsedAt)
const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        res.status(400);
        throw new Error("Email, OTP, and new password are required");
    }

    const cleanEmail = email.toLowerCase().trim();
    
    const otpRecord = await OTP.findOneAndUpdate(
        { email: cleanEmail, attempts: { $lt: 5 } },
        { $inc: { attempts: 1 } },
        { new: true }
    );

    if (!otpRecord) {
        res.status(400);
        throw new Error("Invalid/expired OTP code, or max attempts exceeded. Please request a new code.");
    }

    const isValidOtp = await otpRecord.compareOTP(String(otp));
    if (!isValidOtp) {
        if (otpRecord.attempts >= 5) {
            await OTP.deleteOne({ _id: otpRecord._id });
            res.status(429);
            throw new Error("Maximum attempts exceeded. OTP revoked. Please request a new code.");
        }
        res.status(400);
        throw new Error("Invalid OTP code");
    }

    // تسكيل وقت الاستخدام قبل الحذف
    otpRecord.lastOtpUsedAt = new Date();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    user.password = newPassword;
    await user.save();

    await OTP.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({
        status: "success",
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

    user.tempTwoFactorSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.status(200).json({
        status: "success",
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

    const user = await User.findById(userId).select("+twoFactorSecret +tempTwoFactorSecret");
    if (!user || (!user.twoFactorSecret && !user.tempTwoFactorSecret)) {
        res.status(400);
        throw new Error("Please setup 2FA first");
    }

    const activeSecret = user.tempTwoFactorSecret || user.twoFactorSecret;
    const cleanToken = String(rawToken).replace(/\s+/g, "").trim();

    const verified = speakeasy.totp.verify({
        secret: activeSecret,
        encoding: "base32",
        token: cleanToken,
        window: 1
    });

    if (!verified) {
        res.status(400);
        throw new Error("Invalid 2FA token");
    }

    user.twoFactorSecret = activeSecret;
    user.tempTwoFactorSecret = undefined;
    user.isTwoFactorEnabled = true;
    await user.save();

    return res.status(200).json({
        status: "success",
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
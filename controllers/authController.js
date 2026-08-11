// authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const crypto = require("crypto");

const User = require("../models/User");
const OTP = require("../models/OTP");
const sendEmail = require("../config/sendEmail");
const { asyncHandler } = require("../middleware/errorHandler");
const { addTokenToBlacklist } = require("../utils/tokenBlacklist");

// خيارات الكوكي الموحدة في كل عمليات الإنشاء والمسح لضمان المطابقة الكاملة
const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/"
};

// 1. Register User
const register = asyncHandler(async (req, res) => {
    const { first_name, last_name, email, password } = req.body;
    if (!email || !password) {
        res.status(400);
        throw new Error("Email and password are required");
    }

    const cleanEmail = email.toLowerCase().trim();

    try {
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

        user.refreshTokens = [refreshToken];
        await user.save();

        res.cookie("jwt", refreshToken, {
            ...cookieOptions,
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
    } catch (error) {
        if (error.code === 11000) {
            res.status(409);
            throw new Error("User with this email already exists");
        }
        throw error;
    }
});

// 2. Login User
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const cookies = req.cookies;
    const rawCode = req.body?.twoFactorCode || req.body?.code || req.body?.token || req.body?.totpCode;

    if (!email || !password) {
        res.status(400);
        throw new Error("Email and password are required");
    }

    const cleanEmail = email.toLowerCase().trim();

    const foundUser = await User.findOne({ email: cleanEmail })
        .select("+password +twoFactorSecret +refreshTokens +loginAttempts +lockUntil +isActive")
        .exec();

    if (!foundUser || !foundUser.password) {
        res.status(401);
        throw new Error("Invalid email or password");
    }

    if (foundUser.isActive === false) {
        res.status(401);
        throw new Error("Account deactivated or banned");
    }

    if (foundUser.isLocked) {
        res.status(423);
        throw new Error("Account locked due to too many failed login attempts. Try again later.");
    }

    const match = await foundUser.matchPassword(password);
    if (!match) {
        await foundUser.incLoginAttempts();
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
            await foundUser.incLoginAttempts();
            res.status(401);
            throw new Error("Invalid 2FA code");
        }
    }

    const normalizedRole = (foundUser.role || "user").toLowerCase();

    const accessToken = jwt.sign(
        { UserInfo: { id: foundUser._id, role: normalizedRole } },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    );

    const newRefreshToken = jwt.sign(
        { UserInfo: { id: foundUser._id } },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );

    let newRefreshTokenArray = !cookies?.jwt
        ? foundUser.refreshTokens
        : foundUser.refreshTokens.filter(rt => rt !== cookies.jwt);

    if (cookies?.jwt) {
        const foundToken = await User.findOne({ refreshTokens: cookies.jwt }).exec();
        if (!foundToken) {
            newRefreshTokenArray = [];
        }
        res.clearCookie("jwt", cookieOptions);
    }

    foundUser.refreshTokens = [...newRefreshTokenArray, newRefreshToken];
    foundUser.lastLoginAt = new Date();
    foundUser.loginAttempts = 0;
    foundUser.lockUntil = undefined;
    await foundUser.save();

    res.cookie("jwt", newRefreshToken, {
        ...cookieOptions,
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

// 3. Refresh Access Token (تعديل: استخدام خيارات الكوكي الموحدة)
const refresh = asyncHandler(async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
        res.status(401);
        throw new Error("Unauthorized - Missing Refresh Token");
    }

    const refreshToken = cookies.jwt;

    const foundUser = await User.findOne({ refreshTokens: refreshToken })
        .select("+refreshTokens +passwordChangedAt +isActive")
        .exec();

    if (!foundUser) {
        res.clearCookie("jwt", cookieOptions);
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
            if (err) return;
            const hackedUser = await User.findById(decoded.UserInfo?.id).select("+refreshTokens").exec();
            if (hackedUser) {
                hackedUser.refreshTokens = [];
                await hackedUser.save();
            }
        });
        res.status(403);
        throw new Error("Forbidden - Compromised Refresh Token Attempt Detected");
    }

    res.clearCookie("jwt", cookieOptions);

    const newRefreshTokenArray = foundUser.refreshTokens.filter(rt => rt !== refreshToken);

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
        foundUser.refreshTokens = [...newRefreshTokenArray];
        await foundUser.save();
        res.status(403);
        throw new Error("Forbidden - Expired or Invalid Refresh Token");
    }

    if (foundUser.isActive === false) {
        res.status(401);
        throw new Error("Account deactivated or banned");
    }

    if (foundUser.changedPasswordAfter && foundUser.changedPasswordAfter(decoded.iat)) {
        foundUser.refreshTokens = [];
        await foundUser.save();
        res.status(401);
        throw new Error("Unauthorized - Password recently changed. Please log in again.");
    }

    const normalizedRole = (foundUser.role || "user").toLowerCase();

    const accessToken = jwt.sign(
        { UserInfo: { id: foundUser._id, role: normalizedRole } },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    );

    const newRefreshToken = jwt.sign(
        { UserInfo: { id: foundUser._id } },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );

    foundUser.refreshTokens = [...newRefreshTokenArray, newRefreshToken];
    await foundUser.save();

    res.cookie("jwt", newRefreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
        status: "success",
        accessToken,
        role: normalizedRole
    });
});

// 4. Logout User
const logout = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (authHeader?.startsWith("Bearer ")) {
        const accessToken = authHeader.split(" ")[1];
        if (accessToken) {
            await addTokenToBlacklist(accessToken, 15 * 60 * 1000);
        }
    }

    const cookies = req.cookies;
    if (!cookies?.jwt) {
        return res.sendStatus(204);
    }

    const refreshToken = cookies.jwt;

    const foundUser = await User.findOne({ refreshTokens: refreshToken }).select("+refreshTokens").exec();
    if (foundUser) {
        foundUser.refreshTokens = foundUser.refreshTokens.filter(rt => rt !== refreshToken);
        await foundUser.save();
    }

    res.clearCookie("jwt", cookieOptions);

    return res.status(200).json({ status: "success", message: "Successfully logged out and token invalidated" });
});

// 5. Forgot Password (تعديل: حذف الـ OTP القديم أولاً ثم إنشاء مستند جديد بنقاء TTL)
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

    // مسح المستندات السابقة وتأكيد السجل لضمان ربط نظيف مع الـ TTL Index
    await OTP.deleteOne({ email: cleanEmail });
    await OTP.create({
        email: cleanEmail,
        otp: otpCode,
        attempts: 0,
        lastOtpUsedAt: null,
        createdAt: new Date()
    });

    await sendEmail({
        email: user.email,
        subject: "Password Reset OTP Code",
        message: `Your password reset code is: ${otpCode}. It is valid for 10 minutes.`
    });

    return res.status(200).json(genericResponse);
});

// 6. Reset Password
const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        res.status(400);
        throw new Error("Email, OTP, and new password are required");
    }

    const cleanEmail = email.toLowerCase().trim();

    const otpRecord = await OTP.findOne({ email: cleanEmail, lastOtpUsedAt: null });

    if (!otpRecord) {
        res.status(400);
        throw new Error("Invalid/expired OTP code, or code has already been used.");
    }

    if (otpRecord.attempts >= 5) {
        await OTP.deleteOne({ _id: otpRecord._id });
        res.status(429);
        throw new Error("Maximum attempts exceeded. OTP revoked. Please request a new code.");
    }

    const isValidOtp = await otpRecord.compareOTP(String(otp));
    if (!isValidOtp) {
        const updatedRecord = await OTP.findOneAndUpdate(
            { _id: otpRecord._id, attempts: { $lt: 5 } },
            { $inc: { attempts: 1 } },
            { new: true }
        );

        if (!updatedRecord || updatedRecord.attempts >= 5) {
            await OTP.deleteOne({ _id: otpRecord._id });
            res.status(429);
            throw new Error("Maximum attempts exceeded. OTP revoked. Please request a new code.");
        }
        res.status(400);
        throw new Error("Invalid OTP code");
    }

    const consumedOtp = await OTP.findOneAndUpdate(
        { _id: otpRecord._id, lastOtpUsedAt: null },
        { $set: { lastOtpUsedAt: new Date() } }
    );

    if (!consumedOtp) {
        res.status(400);
        throw new Error("OTP code has already been used or processed in a concurrent request.");
    }

    const user = await User.findOne({ email: cleanEmail }).select("+refreshTokens");
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    user.password = newPassword;
    user.refreshTokens = [];
    
    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.tempTwoFactorSecret = undefined;

    await user.save();

    await OTP.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({
        status: "success",
        message: "Password reset successfully. 2FA has been disabled for safety. Please log in with your new password."
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
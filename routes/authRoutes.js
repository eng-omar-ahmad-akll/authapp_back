const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const verifyJWT = require("../middleware/verifyJWT");
const { 
    validateRegister, 
    validateLogin, 
    validateForgotPassword, 
    validateResetPassword 
} = require("../middleware/authValidation");

// استيراد الـ Rate Limiters التخصصية لحماية مسارات Auth
const { 
    authLimiter, 
    loginLimiter, 
    otpLimiter 
} = require("../middleware/rateLimiters");

// 1. تسجيل الحساب وتسجيل الدخول (محمية من الـ Brute-Force)
router.route("/register")
    .post(authLimiter, validateRegister, authController.register);

router.route("/login")
    .post(loginLimiter, validateLogin, authController.login);

// 2. تحديث وإلغاء الـ Tokens (استخدام POST للـ Refresh بدلاً من GET)
router.route("/refresh")
    .post(authController.refresh);

router.route("/logout")
    .post(authController.logout);

// 3. مسارات استعادة كلمة السر (محمية من الـ Mail Spamming والـ Brute-Force)
router.route("/forgot-password")
    .post(otpLimiter, validateForgotPassword, authController.forgotPassword);

router.route("/reset-password")
    .post(otpLimiter, validateResetPassword, authController.resetPassword);

// 4. مسارات 2FA (تتطلب Token موثوق + حماية من تخمين أرقام الـ TOTP الـ 6)
router.use(verifyJWT); // تطبيق الـ JWT Middleware على جميع المسارات التالية تلقائياً

router.route("/2fa/setup")
    .post(authController.setup2FA);

router.route("/2fa/verify")
    .post(otpLimiter, authController.verify2FA);

module.exports = router;
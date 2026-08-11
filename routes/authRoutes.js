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

const { 
    authLimiter, 
    loginLimiter, 
    otpLimiter,
    apiLimiter 
} = require("../middleware/rateLimiters");

// 1. التسجيل والدخول (عام)
router.route("/register")
    .post(authLimiter, validateRegister, authController.register);

router.route("/login")
    .post(loginLimiter, validateLogin, authController.login);

// 2. Refresh & Logout
router.route("/refresh")
    .post(apiLimiter, authController.refresh);

router.route("/logout")
    .post(authController.logout);

// 3. Password Reset (محدد بـ otpLimiter)
router.route("/forgot-password")
    .post(otpLimiter, validateForgotPassword, authController.forgotPassword);

router.route("/reset-password")
    .post(otpLimiter, validateResetPassword, authController.resetPassword);

// 4. 2FA Routes (محمية بـ verifyJWT)
router.use(verifyJWT);

router.route("/2fa/setup")
    .post(authController.setup2FA);

router.route("/2fa/verify")
    .post(otpLimiter, authController.verify2FA);

module.exports = router;
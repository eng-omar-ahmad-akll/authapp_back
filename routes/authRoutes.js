/**
 * @file Express Authentication Routes
 * @description API endpoints routing for registration, login, token refresh, password resets, and 2FA.
 * 
 * @author 3akl
 */

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

// Public endpoints
router.route("/register")
    .post(authLimiter, validateRegister, authController.register);

router.route("/login")
    .post(loginLimiter, validateLogin, authController.login);

router.route("/refresh")
    .post(apiLimiter, authController.refresh);

router.route("/logout")
    .post(authController.logout);

router.route("/forgot-password")
    .post(otpLimiter, validateForgotPassword, authController.forgotPassword);

router.route("/reset-password")
    .post(otpLimiter, validateResetPassword, authController.resetPassword);

// JWT Guarded 2FA endpoints
router.use(verifyJWT);

router.route("/2fa/setup")
    .post(authController.setup2FA);

router.route("/2fa/verify")
    .post(otpLimiter, authController.verify2FA);

module.exports = router;
const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { validateRegister, validateLogin } = require("../middleware/authValidation");
const verifyJWT = require("../middleware/verifyJWT");

router.route("/register").post(validateRegister, authController.register);
router.route("/login").post(validateLogin, authController.login);
router.route("/refresh").get(authController.refresh);
router.route("/logout").post(authController.logout);

// مسارات استعادة كلمة السر
router.route("/forgot-password").post(authController.forgotPassword);
router.route("/reset-password").post(authController.resetPassword);

// مسارات 2FA (تتطلب تسجيل دخول بحساب موثق)
router.route("/2fa/setup").post(verifyJWT, authController.setup2FA);
router.route("/2fa/verify").post(verifyJWT, authController.verify2FA);

module.exports = router;
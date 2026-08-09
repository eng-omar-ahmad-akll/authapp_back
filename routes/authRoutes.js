const express = require("express");
const router = express.Router();
const authcontroller = require("../controllers/authcontroller");

// استدعاء الـ Validations الجدد من فولدر middleware
const { validateRegister, validateLogin } = require("../middleware/authValidation");

// ربط الـ Validation بالـ Routes
router.route("/register").post(validateRegister, authcontroller.register);
router.route("/login").post(validateLogin, authcontroller.login);

router.route("/refresh").get(authcontroller.refresh);
router.route("/logout").post(authcontroller.logout);

module.exports = router;
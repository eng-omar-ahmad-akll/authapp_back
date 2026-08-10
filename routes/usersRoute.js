const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRoles = require("../middleware/verifyRoles");
const { verifyOwnershipOrAdmin } = require("../middleware/verifyOwnership");
const validateObjectId = require("../middleware/validateObjectId");
const { validateUpdateUser } = require("../middleware/userValidation");
const { apiLimiter } = require("../middleware/rateLimiters");

// تطبيق الـ Authentication على جميع مسارات إدارة المستخدمين
router.use(verifyJWT);

// 1. عرض جميع المستخدمين (محصور للـ Admin ومحمي بـ Rate Limiter لمنع الـ Scraping)
router.get("/", verifyRoles("admin"), apiLimiter, userController.getAllUsers);

// 2. المسارات المربوطة بمعرف مستخدم محدد
router.route("/:id")
    .all(validateObjectId("id")) // فحص صحة الـ Mongo ObjectId لجميع الأفعال تلقائياً
    .get(
        verifyOwnershipOrAdmin((req) => req.params.id), 
        userController.getUserById
    )
    .patch(
        verifyOwnershipOrAdmin((req) => req.params.id), 
        validateUpdateUser, // حماية من الـ Mass Assignment وتعديل الـ role أو الـ password
        userController.updateUser
    )
    .delete(
        verifyRoles("admin"), 
        userController.deleteUser
    );

module.exports = router;
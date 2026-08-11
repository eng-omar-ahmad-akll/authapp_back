const express = require("express");
const router = express.Router();

const { 
    getAllUsers, 
    getUserById, 
    deleteUser, 
    updateUser, 
    changeUserRole 
} = require("../controllers/userController");

const verifyJWT = require("../middleware/verifyJWT");
const verifyRoles = require("../middleware/verifyRoles");
const { verifyOwnershipOrAdmin } = require("../middleware/verifyOwnership");
const validateObjectId = require("../middleware/validateObjectId");
const { validateUpdateUser } = require("../middleware/userValidation");
const { apiLimiter } = require("../middleware/rateLimiters");

router.use(verifyJWT);

// 1. عرض جميع المستخدمين (Admin Only)
router.get("/", verifyRoles("admin"), apiLimiter, getAllUsers);

// 2. تعديل رتبة مستخدم (Admin Only)
router.patch(
    "/:id/role",
    validateObjectId("id"),
    verifyRoles("admin"),
    changeUserRole
);

// 3. مسارات المستخدم المحددة بمعرف ID
router.route("/:id")
    .all(validateObjectId("id"))
    .get(
        verifyOwnershipOrAdmin((req) => req.params.id), 
        getUserById
    )
    .patch(
        verifyOwnershipOrAdmin((req) => req.params.id), // تقديم فحص الصلاحيات والملكية أولاً
        validateUpdateUser, 
        updateUser
    )
    .delete(
        verifyRoles("admin"), 
        deleteUser
    );

module.exports = router;
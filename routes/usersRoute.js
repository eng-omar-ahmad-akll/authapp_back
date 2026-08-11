const express = require("express");
const router = express.Router();

const { getAllUsers, getUserById, deleteUser, updateUser } = require("../controllers/userController");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRoles = require("../middleware/verifyRoles");
const { verifyOwnershipOrAdmin } = require("../middleware/verifyOwnership");
const validateObjectId = require("../middleware/validateObjectId");
const { validateUpdateUser } = require("../middleware/userValidation");
const { apiLimiter } = require("../middleware/rateLimiters");

router.use(verifyJWT);

// 1. عرض جميع المستخدمين (Admin Only)
router.get("/", verifyRoles("admin"), apiLimiter, getAllUsers);

// 2. المسارات المربوطة بمعرف مستخدم
router.route("/:id")
    .all(validateObjectId("id"))
    .get(
        verifyOwnershipOrAdmin((req) => req.params.id), 
        getUserById
    )
    .patch(
        validateUpdateUser, 
        verifyOwnershipOrAdmin((req) => req.params.id), 
        updateUser
    )
    .delete(
        verifyRoles("admin"), 
        deleteUser
    );

module.exports = router;
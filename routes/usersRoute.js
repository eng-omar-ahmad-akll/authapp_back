/**
 * @file Express User Management Routes
 * @description API endpoints routing for administrative and individual user profile management.
 * 
 * @author 3akl
 */

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
const { uploadSingleImage, validateImageMagicBytes } = require("../middleware/uploadSecurity");

router.use(verifyJWT);

// Administrative Endpoints
router.get("/", verifyRoles("admin"), apiLimiter, getAllUsers);

router.patch(
    "/:id/role",
    validateObjectId("id"),
    verifyRoles("admin"),
    changeUserRole
);

// Resource Owner or Admin Specific Routes
router.route("/:id")
    .all(validateObjectId("id"))
    .get(
        verifyOwnershipOrAdmin((req) => req.params.id), 
        getUserById
    )
    .patch(
        verifyOwnershipOrAdmin((req) => req.params.id),
        uploadSingleImage,
        validateImageMagicBytes,
        validateUpdateUser, 
        updateUser
    )
    .delete(
        verifyRoles("admin"), 
        deleteUser
    );

module.exports = router;
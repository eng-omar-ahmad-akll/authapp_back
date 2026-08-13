/**
 * @file Express Blog Routes
 * @description API endpoints routing for blog CRUD operations, image verification, and permission guards.
 * 
 * @author 3akl
 */

const express = require("express");
const router = express.Router();

const blogsController = require("../controllers/blogsController");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRoles = require("../middleware/verifyRoles");
const { verifyBlogOwnership } = require("../middleware/verifyBlogOwnership");
const { validateCreateBlog, validateUpdateBlog } = require("../middleware/blogValidation");
const validateObjectId = require("../middleware/validateObjectId");
const { apiLimiter } = require("../middleware/rateLimiters");
const { uploadSingleImage, validateImageMagicBytes } = require("../middleware/uploadSecurity");

// Public endpoints
router.get("/", apiLimiter, blogsController.getAllBlogs);
router.get("/:id", apiLimiter, validateObjectId("id"), blogsController.getBlogById);

// Guard endpoints with JWT
router.use(verifyJWT);

// Post creation (Authors & Admins)
router.post(
    "/",
    verifyRoles("author", "admin"),
    uploadSingleImage,
    validateImageMagicBytes,
    validateCreateBlog,
    blogsController.createBlog
);

// Post update (Owner or Admin guarded before upload processing)
router.patch(
    "/:id",
    validateObjectId("id"),
    verifyBlogOwnership,
    uploadSingleImage,
    validateImageMagicBytes,
    validateUpdateBlog,
    blogsController.updateBlog
);

// Post deletion (Owner or Admin)
router.delete(
    "/:id",
    validateObjectId("id"),
    verifyBlogOwnership,
    blogsController.deleteBlog
);

module.exports = router;
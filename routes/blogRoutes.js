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

// 1. المسارات العامة
router.get("/", apiLimiter, blogsController.getAllBlogs);
router.get("/:id", apiLimiter, validateObjectId("id"), blogsController.getBlogById);

// 2. حماية الـ Endpoints التالية بـ JWT
router.use(verifyJWT);

// 3. إنشاء مقال جديد
router.post(
    "/",
    verifyRoles("author", "admin"),
    uploadSingleImage,
    validateImageMagicBytes,
    validateCreateBlog,
    blogsController.createBlog
);

// 4. تعديل مقال (تم تقديم verifyBlogOwnership لمنع استنزاف الموارد/Cloudinary)
router.patch(
    "/:id",
    validateObjectId("id"),
    verifyBlogOwnership,
    uploadSingleImage,
    validateImageMagicBytes,
    validateUpdateBlog,
    blogsController.updateBlog
);

// 5. حذف مقال
router.delete(
    "/:id",
    validateObjectId("id"),
    verifyBlogOwnership,
    blogsController.deleteBlog
);

module.exports = router;
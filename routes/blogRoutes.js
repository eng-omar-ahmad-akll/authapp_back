const express = require("express");
const router = express.Router();

const blogsController = require("../controllers/blogsController");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRoles = require("../middleware/verifyRoles");
const { verifyBlogOwnership } = require("../middleware/verifyBlogOwnership");
const { validateCreateBlog, validateUpdateBlog } = require("../middleware/blogValidation");
const validateObjectId = require("../middleware/validateObjectId");
const { apiLimiter } = require("../middleware/rateLimiters");

// 1. المسارات العامة (Public Routes - متاحة للجميع)
router.get("/", apiLimiter, blogsController.getAllBlogs);
router.get("/:id", apiLimiter, validateObjectId("id"), blogsController.getBlogById);

// 2. حماية كل ما يلي بالـ JWT
router.use(verifyJWT);

// 3. إنشاء مقال جديد (حصري لـ Author و Admin)
router.post(
    "/",
    verifyRoles("author", "admin"),
    validateCreateBlog,
    blogsController.createBlog
);

// 4. تعديل مقال (مسموح لـ Author صاحب المقال أو Admin)
router.patch(
    "/:id",
    validateObjectId("id"),
    validateUpdateBlog,
    verifyBlogOwnership,
    blogsController.updateBlog
);

// 5. حذف مقال (مسموح لـ Author صاحب المقال أو Admin)
router.delete(
    "/:id",
    validateObjectId("id"),
    verifyBlogOwnership,
    blogsController.deleteBlog
);

module.exports = router;
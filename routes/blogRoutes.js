const express = require("express");
const router = express.Router();

const blogsController = require("../controllers/blogsController");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRoles = require("../middleware/verifyRoles");
const { verifyBlogOwnership } = require("../middleware/verifyBlogOwnership");
const { validateCreateBlog, validateUpdateBlog } = require("../middleware/blogValidation");
const validateObjectId = require("../middleware/validateObjectId");
const { apiLimiter } = require("../middleware/rateLimiters");

// 1. المسارات العامة (Public Routes - محمية بـ Rate Limiter لمنع الـ Scraping والـ DoS)
router.get("/", apiLimiter, blogsController.getAllBlogs);
router.get("/:id", apiLimiter, validateObjectId("id"), blogsController.getBlogById);

// 2. تطبيق الـ JWT Verification على جميع المسارات التالية
router.use(verifyJWT);

// إنشاء مقال جديد
router.post("/", validateCreateBlog, blogsController.createBlog);

// تعديل مقال (فحص الـ ObjectId والـ Payload أولاً لتوفير عمليات الـ DB)
router.patch(
    "/:id",
    validateObjectId("id"),
    validateUpdateBlog,
    verifyBlogOwnership,
    blogsController.updateBlog
);

// حذف مقال (يتحقق من الملكية أو صلاحية الـ Admin)
router.delete(
    "/:id",
    validateObjectId("id"),
    verifyBlogOwnership,
    blogsController.deleteBlog
);

module.exports = router;
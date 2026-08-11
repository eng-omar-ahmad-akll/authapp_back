const express = require("express");
const router = express.Router();

const blogsController = require("../controllers/blogsController");
const verifyJWT = require("../middleware/verifyJWT");
const { verifyBlogOwnership } = require("../middleware/verifyBlogOwnership");
const { validateCreateBlog, validateUpdateBlog } = require("../middleware/blogValidation");
const validateObjectId = require("../middleware/validateObjectId");
const { apiLimiter } = require("../middleware/rateLimiters");

// 1. المسارات العامة (Public Routes)
router.get("/", apiLimiter, blogsController.getAllBlogs);
router.get("/:id", apiLimiter, validateObjectId("id"), blogsController.getBlogById);

// 2. تطبيق الـ Authentication على المسارات المحمية
router.use(verifyJWT);

// إنشاء مقال جديد
router.post("/", validateCreateBlog, blogsController.createBlog);

// تعديل مقال (فحص الـ ObjectId ثم الـ Payload ثم الملكية)
router.patch(
    "/:id",
    validateObjectId("id"),
    validateUpdateBlog,
    verifyBlogOwnership,
    blogsController.updateBlog
);

// حذف مقال (إضافة validateObjectId لحماية قاعدة البيانات من الاستعلامات الخاطئة)
router.delete(
    "/:id",
    validateObjectId("id"),
    verifyBlogOwnership,
    blogsController.deleteBlog
);

module.exports = router;
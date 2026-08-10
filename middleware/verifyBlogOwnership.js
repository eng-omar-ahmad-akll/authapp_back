const Blog = require("../models/Blog"); // افترضنا اسم الموديل Blog
const { asyncHandler } = require("../middleware/errorHandler");

const verifyBlogOwnership = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const blog = await Blog.findById(id);
    if (!blog) {
        res.status(404);
        throw new Error("Blog not found");
    }

    const currentUserId = (req.user?.id || req.user)?.toString();
    const isOwner = blog.user.toString() === currentUserId; // أو blog.author بحسب اسم الحقل عندك
    const isAdmin = req.role === "admin";

    if (!isOwner && !isAdmin) {
        res.status(403);
        throw new Error("Forbidden - You do not have permission to modify or delete this blog");
    }

    req.blog = blog; // تمرير المقال للـ Controller لتوفير DB Call إضافي
    next();
});

module.exports = { verifyBlogOwnership };
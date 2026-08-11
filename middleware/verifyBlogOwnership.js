const Blog = require("../models/Blog");
const { asyncHandler } = require("../middleware/errorHandler");

const verifyBlogOwnership = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const blog = await Blog.findById(id);
    if (!blog) {
        return res.status(404).json({
            status: "fail",
            message: "Blog not found"
        });
    }

    const currentUserId = (req.user?.id || req.user)?._id?.toString() || (req.user?.id || req.user)?.toString();
    
    // تصحيح: استخدام blog.author للربط مع Mongoose Schema
    const authorId = blog.author?._id?.toString() || blog.author?.toString();
    
    // توحيد قراءة الـ Role لسواء أتى من verifyRoles أو verifyJWT
    const userRole = (req.role || req.user?.role || "").toString().toLowerCase();
    const userRoles = Array.isArray(req.user?.roles) 
        ? req.user.roles.map(r => String(r).toLowerCase()) 
        : [];

    const isOwner = Boolean(currentUserId && authorId && currentUserId === authorId);
    const isAdmin = userRole === "admin" || userRoles.includes("admin");

    if (!isOwner && !isAdmin) {
        return res.status(403).json({
            status: "fail",
            message: "Forbidden - You do not have permission to modify or delete this blog"
        });
    }

    req.blog = blog; // توفير DB Call إضافي في الـ Controller
    next();
});

module.exports = { verifyBlogOwnership };
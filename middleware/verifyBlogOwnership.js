/**
 * @file Blog Ownership Authorization Middleware
 * @description Enforces access control by verifying whether the requester owns the target blog or holds admin permissions.
 * 
 * @author 3akl
 */

const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const { AppError, asyncHandler } = require("./errorHandler");

/**
 * Middleware: Verifies blog author ownership or admin role before routing
 * @author 3akl
 */
const verifyBlogOwnership = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const currentUserId = req.user.id.toString();
    const currentUserRole = req.user.role;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError("Invalid Blog ID format", 400));
    }

    const blog = await Blog.findById(id);

    if (!blog) {
        return next(new AppError("Blog not found", 404));
    }

    const isAuthor = blog.author.toString() === currentUserId;
    const isAdmin = currentUserRole === "admin";

    if (!isAuthor && !isAdmin) {
        return next(new AppError("Access Denied: You are not authorized to modify or delete this blog", 403));
    }

    req.blog = blog;
    next();
});

module.exports = { verifyBlogOwnership };
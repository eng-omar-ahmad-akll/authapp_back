const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const { asyncHandler } = require("./errorHandler");

const verifyBlogOwnership = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const currentUserId = req.user.id.toString();
    const currentUserRole = req.user.role;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid Blog ID format");
    }

    const blog = await Blog.findById(id);

    if (!blog) {
        res.status(404);
        throw new Error("Blog not found");
    }

    const isAuthor = blog.author.toString() === currentUserId;
    const isAdmin = currentUserRole === "admin";

    if (!isAuthor && !isAdmin) {
        res.status(403);
        throw new Error("Access Denied: You are not authorized to modify or delete this blog");
    }

    req.blog = blog;
    next();
});

module.exports = { verifyBlogOwnership };
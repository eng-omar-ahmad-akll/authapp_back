const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const { asyncHandler } = require("../middleware/errorHandler");

// استخراج الـ ID بأمان من التوكين
const getUserIdFromReq = (req) => {
    return req.user?.id || req.user?._id || req.user;
};

// 1. Get All Blogs (Public)
const getAllBlogs = asyncHandler(async (req, res) => {
    const blogs = await Blog.find()
        .populate("author", "first_name last_name email")
        .sort({ createdAt: -1 });

    return res.status(200).json({
        status: "success",
        count: blogs.length,
        data: blogs
    });
});

// 2. Get Single Blog (Public)
const getBlogById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid Blog ID format");
    }

    const blog = await Blog.findById(id).populate("author", "first_name last_name email");

    if (!blog) {
        res.status(404);
        throw new Error("Blog not found");
    }

    return res.status(200).json({
        status: "success",
        data: blog
    });
});

// 3. Create Blog (Protected)
const createBlog = asyncHandler(async (req, res) => {
    const { title, content, tags } = req.body;
    const userId = getUserIdFromReq(req);

    if (!userId) {
        res.status(401);
        throw new Error("User authentication required");
    }

    const newBlog = await Blog.create({
        title,
        content,
        tags,
        author: userId
    });

    return res.status(201).json({
        status: "success",
        data: newBlog
    });
});

// 4. Update Blog (Protected - Owner or Admin)
// تمت الاستفادة من req.blog القادم من الـ verifyBlogOwnership middleware
const updateBlog = asyncHandler(async (req, res) => {
    const blog = req.blog; // المقال مفحوص ومحضر جاهز من الميدلوير

    const { title, content, tags } = req.body;

    // تحديث الحقول المسموح بها فقط بمنع Mass Assignment لتغيير الـ author
    if (title !== undefined) blog.title = title;
    if (content !== undefined) blog.content = content;
    if (tags !== undefined) blog.tags = tags;

    const updatedBlog = await blog.save();

    return res.status(200).json({
        status: "success",
        data: updatedBlog
    });
});

// 5. Delete Blog (Protected - Owner or Admin)
// تمت الاستفادة من req.blog القادم من الـ verifyBlogOwnership middleware
const deleteBlog = asyncHandler(async (req, res) => {
    const blog = req.blog; // المقال مفحوص ومحضر جاهز من الميدلوير

    await blog.deleteOne();

    return res.status(200).json({
        status: "success",
        message: "Blog deleted successfully"
    });
});

module.exports = {
    getAllBlogs,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog
};
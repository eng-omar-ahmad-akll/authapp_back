const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const { asyncHandler } = require("../middleware/errorHandler");

// استخراج الـ ID بأمان من التوكين الممرر في Request
const getUserIdFromReq = (req) => {
    return req.user?.id || req.user?._id;
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

    // التحقق من صحة صيغة Mongoose ObjectId
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

// 4. Update Blog (Protected - Owner Only)
const updateBlog = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid Blog ID format");
    }

    const blog = await Blog.findById(id);

    if (!blog) {
        res.status(404);
        throw new Error("Blog not found");
    }

    const userId = getUserIdFromReq(req);

    // التحقق من أن المستخدم الحالي هو صاحب المقال
    if (blog.author.toString() !== userId?.toString()) {
        res.status(403);
        throw new Error("Unauthorized to update this blog");
    }

    const { title, content, tags } = req.body;

    const updatedBlog = await Blog.findByIdAndUpdate(
        id,
        { title, content, tags },
        { new: true, runValidators: true }
    );

    return res.status(200).json({
        status: "success",
        data: updatedBlog
    });
});

// 5. Delete Blog (Protected - Owner Only)
const deleteBlog = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid Blog ID format");
    }

    const blog = await Blog.findById(id);

    if (!blog) {
        res.status(404);
        throw new Error("Blog not found");
    }

    const userId = getUserIdFromReq(req);

    if (blog.author.toString() !== userId?.toString()) {
        res.status(403);
        throw new Error("Unauthorized to delete this blog");
    }

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
const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const { asyncHandler } = require("../middleware/errorHandler");

const getUserIdFromReq = (req) => {
    return req.user?.id || req.user?._id || req.user;
};

// 1. Get All Blogs (مع Pagination & Text Search)
const getAllBlogs = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    // بناء كائن البحث (Text Search أو Regex للعنوان)
    let query = {};
    if (search) {
        query = { $text: { $search: search } };
    }

    const blogs = await Blog.find(query)
        .populate("author", "first_name last_name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Blog.countDocuments(query);

    return res.status(200).json({
        status: "success",
        count: blogs.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: blogs
    });
});

// 2. Get Single Blog
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

// 3. Create Blog
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

// 4. Update Blog
const updateBlog = asyncHandler(async (req, res) => {
    const blog = req.blog;
    const { title, content, tags } = req.body;

    if (title !== undefined) blog.title = title;
    if (content !== undefined) blog.content = content;
    if (tags !== undefined) blog.tags = tags;

    const updatedBlog = await blog.save();

    return res.status(200).json({
        status: "success",
        data: updatedBlog
    });
});

// 5. Delete Blog
const deleteBlog = asyncHandler(async (req, res) => {
    const blog = req.blog;
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
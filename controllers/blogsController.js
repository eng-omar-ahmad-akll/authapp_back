const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const { asyncHandler } = require("../middleware/errorHandler");
const sanitizeHtml = require("sanitize-html");

const getUserIdFromReq = (req) => {
    return req.user?.id || req.user?._id?.toString() || req.user;
};

const sanitizeOptions = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        "img", "h1", "h2", "h3", "u", "s", "code", "pre", "blockquote", "span"
    ]),
    allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        "*": ["class", "style"],
        "a": ["href", "name", "target", "rel"],
        "img": ["src", "srcset", "alt", "title", "width", "height", "loading"]
    },
    allowedSchemes: ["http", "https", "mailto", "data"]
};

// 1. Get All Blogs (Public) - تزيد المشاهدات وتحدث تاريخ القراءة لكل المقالات المعروضة في الصفحة
const getAllBlogs = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const search = req.query.search ? String(req.query.search).trim() : "";

    let query = {};
    if (search) {
        query = { $text: { $search: search } };
    }

    const [blogs, total] = await Promise.all([
        Blog.find(query)
            .populate("author", "first_name last_name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Blog.countDocuments(query)
    ]);

    // زيادة viewsCount وتحديث lastReadAt لجميع المقالات المسترجعة دفعة واحدة (Bulk Atomic Update)
    if (blogs.length > 0) {
        const now = new Date();
        const blogIds = blogs.map((b) => b._id);

        await Blog.bulkWrite(
            blogIds.map((id) => ({
                updateOne: {
                    filter: { _id: id },
                    update: {
                        $inc: { viewsCount: 1 },
                        $set: { lastReadAt: now }
                    }
                }
            }))
        );

        // تحديث القيم في الاستجابة المعروضة لليوزر فوراً
        blogs.forEach((blog) => {
            blog.viewsCount = (blog.viewsCount || 0) + 1;
            blog.lastReadAt = now;
        });
    }

    return res.status(200).json({
        status: "success",
        count: blogs.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: blogs
    });
});

// 2. Get Single Blog By ID - تزيد المشاهدات وتحدث تاريخ القراءة لمقال معين
const getBlogById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid Blog ID format");
    }

    const blog = await Blog.findByIdAndUpdate(
        id,
        {
            $inc: { viewsCount: 1 },
            $set: { lastReadAt: new Date() }
        },
        { new: true }
    )
        .populate("author", "first_name last_name")
        .lean();

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

    if (!title || !content) {
        res.status(400);
        throw new Error("Title and content are required");
    }

    const cleanContent = sanitizeHtml(content, sanitizeOptions);

    const newBlog = await Blog.create({
        title: String(title).trim(),
        content: cleanContent,
        tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()) : [],
        author: userId,
        viewsCount: 0,
        lastReadAt: null
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

    if (title !== undefined) blog.title = String(title).trim();

    if (content !== undefined) {
        blog.content = sanitizeHtml(content, sanitizeOptions);
    }

    if (tags !== undefined) {
        blog.tags = Array.isArray(tags) ? tags.map((t) => String(t).trim()) : [];
    }

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
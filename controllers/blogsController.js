// blogsController.js
const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const { asyncHandler } = require("../middleware/errorHandler");
const sanitizeHtml = require("sanitize-html");

const getUserIdFromReq = (req) => {
    return req.user?.id || req.user?._id?.toString() || req.user;
};

// In-Memory View Throttling
const viewCache = new Map();
const VIEW_COOLDOWN_MS = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 10000;

setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of viewCache.entries()) {
        if (now - timestamp > VIEW_COOLDOWN_MS) {
            viewCache.delete(key);
        }
    }
}, 15 * 60 * 1000).unref();

const sanitizeOptions = {
    allowedTags: [
        "p", "br", "b", "i", "strong", "em", "ul", "ol", "li",
        "a", "img", "h1", "h2", "h3", "u", "s", "code", "pre", "blockquote", "span"
    ],
    allowedAttributes: {
        "a": ["href", "name", "target", "rel"],
        "img": ["src", "srcset", "alt", "title", "width", "height", "loading"],
        "code": ["class"],
        "span": ["class"]
    },
    allowedSchemes: ["http", "https", "mailto"]
};

// 1. Get All Blogs
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

    return res.status(200).json({
        status: "success",
        count: blogs.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: blogs
    });
});

// 2. Get Single Blog By ID
const getBlogById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid Blog ID format");
    }

    const blog = await Blog.findById(id)
        .populate("author", "first_name last_name")
        .lean();

    if (!blog) {
        res.status(404);
        throw new Error("Blog not found");
    }

    const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const cacheKey = `${id}_${clientIp}`;
    const now = Date.now();

    if (viewCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = viewCache.keys().next().value;
        if (oldestKey) viewCache.delete(oldestKey);
    }

    if (!viewCache.has(cacheKey) || now - viewCache.get(cacheKey) > VIEW_COOLDOWN_MS) {
        viewCache.set(cacheKey, now);
        Blog.updateOne(
            { _id: id },
            {
                $inc: { viewsCount: 1 },
                $set: { lastReadAt: new Date() }
            }
        ).catch((err) => {
            console.error(`Failed to update metrics for blog ${id}:`, err.message);
        });
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

// 4. Update Blog (تعديل: التحقق من وجود تعديل فعلي ومنع عمليات I/O المكررة)
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

    if (!blog.isModified()) {
        res.status(400);
        throw new Error("No valid fields modified for update");
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
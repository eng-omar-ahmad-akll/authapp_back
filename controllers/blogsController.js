const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinary");

// In-memory cache for view tracking (IP_BlogID -> Timestamp)
const viewCache = new Map();
const VIEW_COOLDOWN_MS = 15 * 60 * 1000; // 15 Minutes
const MAX_CACHE_SIZE = 10000; // Prevent Memory Leaks

// Cleanup memory cache every 1 hour
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of viewCache.entries()) {
        if (now - timestamp > VIEW_COOLDOWN_MS) {
            viewCache.delete(key);
        }
    }
}, 60 * 60 * 1000);

// Helper to resolve User ID safely
const getUserId = (user) => {
    if (!user) return null;
    return user.id ? user.id.toString() : user._id?.toString();
};

// 1. Get All Blogs (Public with Pagination and Filters)
const getAllBlogs = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const { category, search, author } = req.query;

    const filter = {};

    if (category) {
        filter.category = category;
    }

    if (author && mongoose.Types.ObjectId.isValid(author)) {
        filter.author = author;
    }

    if (search) {
        filter.$text = { $search: search };
    }

    const [blogs, total] = await Promise.all([
        Blog.find(filter)
            .populate("author", "first_name last_name avatar")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Blog.countDocuments(filter)
    ]);

    return res.status(200).json({
        status: "success",
        results: blogs.length,
        pagination: {
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            limit
        },
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
        .populate("author", "first_name last_name avatar")
        .lean();

    if (!blog) {
        res.status(404);
        throw new Error("Blog not found");
    }

    const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
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

// 3. Create New Blog (Protected: Admin / Publisher)
const createBlog = asyncHandler(async (req, res) => {
    const { title, content, category, tags } = req.body;

    if (!req.file) {
        res.status(400);
        throw new Error("Blog cover image is required");
    }

    // الرفع المباشر عبر الـ Memory Buffer
    const uploadResult = await uploadToCloudinary(req.file.buffer, "blogs_covers");

    let parsedTags = [];
    if (tags) {
        if (Array.isArray(tags)) {
            parsedTags = tags;
        } else if (typeof tags === "string") {
            try {
                parsedTags = JSON.parse(tags);
            } catch {
                parsedTags = tags.split(",").map((t) => t.trim());
            }
        }
    }

    const userId = getUserId(req.user);

    const newBlog = await Blog.create({
        title,
        content,
        category,
        tags: parsedTags,
        coverImage: {
            url: uploadResult.url,
            public_id: uploadResult.public_id
        },
        author: userId
    });

    return res.status(201).json({
        status: "success",
        message: "Blog created successfully",
        data: newBlog
    });
});

// 4. Update Blog (Protected: Admin or Blog Owner)
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

    const currentUserId = getUserId(req.user);
    const isOwner = blog.author.toString() === currentUserId;
    const isAdmin = req.user?.role === "admin";

    if (!isOwner && !isAdmin) {
        res.status(403);
        throw new Error("You are not authorized to update this blog");
    }

    const { title, content, category, tags } = req.body;

    if (title) blog.title = title;
    if (content) blog.content = content;
    if (category) blog.category = category;

    if (tags) {
        if (Array.isArray(tags)) {
            blog.tags = tags;
        } else if (typeof tags === "string") {
            try {
                blog.tags = JSON.parse(tags);
            } catch {
                blog.tags = tags.split(",").map((t) => t.trim());
            }
        }
    }

    if (req.file) {
        const uploadResult = await uploadToCloudinary(req.file.buffer, "blogs_covers");

        if (blog.coverImage?.public_id) {
            deleteFromCloudinary(blog.coverImage.public_id).catch((err) =>
                console.error(`Cloudinary deletion failed: ${err.message}`)
            );
        }

        blog.coverImage = {
            url: uploadResult.url,
            public_id: uploadResult.public_id
        };
    }

    const updatedBlog = await blog.save();

    return res.status(200).json({
        status: "success",
        message: "Blog updated successfully",
        data: updatedBlog
    });
});

// 5. Delete Blog (Protected: Admin or Blog Owner)
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

    const currentUserId = getUserId(req.user);
    const isOwner = blog.author.toString() === currentUserId;
    const isAdmin = req.user?.role === "admin";

    if (!isOwner && !isAdmin) {
        res.status(403);
        throw new Error("You are not authorized to delete this blog");
    }

    if (blog.coverImage?.public_id) {
        deleteFromCloudinary(blog.coverImage.public_id).catch((err) =>
            console.error(`Cloudinary deletion failed: ${err.message}`)
        );
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
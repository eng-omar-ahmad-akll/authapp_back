const Blog = require("../models/Blog");

// 1. Get All Blogs (Public)
const getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find()
            .populate("author", "first_name last_name email")
            .sort({ createdAt: -1 });
        return res.status(200).json({ status: "success", count: blogs.length, data: blogs });
    } catch (err) {
        return res.status(500).json({ status: "error", message: "Server error fetching blogs" });
    }
};

// 2. Get Single Blog (Public)
const getBlogById = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id).populate("author", "first_name last_name email");
        if (!blog) {
            return res.status(404).json({ status: "fail", message: "Blog not found" });
        }
        return res.status(200).json({ status: "success", data: blog });
    } catch (err) {
        return res.status(400).json({ status: "fail", message: "Invalid Blog ID format" });
    }
};

// 3. Create Blog (Protected)
const createBlog = async (req, res) => {
    try {
        const { title, content, tags } = req.body;
        
        // req.user بيجي من verifyJWT middleware
        const newBlog = await Blog.create({
            title,
            content,
            tags,
            author: req.user.id
        });

        return res.status(201).json({ status: "success", data: newBlog });
    } catch (err) {
        return res.status(500).json({ status: "error", message: "Failed to create blog" });
    }
};

// 4. Update Blog (Protected - Owner or Admin)
const updateBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ status: "fail", message: "Blog not found" });
        }

        // Authorization Check
        if (blog.author.toString() !== req.user.id && req.user.role !== "Admin") {
            return res.status(403).json({ status: "fail", message: "Unauthorized to update this blog" });
        }

        const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        return res.status(200).json({ status: "success", data: updatedBlog });
    } catch (err) {
        return res.status(500).json({ status: "error", message: "Failed to update blog" });
    }
};

// 5. Delete Blog (Protected - Owner or Admin)
const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ status: "fail", message: "Blog not found" });
        }

        if (blog.author.toString() !== req.user.id && req.user.role !== "Admin") {
            return res.status(403).json({ status: "fail", message: "Unauthorized to delete this blog" });
        }

        await blog.deleteOne();
        return res.status(200).json({ status: "success", message: "Blog deleted successfully" });
    } catch (err) {
        return res.status(500).json({ status: "error", message: "Failed to delete blog" });
    }
};

module.exports = {
    getAllBlogs,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog
};
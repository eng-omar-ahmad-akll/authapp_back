const express = require("express");
const router = express.Router();
const blogsController = require("../controllers/blogsController");
const verifyJWT = require("../middleware/verifyJWT");
const { validateCreateBlog, validateUpdateBlog } = require("../middleware/blogValidation");

// Public Routes (مفتوحة لأي حد)
router.get("/", blogsController.getAllBlogs);
router.get("/:id", blogsController.getBlogById);

// Protected Routes (تتطلب Bearer Token)
router.use(verifyJWT);

router.post("/", validateCreateBlog, blogsController.createBlog);
router.patch("/:id", validateUpdateBlog, blogsController.updateBlog);
router.delete("/:id", blogsController.deleteBlog);

module.exports = router;
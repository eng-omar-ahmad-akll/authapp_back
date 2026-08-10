const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Blog title is required"],
            trim: true,
            minlength: [3, "Title must be at least 3 characters long"],
            maxlength: [150, "Title cannot exceed 150 characters"]
        },
        content: {
            type: String,
            required: [true, "Blog content is required"],
            trim: true,
            minlength: [10, "Content must be at least 10 characters long"]
        },
        tags: [
            {
                type: String,
                trim: true,
                lowercase: true // تحويل الهاشتاج للحروف الصغيرة لتسهيل البحث
            }
        ],
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Blog author is required"]
        }
    },
    {
        timestamps: true
    }
);

// تحسين الأداء: تسريع عمليات الترتيب والبحث بحسب الكاتب والتاريخ
blogSchema.index({ author: 1, createdAt: -1 });
blogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Blog", blogSchema);
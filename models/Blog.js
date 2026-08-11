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
            minlength: [10, "Content must be at least 10 characters long"],
            maxlength: [50000, "Content cannot exceed 50,000 characters"] // حماية من DoS على مستوى الـ Schema
        },
        tags: [
            {
                type: String,
                trim: true,
                lowercase: true, // تحويل الهاشتاج للحروف الصغيرة لتسهيل البحث
                maxlength: [30, "Tag cannot exceed 30 characters"]
            }
        ],
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Blog author is required"]
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                delete ret.__v; // إزالة الـ versionKey غير الضروري في الـ Responses
                return ret;
            }
        }
    }
);

// 1. تحسين الأداء: تسريع عمليات الاستعلام المباشرة بحسب الكاتب والتاريخ
blogSchema.index({ author: 1, createdAt: -1 });
blogSchema.index({ createdAt: -1 });

// تحسين البحث النصي ليشمل المحتوى أيضاً
blogSchema.index({ title: "text", tags: "text", content: "text" });

module.exports = mongoose.model("Blog", blogSchema);
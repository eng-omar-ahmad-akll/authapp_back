const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Blog title is required"],
            trim: true,
            maxlength: [150, "Title cannot exceed 150 characters"]
        },
        content: {
            type: String,
            required: [true, "Blog content is required"],
            trim: true
        },
        tags: [
            {
                type: String,
                trim: true
            }
        ],
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // ربط المقال بجدول اليوزرز
            required: true
        }
    },
    {
        timestamps: true // بيضيف createdAt و updatedAt تلقائياً
    }
);

module.exports = mongoose.model("Blog", blogSchema);
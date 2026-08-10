const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        first_name: {
            type: String,
            required: [true, "First name is required"],
            trim: true,
            minlength: [2, "First name must be at least 2 characters"],
            maxlength: [30, "First name cannot exceed 30 characters"]
        },
        last_name: {
            type: String,
            required: [true, "Last name is required"],
            trim: true,
            minlength: [2, "Last name must be at least 2 characters"],
            maxlength: [30, "Last name cannot exceed 30 characters"]
        },
        email: {
            type: String,
            required: [true, "Email address is required"],
            unique: true, // يمنع تكرار الإيميل ويعمل Index تلقائي للبحث السريع
            lowercase: true, // تحويل الإيميل تلقائياً لحروف صغيرة
            trim: true
        },
        password: {
            type: String,
            required: [true, "Password is required"]
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
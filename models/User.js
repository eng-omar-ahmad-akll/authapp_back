const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            select: false // OWASP Mitigation: إخفاء كلمة السر تلقائياً من جميع الاستعلامات
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },
        twoFactorSecret: {
            type: String,
            default: null,
            select: false // OWASP Mitigation: إخفاء سر الـ 2FA تلقائياً لمنع تسريبه
        },
        isTwoFactorEnabled: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                delete ret.password;
                delete ret.twoFactorSecret;
                delete ret.__v;
                return ret;
            }
        }
    }
);

// 1. تشفير كلمة السر تلقائياً قبل الحفظ في قاعدة البيانات
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// 2. دالة مخصصة للتحقق من صحة كلمة السر عند تسجيل الدخول
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
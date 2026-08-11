const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

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
            minlength: [2, "First name must be at least 2 characters"],
            maxlength: [30, "First name cannot exceed 30 characters"]
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
            select: false
        },
        role: {
            type: String,
            enum: ["user", "author", "admin"],
            default: "user"
        },
        twoFactorSecret: {
            type: String,
            default: null,
            select: false
        },
        isTwoFactorEnabled: {
            type: Boolean,
            default: false
        },
        passwordChangedAt: {
            type: Date,
            select: false
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                delete ret.password;
                delete ret.twoFactorSecret;
                delete ret.passwordChangedAt;
                delete ret.__v;
                return ret;
            }
        }
    }
);

// تشفير كلمة المرور وتحديث تاريخ التغيير
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);

        // إذا لم يكن المستند جديداً (تعديل كلمة مرور حساب قائم)
        if (!this.isNew) {
            this.passwordChangedAt = Date.now() - 1000; // خصم ثانية لتجنب تأخير إصدار التوكن
        }

        next();
    } catch (err) {
        next(err);
    }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// فحص هل تم تغيير كلمة المرور بعد إصدار التوكن أم لا
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

module.exports = mongoose.model("User", userSchema);
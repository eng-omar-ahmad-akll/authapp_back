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
            select: false
        },
        role: {
            type: String,
            enum: ["user", "author", "admin"],
            default: "user"
        },
        isActive: {
            type: Boolean,
            default: true,
            select: false
        },
        refreshTokens: {
            type: [String],
            default: [],
            select: false
        },
        loginAttempts: {
            type: Number,
            default: 0,
            select: false
        },
        lockUntil: {
            type: Date,
            default: null,
            select: false
        },
        twoFactorSecret: {
            type: String,
            default: null,
            select: false
        },
        tempTwoFactorSecret: {
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
        },
        lastLoginAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                delete ret.password;
                delete ret.twoFactorSecret;
                delete ret.tempTwoFactorSecret;
                delete ret.passwordChangedAt;
                delete ret.refreshTokens;
                delete ret.loginAttempts;
                delete ret.lockUntil;
                delete ret.isActive;
                delete ret.__v;
                return ret;
            }
        }
    }
);

userSchema.virtual("isLocked").get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);

        if (!this.isNew) {
            this.passwordChangedAt = Date.now() - 1000;
        }

        next();
    } catch (err) {
        next(err);
    }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

userSchema.methods.incLoginAttempts = async function () {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return await this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 15 * 60 * 1000 }; // قفل لمدة 15 دقيقة
    }

    return await this.updateOne(updates);
};

module.exports = mongoose.model("User", userSchema);
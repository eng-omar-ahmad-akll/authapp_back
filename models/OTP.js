const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const otpSchema = new mongoose.Schema(
    {
        email: { 
            type: String, 
            required: [true, "Email is required for OTP"], 
            lowercase: true,
            trim: true,
            index: true
        },
        otp: { 
            type: String, 
            required: [true, "OTP code is required"] 
        },
        attempts: {
            type: Number,
            default: 0
        },
        createdAt: { 
            type: Date, 
            default: Date.now, 
            expires: 600
        }
    },
    { timestamps: false }
);

// التشفير يحدث فقط عند تعديل حقل otp لمنع Re-hashing عند زيادة المحاولات
otpSchema.pre("save", async function (next) {
    if (!this.isModified("otp")) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.otp = await bcrypt.hash(this.otp, salt);
        next();
    } catch (err) {
        next(err);
    }
});

otpSchema.methods.compareOTP = async function (candidateOTP) {
    return await bcrypt.compare(candidateOTP, this.otp);
};

module.exports = mongoose.model("OTP", otpSchema);
const mongoose = require("mongoose");
const crypto = require("crypto");

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
        lastOtpUsedAt: {
            type: Date,
            default: null
        },
        createdAt: { 
            type: Date, 
            default: Date.now, 
            expires: 600
        }
    },
    { timestamps: false }
);

// استخدام SHA256 لحماية الـ CPU من إجهاد Bcrypt
otpSchema.pre("save", function (next) {
    if (!this.isModified("otp")) return next();
    this.otp = crypto.createHash("sha256").update(this.otp).digest("hex");
    next();
});

otpSchema.methods.compareOTP = function (candidateOTP) {
    const hashedCandidate = crypto.createHash("sha256").update(candidateOTP).digest("hex");
    return this.otp === hashedCandidate;
};

module.exports = mongoose.model("OTP", otpSchema);
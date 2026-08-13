/**
 * @file OTP Mongoose Data Model
 * @description Temporary storage schema for hashed OTP verification tokens with auto-expiration (TTL).
 * 
 * @author 3akl
 */

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
            expires: 600 // Auto-deletes document after 10 minutes
        }
    },
    { timestamps: false }
);

/**
 * Pre-save hook: Hash OTP code using SHA-256 before persisting
 */
otpSchema.pre("save", function (next) {
    if (!this.isModified("otp")) return next();
    this.otp = crypto.createHash("sha256").update(this.otp).digest("hex");
    next();
});

/**
 * Instance method: Verify incoming raw OTP candidate against stored hash
 * @param {string} candidateOTP - Plain text OTP string
 * @returns {boolean} Matches or not
 * @author 3akl
 */
otpSchema.methods.compareOTP = function (candidateOTP) {
    const hashedCandidate = crypto.createHash("sha256").update(candidateOTP).digest("hex");
    return this.otp === hashedCandidate;
};

module.exports = mongoose.model("OTP", otpSchema);
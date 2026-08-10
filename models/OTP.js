const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 600 } // مسح تلقائي بعد 10 دقائق (TTL Index)
});

module.exports = mongoose.model("OTP", otpSchema);
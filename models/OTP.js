const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const otpSchema = new mongoose.Schema(
    {
        email: { 
            type: String, 
            required: [true, "Email is required for OTP"], 
            lowercase: true,
            trim: true,
            index: true // تحسين سرعة الاستعلام عن الـ OTP الخاص ببريد معين
        },
        otp: { 
            type: String, 
            required: [true, "OTP code is required"] 
        },
        attempts: {
            type: Number,
            default: 0,
            max: [5, "Maximum OTP verification attempts exceeded"] // حماية من الـ Brute-force
        },
        createdAt: { 
            type: Date, 
            default: Date.now, 
            expires: 600 // حذف تلقائي بعد 10 دقائق من إنشائه (600 ثانية)
        }
    },
    {
        timestamps: false
    }
);

// Hashing الـ OTP تلقائياً قبل حفظه في قاعدة البيانات
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

// دالة مخصصة للتحقق من صحة الـ OTP المدخل مقارنة بالـ Hashed OTP
otpSchema.methods.compareOTP = async function (candidateOTP) {
    return await bcrypt.compare(candidateOTP, this.otp);
};

module.exports = mongoose.model("OTP", otpSchema);
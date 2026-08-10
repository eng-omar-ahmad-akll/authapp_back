const express = require("express");
const router = express.Router();
const path = require("path");

// تحديد مسار مجلد العرض بشكل صارم ومحمي
const VIEWS_DIR = path.join(__dirname, "..", "views");

// التعامل مع المسارات الرئيسية للخدمة
router.get(["/", "/index", "/index.html"], (req, res) => {
    // تقديم الملف مع حمايته من الـ Path Traversal بضبط مجلد الـ Root الصريح
    res.sendFile("index.html", { root: VIEWS_DIR }, (err) => {
        if (err) {
            // التعامل مع خطأ عدم وجود الملف بدون تسريب تفاصيل المسارات للمستخدم
            res.status(err.status || 500).json({
                status: "error",
                message: "Unable to serve requested page"
            });
        }
    });
});

module.exports = router;
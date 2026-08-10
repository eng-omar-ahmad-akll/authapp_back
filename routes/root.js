const express = require("express");
const router = express.Router();
const path = require("path");

// عرض الصفحة الرئيسية مع دعم المسارات المتعددة (/, /index, /index.html)
router.get("^/$|/index(.html)?", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "views", "index.html"));
});

module.exports = router;
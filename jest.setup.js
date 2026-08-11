const mongoose = require("mongoose");

// رفع الـ Timeout للاختبارات
jest.setTimeout(10000);

// إغلاق اتصالات Mongoose تلقائياً لتفادي بقاء العملية مفتوحة
afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
});
const allowedOrigins = require("./allowedorigin");

const corsOptions = {
    origin: (origin, callback) => {
        // السماح بالطلبات التي لا تحتوي على Origin (مثل Server-to-Server أو Curl)
        // أو التحقق مما إذا كان الـ Origin ضمن القائمة المسموحة
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

module.exports = corsOptions;
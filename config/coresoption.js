const allowedOrigins = require("./allowedorigin");

const corsOptions = {
    origin: (origin, callback) => {
        // السماح بالـ Non-browser requests (!origin) فقط في التطوير والتست لتجنب الـ Bypassing في Production
        const isAllowedOrigin = allowedOrigins.includes(origin);
        const isNonBrowserInDev = !origin && process.env.NODE_ENV !== "production";

        if (isAllowedOrigin || isNonBrowserInDev) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS policy"));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

module.exports = corsOptions;
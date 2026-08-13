/**
 * @file CORS Options Configuration
 * @description Configures Cross-Origin Resource Sharing (CORS) security policies.
 * 
 * @author 3akl
 */

const allowedOrigins = require("./allowedorigin");

const corsOptions = {
    /**
     * Origin dynamic validator callback function.
     * Allows non-browser queries (Postman, Server-to-Server) and strictly listed domains.
     */
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true, // Enables cookies & authorization headers across origins
    optionsSuccessStatus: 200
};

module.exports = corsOptions;
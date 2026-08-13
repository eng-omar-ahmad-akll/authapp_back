/**
 * @file Main Express Application Entry Point
 * @description Configures middleware stack, edge security headers, rate limiters, database connections, and server bootstrap.
 * 
 * @author 3akl
 */

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const connectDB = require("./config/dbconnect");
const corsOptions = require("./config/coresoption");
const { globalErrorHandler } = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiters");

const app = express();

// Establish Database Connection
connectDB();

// ==========================================
// 1. HARDENED HELMET & EDGE SECURITY HEADERS
// ==========================================
app.use(
  helmet({
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    frameguard: { action: "deny" },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    dnsPrefetchControl: { allow: false },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "https://res.cloudinary.com"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

app.use((req, res, next) => {
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  next();
});

// ==========================================
// 2. CORE PARSERS & MIDDLEWARES
// ==========================================
app.set("trust proxy", 1);

app.use(cors(corsOptions));
app.use(cookieParser());

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ==========================================
// 3. INPUT SANITIZATION & RATE LIMITING
// ==========================================
app.use(mongoSanitize({ replaceWith: "_" }));
app.use("/api", apiLimiter);

// ==========================================
// 4. STATIC FILES & ROUTES
// ==========================================
app.use(express.static(path.join(__dirname, "public"), {
    dotfiles: "ignore",
    index: false
}));

app.use("/", require("./routes/root"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/users", require("./routes/usersRoute"));
app.use("/blogs", require("./routes/blogRoutes"));

// ==========================================
// 5. SAFE 404 & ERROR HANDLERS
// ==========================================
app.use((req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ status: "fail", message: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});

app.use(globalErrorHandler);

// ==========================================
// 6. SERVER BOOTSTRAP
// ==========================================
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
  mongoose.connection.once("open", () => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });
}

module.exports = app;
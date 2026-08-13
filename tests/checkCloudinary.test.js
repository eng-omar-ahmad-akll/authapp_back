/**
 * @file Cloudinary Connection Diagnostic Utility
 * @description Utility script to verify environment variables and test direct API connections to Cloudinary.
 * 
 * @author 3akl
 */

require("dotenv").config();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("🔍 Checking Environment Variables:");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY);

cloudinary.uploader.upload(
  "https://cloudinary-res.cloudinary.com/image/upload/cloudinary_logo.png",
  (error, result) => {
    if (error) {
      console.log("\n❌ FAIL DETAILS FROM CLOUDINARY:");
      console.dir(error, { depth: null });
    } else {
      console.log("\n✅ SUCCESS! URL:", result.secure_url);
    }
  }
);
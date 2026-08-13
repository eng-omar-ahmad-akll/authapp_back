/**
 * @file Cloudinary Service Utility
 * @description Integrates Cloudinary API for stream uploads and safe deletion operations.
 * 
 * @author 3akl
 */

const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a file buffer directly to Cloudinary using a write stream
 * @param {Buffer} fileBuffer - In-memory file buffer
 * @param {string} folderName - Cloudinary target directory
 * @returns {Promise<{public_id: string, url: string}>}
 * @author 3akl
 */
const uploadToCloudinary = (fileBuffer, folderName) => {
    return new Promise((resolve, reject) => {
        if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
            return reject(new Error("Invalid file buffer provided for Cloudinary upload"));
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: folderName, resource_type: "auto" },
            (error, result) => {
                if (error) return reject(new Error(`Cloudinary Upload Error: ${error.message}`));
                resolve({
                    public_id: result.public_id,
                    url: result.secure_url
                });
            }
        );

        uploadStream.end(fileBuffer);
    });
};

/**
 * Deletes an existing resource from Cloudinary safely using public_id validation
 * @param {string} publicId - Cloudinary asset public ID
 * @author 3akl
 */
const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId || typeof publicId !== "string" || !/^[a-zA-Z0-9_\/-]+$/.test(publicId)) {
            return;
        }
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error(`Cloudinary Delete Error: ${error.message}`);
    }
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary
};
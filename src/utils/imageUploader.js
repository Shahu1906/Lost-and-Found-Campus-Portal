const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

exports.uploadImage = async (fileStr) => {
    try {
        const uploadResponse = await cloudinary.uploader.upload(fileStr, {
            folder: 'lost_and_found',
        });
        return uploadResponse.secure_url;
    } catch (err) {
        console.error(err);
        throw new Error('Image upload failed');
    }
};

exports.uploadImageBuffer = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'lost_and_found' },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary stream upload error:', error);
                    return reject(new Error('Image upload failed'));
                }
                resolve(result.secure_url);
            }
        );
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};
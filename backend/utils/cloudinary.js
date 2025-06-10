import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs/promises'; 

dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (filePath) => {
  try {
    console.log('Cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API key:', process.env.CLOUDINARY_API_KEY);
console.log('API secret:', process.env.CLOUDINARY_API_SECRET);
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'auto',
      folder: 'your_folder_name', // optional
    });
    await fs.unlink(filePath);
    return result.secure_url;

  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

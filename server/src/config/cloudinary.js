import { v2 as cloudinary } from 'cloudinary';
import { config } from './config.js';

if (config.cloudinary.isConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  console.log('✅ Cloudinary initialized for remote storage.');
} else {
  console.log('ℹ️ Cloudinary credentials not provided. Using protected local storage for media uploads.');
}

export { cloudinary };

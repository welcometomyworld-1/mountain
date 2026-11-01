import fs from 'fs';
import path from 'path';
import { cloudinary } from '../config/cloudinary.js';
import { config } from '../config/config.js';
import { User } from '../models/User.js';

export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded.',
      });
    }

    const localFilePath = req.file.path;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;
    const filename = path.basename(localFilePath);

    // If Cloudinary is configured and file is image/video, upload to cloud
    if (config.cloudinary.isConfigured && (mimeType.startsWith('image/') || mimeType.startsWith('video/'))) {
      try {
        const isVideo = mimeType.startsWith('video/');
        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
          folder: 'privateid_uploads',
          resource_type: isVideo ? 'video' : 'image',
          transformation: isVideo ? [] : [{ quality: 'auto', fetch_format: 'auto' }],
        });

        // Clean up temporary local file
        fs.unlink(localFilePath, (err) => {
          if (err) console.error('Failed to remove temp file:', err);
        });

        return res.status(200).json({
          success: true,
          media: {
            url: uploadResult.secure_url,
            thumbnailUrl: isVideo ? uploadResult.secure_url.replace(/\.[^/.]+$/, '.jpg') : uploadResult.secure_url,
            publicId: uploadResult.public_id,
            fileSize,
            mimeType,
            fileName: originalName,
          },
        });
      } catch (cloudErr) {
        console.error('Cloudinary upload error:', cloudErr);
      }
    }

    // Local storage serving
    const mediaUrl = `/api/upload/media/${filename}`;

    res.status(200).json({
      success: true,
      media: {
        url: mediaUrl,
        thumbnailUrl: mediaUrl,
        publicId: filename,
        fileSize,
        mimeType,
        fileName: originalName,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload and update Profile Picture (Avatar)
 */
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please choose an image file (JPG, PNG, or WEBP).',
      });
    }

    const localFilePath = req.file.path;
    const filename = path.basename(localFilePath);
    let avatarUrl = `/api/upload/media/${filename}`;

    // If Cloudinary is configured, upload avatar to cloud storage
    if (config.cloudinary.isConfigured) {
      try {
        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
          folder: 'privateid_avatars',
          resource_type: 'image',
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        });
        avatarUrl = uploadResult.secure_url;

        // Clean up temporary local file
        fs.unlink(localFilePath, (err) => {
          if (err) console.error('Failed to remove temp avatar file:', err);
        });
      } catch (cloudErr) {
        console.error('Cloudinary avatar upload error, using local fallback:', cloudErr);
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.avatar = avatarUrl;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully!',
      avatar: avatarUrl,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Safe media serving endpoint
 */
export const getProtectedMedia = (req, res, next) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const filePath = path.resolve('uploads', safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Media file not found.',
      });
    }

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

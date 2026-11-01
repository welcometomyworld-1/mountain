import express from 'express';
import { uploadImage, uploadAvatar, getProtectedMedia } from '../controllers/uploadController.js';
import { upload, uploadAvatarMiddleware } from '../middlewares/uploadMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Upload general media (image, video, voice note, document)
router.post('/image', protect, upload.single('image'), uploadImage);
router.post('/file', protect, upload.single('file'), uploadImage);

// Upload profile picture (JPG, PNG, WEBP)
router.post('/avatar', protect, uploadAvatarMiddleware.single('avatar'), uploadAvatar);

// Media serving endpoint for image tags, video, audio, & downloads
router.get('/media/:filename', getProtectedMedia);

export default router;

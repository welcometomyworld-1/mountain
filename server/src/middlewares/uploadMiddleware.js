import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const prefix = file.fieldname === 'avatar' ? 'avatar' : 'media';
    cb(null, `${prefix}_${Date.now()}_${uniqueSuffix}${ext}`);
  },
});

// File filter for general media & document uploads (up to 25MB)
const fileFilter = (req, file, cb) => {
  const allowedExts = [
    // Images
    '.jpg', '.jpeg', '.png', '.webp', '.gif',
    // Videos
    '.mp4', '.webm', '.mov', '.mkv',
    // Audio / Voice notes
    '.mp3', '.wav', '.ogg', '.m4a',
    // Documents
    '.pdf', '.doc', '.docx', '.txt', '.zip', '.rar', '.xls', '.xlsx', '.ppt', '.pptx',
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts.includes(ext) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Please upload an image, audio, video, or document.'), false);
  }
};

// Filter strictly for avatar photos (JPG, PNG, WEBP)
const avatarFilter = (req, file, cb) => {
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts.includes(ext) && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Profile picture must be a JPG, PNG, or WEBP image.'), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max limit
  },
  fileFilter,
});

export const uploadAvatarMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for avatars
  },
  fileFilter: avatarFilter,
});

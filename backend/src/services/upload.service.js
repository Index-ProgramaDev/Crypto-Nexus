import multer from 'multer';
import path from 'path';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  
  cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
};

// Configure multer
const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize
  },
  fileFilter
});

export class UploadService {
  /**
   * Handle file upload
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static uploadSingle(fieldName) {
    return upload.single(fieldName);
  }

  /**
   * Get file URL
   * @param {Object} file - Multer file object
   * @returns {string} File URL
   */
  static getFileUrl(file) {
    // In production, this would return the CDN URL
    // For now, return a local path
    return `/uploads/${file.filename}`;
  }
}

// Export multer instance for direct use
export { upload };

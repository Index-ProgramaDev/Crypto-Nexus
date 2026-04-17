import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import fs from 'fs';

const router = Router();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Not an image! Please upload an image.'), { statusCode: 400 }), false);
    }
  }
});

/**
 * Upload single image
 * POST /api/v1/upload
 */
router.post('/', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw Object.assign(new Error('No file uploaded'), { statusCode: 400 });
  }

  // Construct URL. In production this would be an S3 URL.
  // For now, it serves locally on `/uploads/filename.ext`
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  res.status(201).json({
    success: true,
    data: {
      url: fileUrl
    }
  });
}));

export default router;

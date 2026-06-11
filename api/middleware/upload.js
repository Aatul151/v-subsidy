import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';

let __dirname;

try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (err) {
  // SEA executable fallback
  __dirname = process.cwd();
}

// Temporary upload directory
const TEMP_UPLOAD_DIR = path.join(__dirname, '../temp_media');

// Ensure temp directory exists
const ensureTempDir = async () => {
  try {
    await fs.access(TEMP_UPLOAD_DIR);
  } catch {
    await fs.mkdir(TEMP_UPLOAD_DIR, { recursive: true });
  }
};

// Initialize temp directory on module load
ensureTempDir().catch((err) => {
  logger.error('Failed to create temp upload directory:', err);
});

// Configure multer disk storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureTempDir();
    cb(null, TEMP_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const fileExt = path.extname(file.originalname);
    const uniqueFileName = `temp_${timestamp}_${randomSuffix}${fileExt}`;
    cb(null, uniqueFileName);
  },
});

// File filter to accept only media files
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: images, videos, PDF, Office documents, text files`
      ),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // Default 10MB in bytes
  },
});

/**
 * Middleware for single file upload
 */
export const uploadSingle = (fieldName = 'file') => {
  return upload.single(fieldName);
};

/**
 * Middleware for multiple file uploads
 */
export const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  return upload.array(fieldName, maxCount);
};

/**
 * Middleware for multiple fields with multiple files
 */
export const uploadFields = (fields) => {
  return upload.fields(fields);
};

/**
 * Cleanup old temporary files (older than specified hours)
 * @param {number} olderThanHours - Delete files older than this many hours (default: 2)
 */
export const cleanupOldTempFiles = async (olderThanHours = 2) => {
  try {
    const files = await fs.readdir(TEMP_UPLOAD_DIR);
    const now = Date.now();
    const maxAge = olderThanHours * 60 * 60 * 1000; // Convert hours to milliseconds
    let cleanedCount = 0;

    for (const file of files) {
      const filePath = path.join(TEMP_UPLOAD_DIR, file);
      try {
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAge) {
          await fs.unlink(filePath);
          cleanedCount++;
          logger.debug(`Cleaned up old temp file: ${file}`);
        }
      } catch (error) {
        // Continue if file doesn't exist or can't be accessed
        if (error.code !== 'ENOENT') {
          logger.warn(`Error checking temp file ${file}:`, error.message);
        }
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old temporary file(s) from temp_media`);
    }
  } catch (error) {
    // Ignore if directory doesn't exist
    if (error.code !== 'ENOENT') {
      logger.error('Error cleaning up old temp files:', error);
    }
  }
};

/**
 * Error handler for multer errors
 */
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE || '10MB'}`,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err) {
    logger.error('File upload error:', {
      error: err.message,
      stack: err.stack,
    });
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed',
    });
  }

  next();
};


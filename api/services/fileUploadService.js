import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import logger from '../config/logger.js';

let __dirname;

try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (err) {
  // SEA executable fallback
  __dirname = process.cwd();
}

// Storage type from environment variable
const STORAGE_TYPE = process.env.FILE_STORAGE_TYPE || 'local'; // 'local' or 's3'

// S3 Configuration
let s3Client = null;
if (STORAGE_TYPE === 's3') {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

// Base media directory for local storage
const MEDIA_BASE_DIR = path.join(__dirname, '../media');

/**
 * Sanitize filename: remove spaces and special characters, keep only alphanumeric, underscore, and hyphen
 * @param {string} name - File name to sanitize
 * @returns {string} Sanitized file name
 */
export const sanitizeFileName = (name) => {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
};

/**
 * Ensure directory exists (for local storage)
 * @param {string} dirPath - Directory path to create
 */
const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

/**
 * Get the full file path for local storage
 * @param {string} fileDir - Directory path relative to MEDIA_BASE_DIR
 * @param {string} fileName - File name
 * @returns {string} Full file path
 */
const getLocalFilePath = (fileDir, fileName) => {
  return path.join(MEDIA_BASE_DIR, fileDir, fileName);
};

/**
 * Get the S3 key for S3 storage
 * @param {string} fileDir - Directory path relative to MEDIA_BASE_DIR
 * @param {string} fileName - File name
 * @returns {string} S3 key
 */
const getS3Key = (fileDir, fileName) => {
  // Normalize path separators for S3 (use forward slashes)
  const normalizedDir = fileDir.replace(/\\/g, '/');
  return `${normalizedDir}/${fileName}`;
};

/**
 * Upload file to local storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileDir - Directory path relative to MEDIA_BASE_DIR (e.g., "Forms/admission2025/507f1f77bcf86cd799439011")
 * @param {string} fileName - File name
 * @returns {Promise<Object>} Upload result with file path and URL
 */
const uploadToLocal = async (fileBuffer, fileDir, fileName) => {
  // Create full directory path
  const fullDirPath = path.join(MEDIA_BASE_DIR, fileDir);
  await ensureDirectoryExists(fullDirPath);

  // Get full file path
  const filePath = getLocalFilePath(fileDir, fileName);
  
  // Write the buffer to file
  await fs.writeFile(filePath, fileBuffer);

  // Return relative URL path for serving files (normalize path separators)
  const normalizedDir = fileDir.replace(/\\/g, '/');
  const fileUrl = `/media/${normalizedDir}/${fileName}`;

  return {
    success: true,
    filePath,
    fileUrl,
    storageType: 'local',
  };
};

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileDir - Directory path relative to MEDIA_BASE_DIR
 * @param {string} fileName - File name
 * @param {string} contentType - File content type
 * @returns {Promise<Object>} Upload result with file URL
 */
const uploadToS3 = async (fileBuffer, fileDir, fileName, contentType) => {
  if (!s3Client) {
    throw new Error('S3 client not initialized. Check AWS credentials.');
  }

  const s3Key = getS3Key(fileDir, fileName);

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Construct S3 URL
  const fileUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

  return {
    success: true,
    fileUrl,
    s3Key,
    storageType: 's3',
  };
};

/**
 * Upload file (common function that routes to local or S3 based on config)
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileDir - Directory path relative to MEDIA_BASE_DIR (e.g., "Forms/admission2025/507f1f77bcf86cd799439011")
 * @param {string} fileName - File name
 * @param {string} contentType - File content type (optional, for S3, defaults to 'application/octet-stream')
 * @returns {Promise<Object>} Upload result
 */
export const uploadFile = async (fileBuffer, fileDir, fileName, contentType = 'application/octet-stream') => {
  try {
    if (STORAGE_TYPE === 's3') {
      return await uploadToS3(fileBuffer, fileDir, fileName, contentType);
    } else {
      return await uploadToLocal(fileBuffer, fileDir, fileName);
    }
  } catch (error) {
    logger.error('File upload error:', {
      error: error.message,
      stack: error.stack,
      fileDir,
      fileName,
      storageType: STORAGE_TYPE,
    });
    throw error;
  }
};

/**
 * Delete file from local storage
 * @param {string} fileDir - Directory path relative to MEDIA_BASE_DIR
 * @param {string} fileName - File name
 * @returns {Promise<Object>} Delete result
 */
const deleteFromLocal = async (fileDir, fileName) => {
  const filePath = getLocalFilePath(fileDir, fileName);
  
  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
    return { success: true, message: 'File deleted successfully' };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, message: 'File not found' };
    }
    throw error;
  }
};

/**
 * Delete file from S3
 * @param {string} fileDir - Directory path relative to MEDIA_BASE_DIR
 * @param {string} fileName - File name
 * @returns {Promise<Object>} Delete result
 */
const deleteFromS3 = async (fileDir, fileName) => {
  if (!s3Client) {
    throw new Error('S3 client not initialized. Check AWS credentials.');
  }

  const s3Key = getS3Key(fileDir, fileName);

  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: s3Key,
  });

  await s3Client.send(command);

  return { success: true, message: 'File deleted successfully from S3' };
};

/**
 * Delete file (common function that routes to local or S3 based on config)
 * @param {string} fileDir - Directory path relative to MEDIA_BASE_DIR
 * @param {string} fileName - File name
 * @returns {Promise<Object>} Delete result
 */
export const deleteFile = async (fileDir, fileName) => {
  try {
    if (STORAGE_TYPE === 's3') {
      return await deleteFromS3(fileDir, fileName);
    } else {
      return await deleteFromLocal(fileDir, fileName);
    }
  } catch (error) {
    logger.error('File delete error:', {
      error: error.message,
      stack: error.stack,
      fileDir,
      fileName,
      storageType: STORAGE_TYPE,
    });
    throw error;
  }
};

/**
 * List files in a directory (local storage only)
 * @param {string} fileDir - Directory path relative to MEDIA_BASE_DIR
 * @returns {Promise<Array>} List of files
 */
export const listFiles = async (fileDir) => {
  try {
    if (STORAGE_TYPE === 's3') {
      // S3 listing would require ListObjectsV2Command
      // For now, return empty array - can be implemented later if needed
      logger.warn('S3 file listing not implemented yet');
      return [];
    } else {
      const fullDirPath = path.join(MEDIA_BASE_DIR, fileDir);
      
      try {
        await fs.access(fullDirPath);
        const files = await fs.readdir(fullDirPath);
        
        const fileList = await Promise.all(
          files.map(async (file) => {
            const filePath = path.join(fullDirPath, file);
            const stats = await fs.stat(filePath);
            // Normalize path separators for URL
            const normalizedDir = fileDir.replace(/\\/g, '/');
            return {
              name: file,
              size: stats.size,
              url: `/media/${normalizedDir}/${file}`,
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime,
            };
          })
        );
        
        return fileList;
      } catch (error) {
        if (error.code === 'ENOENT') {
          return [];
        }
        throw error;
      }
    }
  } catch (error) {
    logger.error('List files error:', {
      error: error.message,
      stack: error.stack,
      fileDir,
      storageType: STORAGE_TYPE,
    });
    throw error;
  }
};

/**
 * Get storage type
 * @returns {string} Storage type ('local' or 's3')
 */
export const getStorageType = () => {
  return STORAGE_TYPE;
};


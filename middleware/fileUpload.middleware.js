/**
 * Secure File Upload Middleware
 * Implements comprehensive file upload security
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const securityConfig = require('../config/security.config');
const encryptionUtil = require('../utils/encryption.util');

/**
 * Validate file type by MIME type and extension
 * @param {Object} file - File object from multer
 * @returns {boolean} - True if valid
 */
const validateFileType = (file) => {
  // Check MIME type
  const mimeTypeValid = securityConfig.fileUpload.allowedMimeTypes.includes(file.mimetype);

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const extensionValid = securityConfig.fileUpload.allowedExtensions.includes(ext);

  return mimeTypeValid && extensionValid;
};

/**
 * Sanitize filename
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
const sanitizeFilename = (filename) => {
  // Remove path traversal attempts
  const basename = path.basename(filename);

  // Remove special characters except dots, hyphens, and underscores
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Prevent double extensions
  const ext = path.extname(sanitized);
  const name = path.basename(sanitized, ext);

  // Limit filename length
  const maxLength = 200;
  const truncatedName = name.substring(0, maxLength - ext.length);

  return truncatedName + ext;
};

/**
 * Generate secure filename
 * @param {Object} file - File object
 * @returns {string} - Secure filename
 */
const generateSecureFilename = (file) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(16).toString('hex');
  const ext = path.extname(file.originalname).toLowerCase();
  return `${timestamp}-${randomString}${ext}`;
};

/**
 * Configure multer storage
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Create user-specific directory
      const userId = req.user?.id || 'anonymous';
      const uploadDir = path.join(securityConfig.fileUpload.uploadPath, userId);

      // Ensure directory exists
      await fs.mkdir(uploadDir, { recursive: true });

      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate secure filename
    const secureFilename = generateSecureFilename(file);
    cb(null, secureFilename);
  }
});

/**
 * File filter
 */
const fileFilter = (req, file, cb) => {
  // Validate file type
  if (!validateFileType(file)) {
    return cb(new Error('File type not allowed'), false);
  }

  // Additional security checks
  const originalName = file.originalname.toLowerCase();

  // Block executable files
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.app', '.deb', '.rpm'];
  if (dangerousExtensions.some(ext => originalName.endsWith(ext))) {
    return cb(new Error('Executable files are not allowed'), false);
  }

  // Block files with double extensions
  const parts = originalName.split('.');
  if (parts.length > 2 && dangerousExtensions.some(ext => originalName.includes(ext))) {
    return cb(new Error('Files with suspicious extensions are not allowed'), false);
  }

  cb(null, true);
};

/**
 * Create multer upload instance
 */
const upload = multer({
  storage: storage,
  limits: {
    fileSize: securityConfig.fileUpload.maxFileSize,
    files: securityConfig.requestLimits.maxFiles
  },
  fileFilter: fileFilter
});

/**
 * File upload validation middleware
 */
const validateUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }

  // Validate file metadata
  const files = req.files || [req.file];

  for (const file of files) {
    // Check file size
    if (file.size > securityConfig.fileUpload.maxFileSize) {
      return res.status(400).json({
        status: 'error',
        message: `File size exceeds maximum allowed size of ${securityConfig.fileUpload.maxFileSize / (1024 * 1024)}MB`
      });
    }

    // Validate MIME type
    if (!securityConfig.fileUpload.allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        status: 'error',
        message: 'File type not allowed'
      });
    }
  }

  next();
};

/**
 * Scan file for viruses (placeholder)
 * In production, integrate with antivirus service
 */
const scanForViruses = async (req, res, next) => {
  if (!securityConfig.fileUpload.virusScanEnabled) {
    return next();
  }

  try {
    const files = req.files || [req.file];

    for (const file of files) {
      // Placeholder for virus scanning
      // In production, integrate with ClamAV or similar
      console.log(`Scanning file for viruses: ${file.filename}`);

      // If virus detected:
      // await fs.unlink(file.path);
      // return res.status(400).json({
      //   status: 'error',
      //   message: 'File contains malicious content'
      // });
    }

    next();
  } catch (error) {
    console.error('Virus scan error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'File security scan failed'
    });
  }
};

/**
 * Encrypt uploaded file
 */
const encryptFile = async (req, res, next) => {
  try {
    const files = req.files || [req.file];

    for (const file of files) {
      // Read file
      const fileBuffer = await fs.readFile(file.path);

      // Encrypt file
      const encrypted = encryptionUtil.encryptFile(fileBuffer);

      // Write encrypted file
      const encryptedPath = file.path + '.enc';
      await fs.writeFile(encryptedPath, encrypted.data);

      // Store encryption metadata
      file.encrypted = true;
      file.encryptedPath = encryptedPath;
      file.encryptionMetadata = {
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        salt: encrypted.salt
      };

      // Optionally delete original file
      if (process.env.DELETE_ORIGINAL_AFTER_ENCRYPTION === 'true') {
        await fs.unlink(file.path);
      }
    }

    next();
  } catch (error) {
    console.error('File encryption error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'File encryption failed'
    });
  }
};

/**
 * Decrypt file for download
 */
const decryptFile = async (filePath, encryptionMetadata) => {
  try {
    // Read encrypted file
    const encryptedBuffer = await fs.readFile(filePath);

    // Decrypt file
    const decrypted = encryptionUtil.decryptFile(
      encryptedBuffer,
      encryptionMetadata.iv,
      encryptionMetadata.authTag,
      encryptionMetadata.salt
    );

    return decrypted;
  } catch (error) {
    console.error('File decryption error:', error);
    throw new Error('File decryption failed');
  }
};

/**
 * Image processing and validation
 */
const validateImage = async (req, res, next) => {
  try {
    const files = req.files || [req.file];

    for (const file of files) {
      // Only validate image files
      if (!file.mimetype.startsWith('image/')) {
        continue;
      }

      // Read file header to verify it's actually an image
      const fileBuffer = await fs.readFile(file.path);
      const header = fileBuffer.slice(0, 12);

      // Check magic numbers for common image formats
      const isJPEG = header[0] === 0xFF && header[1] === 0xD8;
      const isPNG = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
      const isGIF = header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46;
      const isWEBP = header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;

      if (!isJPEG && !isPNG && !isGIF && !isWEBP) {
        await fs.unlink(file.path);
        return res.status(400).json({
          status: 'error',
          message: 'File is not a valid image'
        });
      }

      // Additional image validation (dimensions, content analysis)
      // Can be implemented with sharp or jimp libraries
    }

    next();
  } catch (error) {
    console.error('Image validation error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Image validation failed'
    });
  }
};

/**
 * Cleanup failed uploads
 */
const cleanupOnError = (err, req, res, next) => {
  if (err) {
    // Delete uploaded files on error
    const files = req.files || (req.file ? [req.file] : []);

    files.forEach(async (file) => {
      try {
        if (file.path) {
          await fs.unlink(file.path);
        }
        if (file.encryptedPath) {
          await fs.unlink(file.encryptedPath);
        }
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });

    // Handle multer errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: 'error',
          message: `File size exceeds maximum allowed size of ${securityConfig.fileUpload.maxFileSize / (1024 * 1024)}MB`
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          status: 'error',
          message: `Maximum ${securityConfig.requestLimits.maxFiles} files allowed`
        });
      }
    }

    return res.status(400).json({
      status: 'error',
      message: err.message || 'File upload failed'
    });
  }

  next();
};

module.exports = {
  upload,
  validateUpload,
  scanForViruses,
  encryptFile,
  decryptFile,
  validateImage,
  cleanupOnError,
  sanitizeFilename,
  generateSecureFilename
};

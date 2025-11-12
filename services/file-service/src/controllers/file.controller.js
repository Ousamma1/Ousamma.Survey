const File = require('../models/File');
const { ApiError, asyncHandler } = require('../../../../shared/utils/errorHandler');
const createLogger = require('../../../../shared/utils/logger');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const logger = createLogger('file-controller');

// Generate thumbnail for images
const generateThumbnail = async (filePath, mimeType) => {
  if (!mimeType.startsWith('image/')) {
    return null;
  }

  try {
    const thumbnailFilename = `thumb_${path.basename(filePath)}`;
    const thumbnailPath = path.join(path.dirname(filePath), thumbnailFilename);

    await sharp(filePath)
      .resize(200, 200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFile(thumbnailPath);

    return {
      path: thumbnailPath,
      url: `/uploads/${thumbnailFilename}`
    };
  } catch (error) {
    logger.error('Error generating thumbnail:', error);
    return null;
  }
};

// Get image metadata
const getImageMetadata = async (filePath, mimeType) => {
  if (!mimeType.startsWith('image/')) {
    return {};
  }

  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    };
  } catch (error) {
    logger.error('Error getting image metadata:', error);
    return {};
  }
};

// Upload file
exports.uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
  }

  const { relatedTo, relatedId, uploadedBy } = req.body;

  // Generate thumbnail if image
  const thumbnail = await generateThumbnail(req.file.path, req.file.mimetype);

  // Get image metadata
  const metadata = await getImageMetadata(req.file.path, req.file.mimetype);

  const file = new File({
    originalName: req.file.originalname,
    filename: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
    url: `/uploads/${req.file.filename}`,
    thumbnail,
    metadata,
    uploadedBy,
    relatedTo,
    relatedId
  });

  await file.save();

  logger.info(`File uploaded: ${file._id} - ${file.originalName}`);

  res.status(201).json({
    success: true,
    data: file
  });
});

// Upload multiple files
exports.uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'No files uploaded');
  }

  const { relatedTo, relatedId, uploadedBy } = req.body;

  const uploadedFiles = await Promise.all(
    req.files.map(async (file) => {
      const thumbnail = await generateThumbnail(file.path, file.mimetype);
      const metadata = await getImageMetadata(file.path, file.mimetype);

      const fileDoc = new File({
        originalName: file.originalname,
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        url: `/uploads/${file.filename}`,
        thumbnail,
        metadata,
        uploadedBy,
        relatedTo,
        relatedId
      });

      return fileDoc.save();
    })
  );

  logger.info(`Multiple files uploaded: ${uploadedFiles.length} files`);

  res.status(201).json({
    success: true,
    data: uploadedFiles
  });
});

// Get all files
exports.getAllFiles = asyncHandler(async (req, res) => {
  const { relatedTo, relatedId, uploadedBy, page = 1, limit = 20 } = req.query;

  const query = { status: 'active' };

  if (relatedTo) query.relatedTo = relatedTo;
  if (relatedId) query.relatedId = relatedId;
  if (uploadedBy) query.uploadedBy = uploadedBy;

  const skip = (page - 1) * limit;

  const files = await File.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await File.countDocuments(query);

  res.json({
    success: true,
    data: files,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Get file by ID
exports.getFileById = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);

  if (!file || file.status === 'deleted') {
    throw new ApiError(404, 'File not found');
  }

  res.json({
    success: true,
    data: file
  });
});

// Download file
exports.downloadFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);

  if (!file || file.status === 'deleted') {
    throw new ApiError(404, 'File not found');
  }

  // Increment download counter
  await file.incrementDownloads();

  // Send file
  res.download(file.path, file.originalName);

  logger.info(`File downloaded: ${file._id} - ${file.originalName}`);
});

// Delete file
exports.deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);

  if (!file) {
    throw new ApiError(404, 'File not found');
  }

  // Soft delete
  await file.softDelete();

  // Optionally, delete physical files
  if (process.env.DELETE_PHYSICAL_FILES === 'true') {
    try {
      await fs.unlink(file.path);
      if (file.thumbnail?.path) {
        await fs.unlink(file.thumbnail.path);
      }
    } catch (error) {
      logger.error('Error deleting physical file:', error);
    }
  }

  logger.info(`File deleted: ${file._id}`);

  res.json({
    success: true,
    message: 'File deleted successfully'
  });
});

// Get file statistics
exports.getFileStats = asyncHandler(async (req, res) => {
  const totalFiles = await File.countDocuments({ status: 'active' });

  const totalSize = await File.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        total: { $sum: '$size' }
      }
    }
  ]);

  const byType = await File.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$mimeType',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.json({
    success: true,
    data: {
      totalFiles,
      totalSize: totalSize[0]?.total || 0,
      byType
    }
  });
});

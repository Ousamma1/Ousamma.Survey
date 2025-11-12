const Template = require('../models/Template');
const { ApiError, asyncHandler } = require('../../../../shared/utils/errorHandler');
const createLogger = require('../../../../shared/utils/logger');

const logger = createLogger('template-controller');

// Create template
exports.createTemplate = asyncHandler(async (req, res) => {
  const template = new Template(req.body);
  await template.save();

  logger.info(`Template created: ${template._id}`);

  res.status(201).json({
    success: true,
    data: template
  });
});

// Get all templates
exports.getAllTemplates = asyncHandler(async (req, res) => {
  const {
    category,
    industry,
    tags,
    isPremium,
    page = 1,
    limit = 12,
    sortBy = 'usageCount',
    search
  } = req.query;

  const query = { isPublished: true };

  if (category) query.category = category;
  if (industry) query.industry = industry;
  if (tags) query.tags = { $in: tags.split(',') };
  if (isPremium !== undefined) query.isPremium = isPremium === 'true';
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  const sortOptions = {
    usageCount: { usageCount: -1 },
    rating: { 'rating.average': -1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 }
  };

  const templates = await Template.find(query)
    .select('-template.questions') // Exclude detailed questions for list view
    .sort(sortOptions[sortBy] || sortOptions.usageCount)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Template.countDocuments(query);

  res.json({
    success: true,
    data: templates,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Get template by ID
exports.getTemplateById = asyncHandler(async (req, res) => {
  const template = await Template.findById(req.params.id);

  if (!template || !template.isPublished) {
    throw new ApiError(404, 'Template not found');
  }

  res.json({
    success: true,
    data: template
  });
});

// Update template
exports.updateTemplate = asyncHandler(async (req, res) => {
  const template = await Template.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!template) {
    throw new ApiError(404, 'Template not found');
  }

  logger.info(`Template updated: ${template._id}`);

  res.json({
    success: true,
    data: template
  });
});

// Delete template
exports.deleteTemplate = asyncHandler(async (req, res) => {
  const template = await Template.findByIdAndDelete(req.params.id);

  if (!template) {
    throw new ApiError(404, 'Template not found');
  }

  logger.info(`Template deleted: ${template._id}`);

  res.json({
    success: true,
    message: 'Template deleted successfully'
  });
});

// Use template (increment usage count)
exports.useTemplate = asyncHandler(async (req, res) => {
  const template = await Template.findById(req.params.id);

  if (!template || !template.isPublished) {
    throw new ApiError(404, 'Template not found');
  }

  await template.incrementUsage();

  logger.info(`Template used: ${template._id}`);

  res.json({
    success: true,
    data: template.template
  });
});

// Rate template
exports.rateTemplate = asyncHandler(async (req, res) => {
  const { rating } = req.body;

  if (rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be between 1 and 5');
  }

  const template = await Template.findById(req.params.id);

  if (!template) {
    throw new ApiError(404, 'Template not found');
  }

  await template.updateRating(rating);

  logger.info(`Template rated: ${template._id} - ${rating} stars`);

  res.json({
    success: true,
    data: {
      averageRating: template.rating.average,
      ratingCount: template.rating.count
    }
  });
});

// Get categories
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Template.aggregate([
    { $match: { isPublished: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.json({
    success: true,
    data: categories.map(cat => ({
      name: cat._id,
      count: cat.count
    }))
  });
});

// Get industries
exports.getIndustries = asyncHandler(async (req, res) => {
  const industries = await Template.aggregate([
    { $match: { isPublished: true, industry: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$industry',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.json({
    success: true,
    data: industries.map(ind => ({
      name: ind._id,
      count: ind.count
    }))
  });
});

// Get popular templates
exports.getPopularTemplates = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const templates = await Template.find({ isPublished: true })
    .select('-template.questions')
    .sort({ usageCount: -1 })
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: templates
  });
});

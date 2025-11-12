const Survey = require('../models/Survey');
const { ApiError, asyncHandler } = require('../../../../shared/utils/errorHandler');
const createLogger = require('../../../../shared/utils/logger');

const logger = createLogger('survey-controller');

// Create survey
exports.createSurvey = asyncHandler(async (req, res) => {
  const survey = new Survey(req.body);
  await survey.save();

  logger.info(`Survey created: ${survey._id}`);

  res.status(201).json({
    success: true,
    data: survey
  });
});

// Get all surveys
exports.getAllSurveys = asyncHandler(async (req, res) => {
  const { status, category, page = 1, limit = 10, search } = req.query;

  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  const surveys = await Survey.find(query)
    .select('-questions') // Exclude questions for list view
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Survey.countDocuments(query);

  res.json({
    success: true,
    data: surveys,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Get survey by ID
exports.getSurveyById = asyncHandler(async (req, res) => {
  const survey = await Survey.findById(req.params.id);

  if (!survey) {
    throw new ApiError(404, 'Survey not found');
  }

  res.json({
    success: true,
    data: survey
  });
});

// Update survey
exports.updateSurvey = asyncHandler(async (req, res) => {
  const survey = await Survey.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!survey) {
    throw new ApiError(404, 'Survey not found');
  }

  logger.info(`Survey updated: ${survey._id}`);

  res.json({
    success: true,
    data: survey
  });
});

// Delete survey
exports.deleteSurvey = asyncHandler(async (req, res) => {
  const survey = await Survey.findByIdAndDelete(req.params.id);

  if (!survey) {
    throw new ApiError(404, 'Survey not found');
  }

  logger.info(`Survey deleted: ${survey._id}`);

  res.json({
    success: true,
    message: 'Survey deleted successfully'
  });
});

// Duplicate survey
exports.duplicateSurvey = asyncHandler(async (req, res) => {
  const survey = await Survey.findById(req.params.id);

  if (!survey) {
    throw new ApiError(404, 'Survey not found');
  }

  const duplicated = await survey.duplicate();

  logger.info(`Survey duplicated: ${survey._id} -> ${duplicated._id}`);

  res.status(201).json({
    success: true,
    data: duplicated
  });
});

// Create new version
exports.createVersion = asyncHandler(async (req, res) => {
  const survey = await Survey.findById(req.params.id);

  if (!survey) {
    throw new ApiError(404, 'Survey not found');
  }

  const newVersion = await survey.createVersion();

  logger.info(`Survey version created: ${survey._id} -> ${newVersion._id} (v${newVersion.version})`);

  res.status(201).json({
    success: true,
    data: newVersion
  });
});

// Update survey status
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const survey = await Survey.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!survey) {
    throw new ApiError(404, 'Survey not found');
  }

  logger.info(`Survey status updated: ${survey._id} -> ${status}`);

  res.json({
    success: true,
    data: survey
  });
});

// Get survey statistics
exports.getSurveyStats = asyncHandler(async (req, res) => {
  const stats = await Survey.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const totalResponses = await Survey.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: '$responseCount' }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      byStatus: stats,
      totalResponses: totalResponses[0]?.total || 0
    }
  });
});

const Response = require('../models/Response');
const { ApiError, asyncHandler } = require('../../../../shared/utils/errorHandler');
const createLogger = require('../../../../shared/utils/logger');
const { publishEvent } = require('../kafka/producer');
const config = require('../../../../shared/config/config');
const axios = require('axios');

const logger = createLogger('response-controller');

// Validate survey exists
const validateSurvey = async (surveyId) => {
  try {
    const surveyServiceUrl = process.env.SURVEY_SERVICE_URL || config.services.survey;
    const response = await axios.get(`${surveyServiceUrl}/api/v1/surveys/${surveyId}`);
    return response.data.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new ApiError(404, 'Survey not found');
    }
    throw new ApiError(500, 'Error validating survey');
  }
};

// Create partial response (draft)
exports.createPartialResponse = asyncHandler(async (req, res) => {
  const { surveyId, answers, respondent } = req.body;

  const survey = await validateSurvey(surveyId);

  const response = new Response({
    surveyId,
    surveyTitle: survey.title,
    surveyVersion: survey.version,
    answers,
    status: 'draft',
    respondent,
    metadata: {
      startedAt: new Date(),
      source: req.headers['x-source'] || 'web',
      referrer: req.headers.referer
    },
    isAnonymous: !respondent?.userId
  });

  await response.save();

  logger.info(`Partial response created: ${response._id}`);

  res.status(201).json({
    success: true,
    data: response
  });
});

// Submit response
exports.submitResponse = asyncHandler(async (req, res) => {
  const { surveyId, answers, respondent } = req.body;

  const survey = await validateSurvey(surveyId);

  // Check survey status
  if (survey.status !== 'active') {
    throw new ApiError(400, 'Survey is not active');
  }

  // Check if survey has ended
  if (survey.settings?.endDate && new Date(survey.settings.endDate) < new Date()) {
    throw new ApiError(400, 'Survey has ended');
  }

  // Check max responses
  if (survey.settings?.maxResponses && survey.responseCount >= survey.settings.maxResponses) {
    throw new ApiError(400, 'Survey has reached maximum responses');
  }

  // Validate required questions
  const requiredQuestions = survey.questions.filter(q => q.required);
  const answeredQuestionIds = answers.map(a => a.questionId.toString());

  const missingRequired = requiredQuestions.filter(
    q => !answeredQuestionIds.includes(q._id.toString())
  );

  if (missingRequired.length > 0) {
    throw new ApiError(400, 'Missing required questions', {
      missingQuestions: missingRequired.map(q => ({ id: q._id, question: q.question }))
    });
  }

  const response = new Response({
    surveyId,
    surveyTitle: survey.title,
    surveyVersion: survey.version,
    answers,
    respondent: {
      ...respondent,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    },
    metadata: {
      startedAt: new Date(),
      submittedAt: new Date(),
      source: req.headers['x-source'] || 'web',
      referrer: req.headers.referer
    },
    isAnonymous: !respondent?.userId
  });

  await response.submit();

  // Publish event to Kafka
  await publishEvent(config.kafka.topics.RESPONSE_SUBMITTED, {
    id: response._id.toString(),
    surveyId: surveyId.toString(),
    timestamp: new Date().toISOString(),
    isAnonymous: response.isAnonymous
  });

  logger.info(`Response submitted: ${response._id}`);

  res.status(201).json({
    success: true,
    data: response,
    message: survey.settings?.thankYouMessage || 'Thank you for your response!'
  });
});

// Update partial response
exports.updateResponse = asyncHandler(async (req, res) => {
  const { answers } = req.body;

  const response = await Response.findById(req.params.id);

  if (!response) {
    throw new ApiError(404, 'Response not found');
  }

  if (response.status !== 'draft') {
    throw new ApiError(400, 'Can only update draft responses');
  }

  response.answers = answers;
  await response.save();

  // Publish event to Kafka
  await publishEvent(config.kafka.topics.RESPONSE_UPDATED, {
    id: response._id.toString(),
    surveyId: response.surveyId.toString(),
    timestamp: new Date().toISOString()
  });

  logger.info(`Response updated: ${response._id}`);

  res.json({
    success: true,
    data: response
  });
});

// Get all responses
exports.getAllResponses = asyncHandler(async (req, res) => {
  const { surveyId, status, page = 1, limit = 10, startDate, endDate } = req.query;

  const query = { status: { $ne: 'deleted' } };

  if (surveyId) query.surveyId = surveyId;
  if (status) query.status = status;

  if (startDate || endDate) {
    query['metadata.submittedAt'] = {};
    if (startDate) query['metadata.submittedAt'].$gte = new Date(startDate);
    if (endDate) query['metadata.submittedAt'].$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const responses = await Response.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Response.countDocuments(query);

  res.json({
    success: true,
    data: responses,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Get response by ID
exports.getResponseById = asyncHandler(async (req, res) => {
  const response = await Response.findById(req.params.id);

  if (!response || response.status === 'deleted') {
    throw new ApiError(404, 'Response not found');
  }

  res.json({
    success: true,
    data: response
  });
});

// Delete response (soft delete)
exports.deleteResponse = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const response = await Response.findById(req.params.id);

  if (!response) {
    throw new ApiError(404, 'Response not found');
  }

  await response.softDelete('admin', reason);

  logger.info(`Response deleted: ${response._id}`);

  res.json({
    success: true,
    message: 'Response deleted successfully'
  });
});

// Get response statistics
exports.getResponseStats = asyncHandler(async (req, res) => {
  const { surveyId } = req.query;

  const query = surveyId ? { surveyId } : {};

  const stats = await Response.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const avgDuration = await Response.aggregate([
    { $match: { ...query, status: 'submitted' } },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$metadata.duration' }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      byStatus: stats,
      averageDuration: avgDuration[0]?.avgDuration || 0
    }
  });
});

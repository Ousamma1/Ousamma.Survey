const QuestionBank = require('../models/QuestionBank');
const { ApiError, asyncHandler } = require('../../../../shared/utils/errorHandler');
const createLogger = require('../../../../shared/utils/logger');

const logger = createLogger('question-controller');

// Create question in bank
exports.createQuestion = asyncHandler(async (req, res) => {
  const question = new QuestionBank(req.body);
  await question.save();

  logger.info(`Question created in bank: ${question._id}`);

  res.status(201).json({
    success: true,
    data: question
  });
});

// Get all questions from bank
exports.getAllQuestions = asyncHandler(async (req, res) => {
  const { category, type, tags, page = 1, limit = 20 } = req.query;

  const query = {};
  if (category) query.category = category;
  if (type) query.type = type;
  if (tags) query.tags = { $in: tags.split(',') };

  const skip = (page - 1) * limit;

  const questions = await QuestionBank.find(query)
    .sort({ usageCount: -1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await QuestionBank.countDocuments(query);

  res.json({
    success: true,
    data: questions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Get question by ID
exports.getQuestionById = asyncHandler(async (req, res) => {
  const question = await QuestionBank.findById(req.params.id);

  if (!question) {
    throw new ApiError(404, 'Question not found');
  }

  res.json({
    success: true,
    data: question
  });
});

// Update question
exports.updateQuestion = asyncHandler(async (req, res) => {
  const question = await QuestionBank.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!question) {
    throw new ApiError(404, 'Question not found');
  }

  logger.info(`Question updated: ${question._id}`);

  res.json({
    success: true,
    data: question
  });
});

// Delete question
exports.deleteQuestion = asyncHandler(async (req, res) => {
  const question = await QuestionBank.findByIdAndDelete(req.params.id);

  if (!question) {
    throw new ApiError(404, 'Question not found');
  }

  logger.info(`Question deleted: ${question._id}`);

  res.json({
    success: true,
    message: 'Question deleted successfully'
  });
});

// Get categories
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await QuestionBank.distinct('category');

  res.json({
    success: true,
    data: categories
  });
});

const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

const surveyValidators = {
  create: [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional(),
    body('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
    body('questions.*.type').isIn(['multiple_choice', 'checkbox', 'text', 'textarea', 'dropdown', 'rating', 'date']).withMessage('Invalid question type'),
    body('questions.*.question').notEmpty().withMessage('Question text is required'),
    body('status').optional().isIn(['draft', 'active', 'closed']).withMessage('Invalid status'),
    validate
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid survey ID'),
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('questions').optional().isArray({ min: 1 }).withMessage('At least one question is required'),
    body('status').optional().isIn(['draft', 'active', 'closed']).withMessage('Invalid status'),
    validate
  ],
  getById: [
    param('id').isMongoId().withMessage('Invalid survey ID'),
    validate
  ]
};

const responseValidators = {
  submit: [
    body('surveyId').isMongoId().withMessage('Invalid survey ID'),
    body('answers').isArray({ min: 1 }).withMessage('At least one answer is required'),
    body('answers.*.questionId').notEmpty().withMessage('Question ID is required'),
    body('answers.*.value').exists().withMessage('Answer value is required'),
    validate
  ],
  getById: [
    param('id').isMongoId().withMessage('Invalid response ID'),
    validate
  ]
};

const templateValidators = {
  create: [
    body('name').notEmpty().withMessage('Template name is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('template').isObject().withMessage('Template data is required'),
    validate
  ]
};

const fileValidators = {
  getById: [
    param('id').isMongoId().withMessage('Invalid file ID'),
    validate
  ]
};

module.exports = {
  validate,
  surveyValidators,
  responseValidators,
  templateValidators,
  fileValidators
};

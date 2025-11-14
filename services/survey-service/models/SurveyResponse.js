const mongoose = require('mongoose');

/**
 * SurveyResponse Model - Stores individual survey responses
 * Supports save/resume, partial responses, file uploads, signatures, location
 */

const AnswerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  questionType: String,
  value: mongoose.Schema.Types.Mixed, // can be string, number, array, object

  // For file uploads
  files: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: Date
  }],

  // For signature capture
  signature: {
    dataUrl: String, // base64 encoded image
    timestamp: Date
  },

  // For location capture
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number], // [longitude, latitude]
    accuracy: Number,
    timestamp: Date,
    address: {
      country: String,
      city: String,
      state: String,
      postalCode: String,
      formatted: String
    }
  },

  // Metadata
  answeredAt: {
    type: Date,
    default: Date.now
  },
  timeSpent: Number // seconds spent on this question
}, { _id: false });

const SurveyResponseSchema = new mongoose.Schema({
  // Response ID
  responseId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Survey reference
  surveyId: {
    type: String,
    required: true,
    index: true
  },

  // User information
  userId: String, // null for anonymous
  userName: String,
  userEmail: String,

  // Answers
  answers: [AnswerSchema],

  // Completion status
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress',
    index: true
  },
  isComplete: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  completionTime: Number, // total seconds to complete

  // Progress tracking
  progress: {
    currentSectionId: String,
    currentQuestionId: String,
    questionsAnswered: { type: Number, default: 0 },
    totalQuestions: Number,
    percentage: { type: Number, default: 0 }
  },

  // Save and resume
  saveToken: {
    type: String,
    index: true,
    sparse: true
  },
  lastSavedAt: Date,
  resumeCount: { type: Number, default: 0 },

  // Distribution tracking
  source: {
    linkId: String,
    accessCode: String,
    referrer: String,
    campaign: String,
    medium: String
  },

  // Device and browser info
  metadata: {
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet']
    },
    browser: String,
    browserVersion: String,
    os: String,
    osVersion: String,
    userAgent: String,
    screenResolution: String,
    language: String,
    timezone: String
  },

  // IP and location (general)
  ipAddress: String,
  geoLocation: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number],
    country: String,
    city: String,
    region: String
  },

  // Timestamps
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: Date,

  // Validation
  validationErrors: [{
    questionId: String,
    error: String,
    timestamp: Date
  }],

  // Flags
  isTest: {
    type: Boolean,
    default: false
  },
  flagged: {
    type: Boolean,
    default: false
  },
  flagReason: String,

  // Offline support
  offline: {
    wasOffline: { type: Boolean, default: false },
    syncedAt: Date,
    conflicts: [String] // question IDs with conflicts
  }
}, {
  timestamps: true,
  collection: 'survey_responses'
});

// Indexes
SurveyResponseSchema.index({ surveyId: 1, userId: 1 });
SurveyResponseSchema.index({ surveyId: 1, status: 1, createdAt: -1 });
SurveyResponseSchema.index({ saveToken: 1 }, { sparse: true });
SurveyResponseSchema.index({ submittedAt: 1 });
SurveyResponseSchema.index({ 'source.linkId': 1 });
SurveyResponseSchema.index({ geoLocation: '2dsphere' }); // for geospatial queries

// Methods

/**
 * Add or update an answer
 */
SurveyResponseSchema.methods.setAnswer = function(questionId, value, metadata = {}) {
  const existingIndex = this.answers.findIndex(a => a.questionId === questionId);

  const answer = {
    questionId,
    value,
    questionType: metadata.questionType,
    answeredAt: new Date(),
    timeSpent: metadata.timeSpent
  };

  // Handle file uploads
  if (metadata.files) {
    answer.files = metadata.files;
  }

  // Handle signature
  if (metadata.signature) {
    answer.signature = metadata.signature;
  }

  // Handle location
  if (metadata.location) {
    answer.location = metadata.location;
  }

  if (existingIndex >= 0) {
    this.answers[existingIndex] = answer;
  } else {
    this.answers.push(answer);
  }

  this.updateProgress();
};

/**
 * Get answer for a question
 */
SurveyResponseSchema.methods.getAnswer = function(questionId) {
  const answer = this.answers.find(a => a.questionId === questionId);
  return answer ? answer.value : null;
};

/**
 * Update progress calculation
 */
SurveyResponseSchema.methods.updateProgress = function(totalQuestions = null) {
  this.progress.questionsAnswered = this.answers.length;

  if (totalQuestions) {
    this.progress.totalQuestions = totalQuestions;
    this.progress.percentage = Math.round((this.answers.length / totalQuestions) * 100);
  }

  this.lastSavedAt = new Date();
};

/**
 * Mark as complete
 */
SurveyResponseSchema.methods.complete = function() {
  this.status = 'completed';
  this.isComplete = true;
  this.completedAt = new Date();
  this.submittedAt = new Date();

  if (this.startedAt) {
    this.completionTime = Math.round((this.completedAt - this.startedAt) / 1000); // seconds
  }

  this.progress.percentage = 100;
};

/**
 * Generate save token for resume
 */
SurveyResponseSchema.methods.generateSaveToken = function() {
  const crypto = require('crypto');
  this.saveToken = crypto.randomBytes(16).toString('hex');
  this.lastSavedAt = new Date();
  return this.saveToken;
};

/**
 * Validate response against survey rules
 */
SurveyResponseSchema.methods.validate = async function(survey) {
  const errors = [];

  for (const question of survey.questions) {
    const answer = this.getAnswer(question.questionId);

    // Check required questions
    if (question.required && !answer) {
      errors.push({
        questionId: question.questionId,
        error: 'This question is required',
        timestamp: new Date()
      });
      continue;
    }

    if (!answer) continue;

    // Validate based on question validation rules
    if (question.validation) {
      const { minLength, maxLength, minValue, maxValue, pattern } = question.validation;

      if (minLength && String(answer).length < minLength) {
        errors.push({
          questionId: question.questionId,
          error: `Minimum length is ${minLength}`,
          timestamp: new Date()
        });
      }

      if (maxLength && String(answer).length > maxLength) {
        errors.push({
          questionId: question.questionId,
          error: `Maximum length is ${maxLength}`,
          timestamp: new Date()
        });
      }

      if (minValue !== undefined && Number(answer) < minValue) {
        errors.push({
          questionId: question.questionId,
          error: `Minimum value is ${minValue}`,
          timestamp: new Date()
        });
      }

      if (maxValue !== undefined && Number(answer) > maxValue) {
        errors.push({
          questionId: question.questionId,
          error: `Maximum value is ${maxValue}`,
          timestamp: new Date()
        });
      }

      if (pattern && !new RegExp(pattern).test(String(answer))) {
        errors.push({
          questionId: question.questionId,
          error: 'Answer does not match required format',
          timestamp: new Date()
        });
      }
    }
  }

  this.validationErrors = errors;
  return errors.length === 0;
};

/**
 * Get response summary for analytics
 */
SurveyResponseSchema.methods.getSummary = function() {
  return {
    responseId: this.responseId,
    surveyId: this.surveyId,
    status: this.status,
    isComplete: this.isComplete,
    progress: this.progress.percentage,
    answersCount: this.answers.length,
    completionTime: this.completionTime,
    startedAt: this.startedAt,
    completedAt: this.completedAt,
    device: this.metadata.device,
    location: this.geoLocation
  };
};

// Static methods

/**
 * Find response by save token
 */
SurveyResponseSchema.statics.findBySaveToken = function(token) {
  return this.findOne({ saveToken: token, status: 'in_progress' });
};

/**
 * Find user's responses for a survey
 */
SurveyResponseSchema.statics.findUserResponses = function(surveyId, userId) {
  return this.find({ surveyId, userId }).sort({ createdAt: -1 });
};

/**
 * Get completion rate for a survey
 */
SurveyResponseSchema.statics.getCompletionRate = async function(surveyId) {
  const total = await this.countDocuments({ surveyId });
  const completed = await this.countDocuments({ surveyId, isComplete: true });

  return total > 0 ? (completed / total) * 100 : 0;
};

/**
 * Get average completion time
 */
SurveyResponseSchema.statics.getAverageCompletionTime = async function(surveyId) {
  const result = await this.aggregate([
    { $match: { surveyId, isComplete: true, completionTime: { $exists: true } } },
    { $group: { _id: null, avgTime: { $avg: '$completionTime' } } }
  ]);

  return result.length > 0 ? Math.round(result[0].avgTime) : null;
};

/**
 * Get responses by date range
 */
SurveyResponseSchema.statics.getByDateRange = function(surveyId, startDate, endDate) {
  return this.find({
    surveyId,
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ createdAt: -1 });
};

/**
 * Clean up abandoned responses (older than X days)
 */
SurveyResponseSchema.statics.cleanupAbandoned = async function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await this.updateMany(
    {
      status: 'in_progress',
      lastSavedAt: { $lt: cutoffDate }
    },
    {
      $set: { status: 'abandoned' }
    }
  );

  return result.modifiedCount;
};

module.exports = mongoose.model('SurveyResponse', SurveyResponseSchema);

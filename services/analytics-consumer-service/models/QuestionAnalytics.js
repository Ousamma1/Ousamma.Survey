const mongoose = require('mongoose');

/**
 * Question Analytics Schema
 * Stores aggregated analytics data for individual questions
 */
const questionAnalyticsSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
    index: true
  },
  surveyId: {
    type: String,
    required: true,
    index: true
  },
  questionType: {
    type: String,
    enum: ['text', 'multiple_choice', 'rating', 'scale', 'boolean', 'date', 'number'],
    required: true
  },
  responseCount: {
    type: Number,
    default: 0,
    min: 0
  },
  valueDistribution: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    comment: 'Distribution of response values'
  },
  statistics: {
    mean: {
      type: Number,
      default: null
    },
    median: {
      type: Number,
      default: null
    },
    mode: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    stdDev: {
      type: Number,
      default: null,
      comment: 'Standard deviation'
    },
    variance: {
      type: Number,
      default: null
    },
    min: {
      type: Number,
      default: null
    },
    max: {
      type: Number,
      default: null
    },
    percentiles: {
      p25: { type: Number, default: null },
      p50: { type: Number, default: null },
      p75: { type: Number, default: null },
      p90: { type: Number, default: null },
      p95: { type: Number, default: null },
      p99: { type: Number, default: null }
    }
  },
  textAnalytics: {
    averageLength: { type: Number, default: 0 },
    totalWords: { type: Number, default: 0 },
    commonWords: { type: Map, of: Number, default: new Map() },
    sentiment: {
      positive: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      negative: { type: Number, default: 0 }
    }
  },
  responseTime: {
    average: { type: Number, default: 0 },
    median: { type: Number, default: 0 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 }
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'question_analytics'
});

// Compound indexes for efficient querying
questionAnalyticsSchema.index({ surveyId: 1, questionId: 1 }, { unique: true });
questionAnalyticsSchema.index({ surveyId: 1, responseCount: -1 });
questionAnalyticsSchema.index({ questionType: 1 });

// Instance method to increment response count
questionAnalyticsSchema.methods.incrementResponses = function(count = 1) {
  this.responseCount += count;
  this.lastUpdated = new Date();
};

// Instance method to update value distribution
questionAnalyticsSchema.methods.updateDistribution = function(value) {
  if (!this.valueDistribution) {
    this.valueDistribution = {};
  }
  const key = String(value);
  this.valueDistribution[key] = (this.valueDistribution[key] || 0) + 1;
  this.markModified('valueDistribution');
};

// Static method to find by survey
questionAnalyticsSchema.statics.findBySurvey = function(surveyId) {
  return this.find({ surveyId }).sort({ questionId: 1 });
};

// Static method to find by question
questionAnalyticsSchema.statics.findByQuestion = function(surveyId, questionId) {
  return this.findOne({ surveyId, questionId });
};

// Static method to get questions with most responses
questionAnalyticsSchema.statics.findTopQuestions = function(surveyId, limit = 10) {
  return this.find({ surveyId })
    .sort({ responseCount: -1 })
    .limit(limit);
};

// Pre-save hook
questionAnalyticsSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Virtual for response percentage
questionAnalyticsSchema.virtual('responseRate').get(function() {
  // This would need the total survey responses to calculate
  return this.responseCount;
});

// Ensure virtuals are included in JSON
questionAnalyticsSchema.set('toJSON', { virtuals: true });
questionAnalyticsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('QuestionAnalytics', questionAnalyticsSchema);

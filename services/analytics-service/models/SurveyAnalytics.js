const mongoose = require('mongoose');

/**
 * Survey Analytics Schema
 * Stores aggregated analytics data for surveys
 */
const surveyAnalyticsSchema = new mongoose.Schema({
  surveyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  totalResponses: {
    type: Number,
    default: 0,
    min: 0
  },
  completionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  averageTime: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Average completion time in seconds'
  },
  dropOffPoints: [{
    questionId: {
      type: String,
      required: true
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  }],
  demographics: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  locationDistribution: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    comment: 'Geographic distribution of responses'
  },
  deviceDistribution: {
    desktop: { type: Number, default: 0 },
    mobile: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 }
  },
  timeBasedTrends: {
    hourly: { type: Map, of: Number, default: new Map() },
    daily: { type: Map, of: Number, default: new Map() },
    weekly: { type: Map, of: Number, default: new Map() }
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'survey_analytics'
});

// Indexes for efficient querying
surveyAnalyticsSchema.index({ surveyId: 1, lastUpdated: -1 });
surveyAnalyticsSchema.index({ totalResponses: -1 });
surveyAnalyticsSchema.index({ completionRate: -1 });

// Instance method to update analytics
surveyAnalyticsSchema.methods.incrementResponses = function(count = 1) {
  this.totalResponses += count;
  this.lastUpdated = new Date();
};

// Instance method to calculate completion rate
surveyAnalyticsSchema.methods.calculateCompletionRate = function(completedCount) {
  if (this.totalResponses > 0) {
    this.completionRate = (completedCount / this.totalResponses) * 100;
  }
  return this.completionRate;
};

// Static method to find recent analytics
surveyAnalyticsSchema.statics.findRecent = function(limit = 10) {
  return this.find()
    .sort({ lastUpdated: -1 })
    .limit(limit);
};

// Static method to find by survey ID
surveyAnalyticsSchema.statics.findBySurveyId = function(surveyId) {
  return this.findOne({ surveyId });
};

// Static method to get top surveys by responses
surveyAnalyticsSchema.statics.findTopSurveys = function(limit = 10) {
  return this.find()
    .sort({ totalResponses: -1 })
    .limit(limit);
};

// Pre-save hook to update lastUpdated
surveyAnalyticsSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Virtual for response rate per day
surveyAnalyticsSchema.virtual('responsesPerDay').get(function() {
  if (!this.createdAt) return 0;
  const daysActive = Math.max(1, Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
  return Math.round(this.totalResponses / daysActive);
});

// Ensure virtuals are included in JSON
surveyAnalyticsSchema.set('toJSON', { virtuals: true });
surveyAnalyticsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SurveyAnalytics', surveyAnalyticsSchema);

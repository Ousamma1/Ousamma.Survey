const mongoose = require('mongoose');

/**
 * Response Event Schema
 * Stores individual response events for time-series analysis
 */
const responseEventSchema = new mongoose.Schema({
  surveyId: {
    type: String,
    required: true,
    index: true
  },
  responseId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    index: true
  },
  responses: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  metadata: {
    device: String,
    browser: String,
    os: String,
    ipAddress: String,
    userAgent: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    country: String,
    city: String
  },
  completionTime: {
    type: Number,
    default: 0,
    comment: 'Time to complete in seconds'
  },
  isComplete: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'response_events',
  timeseries: {
    timeField: 'timestamp',
    metaField: 'surveyId',
    granularity: 'hours'
  }
});

// Geospatial index for location-based queries
responseEventSchema.index({ location: '2dsphere' });

// Compound indexes
responseEventSchema.index({ surveyId: 1, timestamp: -1 });
responseEventSchema.index({ userId: 1, timestamp: -1 });
responseEventSchema.index({ isComplete: 1, surveyId: 1 });

// Static method to find by survey and date range
responseEventSchema.statics.findByDateRange = function(surveyId, startDate, endDate) {
  return this.find({
    surveyId,
    timestamp: { $gte: startDate, $lte: endDate }
  }).sort({ timestamp: -1 });
};

// Static method to get completion rate
responseEventSchema.statics.getCompletionRate = async function(surveyId) {
  const total = await this.countDocuments({ surveyId });
  const completed = await this.countDocuments({ surveyId, isComplete: true });
  return total > 0 ? (completed / total) * 100 : 0;
};

module.exports = mongoose.model('ResponseEvent', responseEventSchema);

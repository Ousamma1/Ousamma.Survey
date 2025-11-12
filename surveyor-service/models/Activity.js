const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  surveyorId: {
    type: String,
    required: true,
    ref: 'Surveyor',
    index: true
  },
  activityType: {
    type: String,
    enum: [
      'login',
      'logout',
      'location_checkin',
      'response_submission',
      'survey_view',
      'profile_update',
      'password_change',
      'assignment_view'
    ],
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Location data for location-based activities
  location: {
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
    accuracy: {
      type: Number
    },
    address: {
      type: String,
      trim: true
    }
  },
  // Related entities
  relatedSurveyId: {
    type: String,
    index: true
  },
  relatedAssignmentId: {
    type: String,
    index: true
  },
  relatedResponseId: {
    type: String
  },
  // Session information
  sessionId: {
    type: String,
    index: true
  },
  sessionDuration: {
    type: Number, // in seconds
    min: 0
  },
  // Device and browser info
  deviceInfo: {
    userAgent: String,
    platform: String,
    browser: String,
    os: String,
    ipAddress: String
  },
  // Additional data
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: false // We use timestamp field instead
});

// Static method to log activity
activitySchema.statics.logActivity = async function(data) {
  const { v4: uuidv4 } = require('uuid');

  const activity = new this({
    id: uuidv4(),
    ...data,
    timestamp: new Date()
  });

  return activity.save();
};

// Static method to get surveyor activities by date range
activitySchema.statics.findBySurveyorAndDateRange = function(surveyorId, startDate, endDate) {
  return this.find({
    surveyorId,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

// Static method to get daily activity summary
activitySchema.statics.getDailySummary = async function(surveyorId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const activities = await this.find({
    surveyorId,
    timestamp: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });

  // Calculate summary
  const summary = {
    date: date,
    totalActivities: activities.length,
    loginCount: 0,
    logoutCount: 0,
    locationCheckins: 0,
    responsesSubmitted: 0,
    surveysViewed: 0,
    firstActivity: null,
    lastActivity: null,
    totalSessionDuration: 0,
    activities: activities
  };

  activities.forEach(activity => {
    switch (activity.activityType) {
      case 'login':
        summary.loginCount++;
        break;
      case 'logout':
        summary.logoutCount++;
        break;
      case 'location_checkin':
        summary.locationCheckins++;
        break;
      case 'response_submission':
        summary.responsesSubmitted++;
        break;
      case 'survey_view':
        summary.surveysViewed++;
        break;
    }

    if (activity.sessionDuration) {
      summary.totalSessionDuration += activity.sessionDuration;
    }

    if (!summary.firstActivity || activity.timestamp < summary.firstActivity) {
      summary.firstActivity = activity.timestamp;
    }
    if (!summary.lastActivity || activity.timestamp > summary.lastActivity) {
      summary.lastActivity = activity.timestamp;
    }
  });

  return summary;
};

// Static method to get response submission locations
activitySchema.statics.getResponseLocations = function(surveyorId, surveyId) {
  return this.find({
    surveyorId,
    activityType: 'response_submission',
    relatedSurveyId: surveyId,
    'location.latitude': { $exists: true },
    'location.longitude': { $exists: true }
  }).select('location timestamp relatedResponseId');
};

// Static method to calculate time on survey
activitySchema.statics.calculateTimeOnSurvey = async function(surveyorId, surveyId, startDate, endDate) {
  const activities = await this.find({
    surveyorId,
    relatedSurveyId: surveyId,
    activityType: { $in: ['survey_view', 'response_submission'] },
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: 1 });

  let totalTime = 0;
  let sessionStart = null;

  activities.forEach((activity, index) => {
    if (activity.activityType === 'survey_view') {
      sessionStart = activity.timestamp;
    } else if (activity.activityType === 'response_submission' && sessionStart) {
      const duration = (activity.timestamp - sessionStart) / 1000; // in seconds
      if (duration > 0 && duration < 3600) { // Max 1 hour per session
        totalTime += duration;
      }
      sessionStart = null;
    }
  });

  return totalTime;
};

// Indexes for performance
activitySchema.index({ surveyorId: 1, timestamp: -1 });
activitySchema.index({ activityType: 1, timestamp: -1 });
activitySchema.index({ surveyorId: 1, activityType: 1, timestamp: -1 });
activitySchema.index({ relatedSurveyId: 1, timestamp: -1 });
activitySchema.index({ sessionId: 1 });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;

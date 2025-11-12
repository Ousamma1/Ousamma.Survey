const mongoose = require('mongoose');

/**
 * Survey Group Schema
 * Manages grouping of surveys within projects
 */
const surveyGroupSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: [true, 'Project ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    minlength: [3, 'Group name must be at least 3 characters'],
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  surveyIds: [{
    type: String
  }],
  createdBy: {
    type: String,
    required: true
  },
  metadata: {
    totalSurveys: {
      type: Number,
      default: 0,
      min: 0
    },
    totalResponses: {
      type: Number,
      default: 0,
      min: 0
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    }
  },
  settings: {
    color: {
      type: String,
      default: '#3B82F6'
    },
    icon: {
      type: String,
      default: 'folder'
    }
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true,
  collection: 'survey_groups'
});

// Indexes for efficient querying
surveyGroupSchema.index({ projectId: 1, status: 1 });
surveyGroupSchema.index({ projectId: 1, createdAt: -1 });
surveyGroupSchema.index({ 'surveyIds': 1 });
surveyGroupSchema.index({ name: 'text', description: 'text' });

// Instance method to add survey
surveyGroupSchema.methods.addSurvey = function(surveyId) {
  if (this.surveyIds.includes(surveyId)) {
    throw new Error('Survey is already in this group');
  }

  this.surveyIds.push(surveyId);
  this.metadata.totalSurveys = this.surveyIds.length;
  this.metadata.lastActivityAt = new Date();
};

// Instance method to remove survey
surveyGroupSchema.methods.removeSurvey = function(surveyId) {
  const initialLength = this.surveyIds.length;
  this.surveyIds = this.surveyIds.filter(id => id !== surveyId);

  if (this.surveyIds.length === initialLength) {
    throw new Error('Survey not found in group');
  }

  this.metadata.totalSurveys = this.surveyIds.length;
  this.metadata.lastActivityAt = new Date();
};

// Instance method to check if survey exists
surveyGroupSchema.methods.hasSurvey = function(surveyId) {
  return this.surveyIds.includes(surveyId);
};

// Static method to find groups by project
surveyGroupSchema.statics.findByProject = function(projectId, status = 'active') {
  return this.find({ projectId, status }).sort({ createdAt: -1 });
};

// Static method to find groups containing a survey
surveyGroupSchema.statics.findBySurvey = function(surveyId) {
  return this.find({
    surveyIds: surveyId,
    status: 'active'
  });
};

// Static method to get group with analytics
surveyGroupSchema.statics.findByIdWithAnalytics = async function(groupId) {
  const group = await this.findById(groupId);
  if (!group) return null;

  // This will be populated with actual analytics from analytics service
  return group;
};

// Pre-save hook to update metadata
surveyGroupSchema.pre('save', function(next) {
  if (this.isModified('surveyIds')) {
    this.metadata.totalSurveys = this.surveyIds.length;
    this.metadata.lastActivityAt = new Date();
  }
  next();
});

// Virtual for survey count
surveyGroupSchema.virtual('surveyCount').get(function() {
  return this.surveyIds ? this.surveyIds.length : 0;
});

// Ensure virtuals are included in JSON
surveyGroupSchema.set('toJSON', { virtuals: true });
surveyGroupSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SurveyGroup', surveyGroupSchema);

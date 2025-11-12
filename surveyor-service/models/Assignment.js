const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
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
  surveyId: {
    type: String,
    required: true,
    index: true
  },
  territoryId: {
    type: String,
    trim: true
  },
  targetResponses: {
    type: Number,
    required: true,
    min: 1
  },
  achievedResponses: {
    type: Number,
    default: 0,
    min: 0
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  // Additional tracking fields
  assignedBy: {
    type: String,
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Calculate progress percentage
assignmentSchema.virtual('progressPercentage').get(function() {
  if (this.targetResponses === 0) return 0;
  return Math.min(100, Math.round((this.achievedResponses / this.targetResponses) * 100));
});

// Calculate remaining responses
assignmentSchema.virtual('remainingResponses').get(function() {
  return Math.max(0, this.targetResponses - this.achievedResponses);
});

// Check if assignment is overdue
assignmentSchema.virtual('isOverdue').get(function() {
  return new Date() > this.endDate && this.status !== 'completed' && this.status !== 'cancelled';
});

// Method to increment achieved responses
assignmentSchema.methods.incrementResponses = async function(count = 1) {
  this.achievedResponses += count;

  // Auto-complete if target reached
  if (this.achievedResponses >= this.targetResponses && this.status === 'active') {
    this.status = 'completed';
    this.completedAt = new Date();
  }

  return this.save();
};

// Method to cancel assignment
assignmentSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  if (reason) {
    this.cancellationReason = reason;
  }
  return this.save();
};

// Method to activate assignment
assignmentSchema.methods.activate = function() {
  if (this.status === 'pending') {
    this.status = 'active';
  }
  return this.save();
};

// Static method to find active assignments for a surveyor
assignmentSchema.statics.findActiveBySurveyor = function(surveyorId) {
  return this.find({
    surveyorId,
    status: 'active',
    endDate: { $gte: new Date() }
  }).sort({ startDate: 1 });
};

// Static method to find overdue assignments
assignmentSchema.statics.findOverdue = function() {
  return this.find({
    status: 'active',
    endDate: { $lt: new Date() }
  });
};

// Static method to get assignments by survey
assignmentSchema.statics.findBySurvey = function(surveyId) {
  return this.find({ surveyId }).sort({ assignedAt: -1 });
};

// Indexes for common queries
assignmentSchema.index({ surveyorId: 1, status: 1 });
assignmentSchema.index({ surveyId: 1, status: 1 });
assignmentSchema.index({ status: 1, endDate: 1 });
assignmentSchema.index({ assignedBy: 1, assignedAt: -1 });

// Ensure virtuals are included in JSON
assignmentSchema.set('toJSON', { virtuals: true });
assignmentSchema.set('toObject', { virtuals: true });

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const surveyorSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  temporaryPassword: {
    type: String,
    required: true
  },
  hasChangedPassword: {
    type: Boolean,
    default: false
  },
  expirationDate: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active',
    index: true
  },
  assignedSurveys: [{
    type: String,
    ref: 'Assignment'
  }],
  assignedTerritories: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date
  },
  // Additional fields for enhanced functionality
  region: {
    type: String,
    trim: true
  },
  languages: [{
    type: String,
    trim: true
  }],
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

// Hash password before saving
surveyorSchema.pre('save', async function(next) {
  if (!this.isModified('temporaryPassword')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.temporaryPassword = await bcrypt.hash(this.temporaryPassword, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
surveyorSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.temporaryPassword);
  } catch (error) {
    throw error;
  }
};

// Method to check if account is expired
surveyorSchema.methods.isExpired = function() {
  return new Date() > this.expirationDate;
};

// Method to extend expiration
surveyorSchema.methods.extendExpiration = function(days) {
  const newExpirationDate = new Date(this.expirationDate);
  newExpirationDate.setDate(newExpirationDate.getDate() + days);
  this.expirationDate = newExpirationDate;

  // Reactivate if was expired
  if (this.status === 'expired') {
    this.status = 'active';
  }

  return this.save();
};

// Static method to find active surveyors
surveyorSchema.statics.findActive = function() {
  return this.find({ status: 'active', expirationDate: { $gt: new Date() } });
};

// Static method to find expired surveyors
surveyorSchema.statics.findExpired = function() {
  return this.find({
    status: { $ne: 'inactive' },
    expirationDate: { $lte: new Date() }
  });
};

// Index for common queries
surveyorSchema.index({ status: 1, expirationDate: 1 });
surveyorSchema.index({ createdBy: 1, createdAt: -1 });
surveyorSchema.index({ email: 1, status: 1 });

const Surveyor = mongoose.model('Surveyor', surveyorSchema);

module.exports = Surveyor;

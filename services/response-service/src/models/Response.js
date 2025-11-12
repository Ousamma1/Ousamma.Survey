const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  question: String,
  type: String,
  value: mongoose.Schema.Types.Mixed,
  fileIds: [mongoose.Schema.Types.ObjectId]
}, { _id: false });

const ResponseSchema = new mongoose.Schema({
  surveyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  surveyTitle: String,
  surveyVersion: Number,
  answers: [AnswerSchema],
  status: {
    type: String,
    enum: ['draft', 'submitted', 'deleted'],
    default: 'draft',
    index: true
  },
  respondent: {
    userId: String,
    email: String,
    ipAddress: String,
    userAgent: String
  },
  metadata: {
    startedAt: Date,
    submittedAt: Date,
    duration: Number, // in seconds
    source: String,
    referrer: String
  },
  isAnonymous: {
    type: Boolean,
    default: true
  },
  deletedAt: Date,
  deletedBy: String,
  deleteReason: String
}, {
  timestamps: true
});

// Indexes
ResponseSchema.index({ surveyId: 1, createdAt: -1 });
ResponseSchema.index({ 'respondent.userId': 1 });
ResponseSchema.index({ 'respondent.email': 1 });
ResponseSchema.index({ status: 1 });
ResponseSchema.index({ 'metadata.submittedAt': -1 });

// Methods
ResponseSchema.methods.softDelete = function(deletedBy, reason) {
  this.status = 'deleted';
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.deleteReason = reason;
  return this.save();
};

ResponseSchema.methods.submit = function() {
  this.status = 'submitted';
  this.metadata.submittedAt = new Date();

  if (this.metadata.startedAt) {
    const duration = Math.floor((this.metadata.submittedAt - this.metadata.startedAt) / 1000);
    this.metadata.duration = duration;
  }

  return this.save();
};

module.exports = mongoose.model('Response', ResponseSchema);

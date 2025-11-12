const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple_choice', 'checkbox', 'text', 'textarea', 'dropdown', 'rating', 'date', 'file'],
    required: true
  },
  question: {
    type: String,
    required: true
  },
  question_ar: String,
  description: String,
  required: {
    type: Boolean,
    default: false
  },
  options: [String],
  options_ar: [String],
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    minLength: Number,
    maxLength: Number
  },
  conditionalLogic: {
    dependsOn: mongoose.Schema.Types.ObjectId,
    condition: String,
    value: mongoose.Schema.Types.Mixed
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: true });

const SurveySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  title_ar: String,
  description: String,
  description_ar: String,
  questions: [QuestionSchema],
  status: {
    type: String,
    enum: ['draft', 'active', 'closed', 'archived'],
    default: 'draft'
  },
  settings: {
    allowAnonymous: {
      type: Boolean,
      default: true
    },
    allowMultipleResponses: {
      type: Boolean,
      default: false
    },
    showProgressBar: {
      type: Boolean,
      default: true
    },
    randomizeQuestions: {
      type: Boolean,
      default: false
    },
    requireLogin: {
      type: Boolean,
      default: false
    },
    startDate: Date,
    endDate: Date,
    maxResponses: Number,
    thankYouMessage: String,
    thankYouMessage_ar: String,
    redirectUrl: String
  },
  version: {
    type: Number,
    default: 1
  },
  parentSurvey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey'
  },
  createdBy: {
    type: String,
    default: 'system'
  },
  tags: [String],
  category: String,
  responseCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
SurveySchema.index({ status: 1, createdAt: -1 });
SurveySchema.index({ createdBy: 1 });
SurveySchema.index({ tags: 1 });
SurveySchema.index({ category: 1 });

// Methods
SurveySchema.methods.duplicate = async function() {
  const duplicated = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    title: `${this.title} (Copy)`,
    status: 'draft',
    parentSurvey: this._id,
    responseCount: 0,
    createdAt: undefined,
    updatedAt: undefined
  });
  return duplicated.save();
};

SurveySchema.methods.createVersion = async function() {
  const newVersion = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    version: this.version + 1,
    parentSurvey: this._id,
    status: 'draft',
    responseCount: 0,
    createdAt: undefined,
    updatedAt: undefined
  });
  return newVersion.save();
};

module.exports = mongoose.model('Survey', SurveySchema);

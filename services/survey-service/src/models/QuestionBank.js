const mongoose = require('mongoose');

const QuestionBankSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  question_ar: String,
  type: {
    type: String,
    enum: ['multiple_choice', 'checkbox', 'text', 'textarea', 'dropdown', 'rating', 'date', 'file'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  tags: [String],
  options: [String],
  options_ar: [String],
  defaultValidation: {
    min: Number,
    max: Number,
    pattern: String,
    minLength: Number,
    maxLength: Number
  },
  usageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true
});

// Indexes
QuestionBankSchema.index({ category: 1 });
QuestionBankSchema.index({ tags: 1 });
QuestionBankSchema.index({ type: 1 });

module.exports = mongoose.model('QuestionBank', QuestionBankSchema);

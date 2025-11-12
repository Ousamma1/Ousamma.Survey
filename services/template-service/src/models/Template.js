const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  name_ar: String,
  description: {
    type: String,
    required: true
  },
  description_ar: String,
  category: {
    type: String,
    required: true,
    index: true
  },
  industry: {
    type: String,
    index: true
  },
  tags: [String],
  thumbnail: String,
  template: {
    title: {
      type: String,
      required: true
    },
    title_ar: String,
    description: String,
    description_ar: String,
    questions: [{
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
      order: {
        type: Number,
        default: 0
      }
    }],
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
      thankYouMessage: String,
      thankYouMessage_ar: String
    }
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true
});

// Indexes
TemplateSchema.index({ category: 1, isPublished: 1 });
TemplateSchema.index({ industry: 1, isPublished: 1 });
TemplateSchema.index({ tags: 1 });
TemplateSchema.index({ usageCount: -1 });
TemplateSchema.index({ 'rating.average': -1 });

// Methods
TemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

TemplateSchema.methods.updateRating = function(newRating) {
  const totalRating = this.rating.average * this.rating.count + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  return this.save();
};

module.exports = mongoose.model('Template', TemplateSchema);

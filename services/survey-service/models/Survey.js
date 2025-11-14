const mongoose = require('mongoose');

/**
 * Survey Model - Database representation of surveys (migrating from JSON files)
 * Includes advanced features: sections, conditional logic, multi-language, settings
 */

const QuestionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['multiple_choice', 'checkboxes', 'dropdown', 'paragraph', 'short_answer', 'scale', 'ranked', 'file_upload', 'signature', 'location'],
    required: true
  },
  // Multi-language question text
  text: {
    type: Map,
    of: String, // { 'en': 'Question?', 'ar': '؟السؤال', 'fr': 'Question?' }
    required: true
  },
  // Multi-language options for choice-based questions
  options: {
    type: Map,
    of: [String] // { 'en': ['Option 1', 'Option 2'], 'ar': ['خيار 1', 'خيار 2'] }
  },
  required: {
    type: Boolean,
    default: false
  },
  // Conditional logic rules
  conditionalLogic: {
    enabled: { type: Boolean, default: false },
    rules: [{
      condition: {
        type: String,
        enum: ['show', 'hide', 'skip', 'jump_to']
      },
      trigger: {
        questionId: String,
        operator: {
          type: String,
          enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty']
        },
        value: mongoose.Schema.Types.Mixed
      },
      action: {
        targetQuestionId: String, // for jump_to
        targetSectionId: String   // for section jumps
      }
    }]
  },
  // Piping - insert previous answers
  piping: {
    enabled: { type: Boolean, default: false },
    template: String, // e.g., "You said you prefer {{q1}}, why?"
    sources: [{ questionId: String, placeholder: String }]
  },
  // Calculated values
  calculation: {
    enabled: { type: Boolean, default: false },
    formula: String, // e.g., "{{q1}} + {{q2}} * 0.5"
    variables: [{ questionId: String, placeholder: String }]
  },
  // Validation rules
  validation: {
    minLength: Number,
    maxLength: Number,
    minValue: Number,
    maxValue: Number,
    pattern: String, // regex pattern
    customMessage: {
      type: Map,
      of: String // multi-language validation messages
    }
  },
  // File upload settings
  fileUpload: {
    maxSize: Number, // in bytes
    allowedTypes: [String], // ['image/*', 'application/pdf']
    maxFiles: Number
  },
  // Scale settings
  scaleSettings: {
    min: Number,
    max: Number,
    step: Number,
    minLabel: { type: Map, of: String },
    maxLabel: { type: Map, of: String }
  },
  // Metadata
  order: Number,
  sectionId: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, { _id: false });

const SectionSchema = new mongoose.Schema({
  sectionId: {
    type: String,
    required: true
  },
  title: {
    type: Map,
    of: String,
    required: true
  },
  description: {
    type: Map,
    of: String
  },
  // Collapsible settings
  collapsible: {
    enabled: { type: Boolean, default: true },
    autoCollapse: { type: Boolean, default: true }, // collapse when complete
    defaultExpanded: { type: Boolean, default: false }
  },
  // Section conditional logic
  conditionalLogic: {
    enabled: { type: Boolean, default: false },
    rules: [{
      condition: String,
      trigger: {
        questionId: String,
        operator: String,
        value: mongoose.Schema.Types.Mixed
      }
    }]
  },
  order: Number,
  questionIds: [String] // references to questions in this section
}, { _id: false });

const SurveySchema = new mongoose.Schema({
  // Basic Info
  surveyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: Map,
    of: String,
    required: true
  },
  description: {
    type: Map,
    of: String
  },

  // Project association
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SurveyGroup'
  },

  // Survey structure
  sections: [SectionSchema],
  questions: [QuestionSchema],

  // Multi-language settings
  languages: {
    available: {
      type: [String],
      default: ['en', 'ar']
    },
    default: {
      type: String,
      default: 'en'
    },
    rtlLanguages: {
      type: [String],
      default: ['ar', 'he', 'fa', 'ur'] // Arabic, Hebrew, Persian, Urdu
    }
  },

  // Advanced settings
  settings: {
    // Timing
    startDate: Date,
    endDate: Date,
    timezone: { type: String, default: 'UTC' },

    // Response limits
    maxResponses: Number,
    maxResponsesPerUser: { type: Number, default: 1 },
    allowAnonymous: { type: Boolean, default: false },

    // Survey behavior
    showProgressBar: { type: Boolean, default: true },
    allowSaveResume: { type: Boolean, default: true },
    autoScrollToNext: { type: Boolean, default: true },
    randomizeQuestions: { type: Boolean, default: false },
    randomizeSections: { type: Boolean, default: false },

    // Completion
    thankYouPage: {
      enabled: { type: Boolean, default: true },
      message: { type: Map, of: String },
      redirectUrl: String,
      redirectDelay: { type: Number, default: 3 } // seconds
    },

    // Notifications
    notifications: {
      email: {
        enabled: { type: Boolean, default: false },
        recipients: [String],
        onResponse: { type: Boolean, default: true }
      },
      webhook: {
        enabled: { type: Boolean, default: false },
        url: String,
        events: [String] // ['response_submitted', 'survey_completed']
      }
    },

    // Security
    requireAccessCode: { type: Boolean, default: false },
    accessCodes: [String],
    captchaEnabled: { type: Boolean, default: false },
    ipRestrictions: [String], // CIDR notation or specific IPs

    // Custom URL
    customSlug: {
      type: String,
      unique: true,
      sparse: true,
      match: /^[a-z0-9-]+$/
    }
  },

  // Distribution tracking
  distribution: {
    uniqueLinks: [{
      linkId: String,
      code: String,
      label: String,
      maxUses: Number,
      usedCount: { type: Number, default: 0 },
      expiresAt: Date,
      createdAt: { type: Date, default: Date.now }
    }],
    qrCodes: [{
      qrCodeId: String,
      imageUrl: String,
      linkId: String,
      createdAt: { type: Date, default: Date.now }
    }],
    embedCode: {
      enabled: { type: Boolean, default: false },
      styles: {
        type: Map,
        of: String
      }
    }
  },

  // Status and metadata
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'closed', 'archived'],
    default: 'draft',
    index: true
  },
  version: {
    type: Number,
    default: 1
  },
  previousVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey'
  },

  // Ownership
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: String,

  // Analytics cache
  stats: {
    totalResponses: { type: Number, default: 0 },
    completedResponses: { type: Number, default: 0 },
    averageCompletionTime: Number,
    lastResponseAt: Date
  }
}, {
  timestamps: true,
  collection: 'surveys'
});

// Indexes for performance
SurveySchema.index({ projectId: 1, status: 1 });
SurveySchema.index({ createdBy: 1, createdAt: -1 });
SurveySchema.index({ 'settings.customSlug': 1 }, { sparse: true, unique: true });
SurveySchema.index({ 'settings.startDate': 1, 'settings.endDate': 1 });

// Methods

/**
 * Check if survey is currently active
 */
SurveySchema.methods.isActive = function() {
  if (this.status !== 'active') return false;

  const now = new Date();
  if (this.settings.startDate && now < this.settings.startDate) return false;
  if (this.settings.endDate && now > this.settings.endDate) return false;

  if (this.settings.maxResponses && this.stats.totalResponses >= this.settings.maxResponses) {
    return false;
  }

  return true;
};

/**
 * Get public URL for survey
 */
SurveySchema.methods.getPublicUrl = function(baseUrl = '') {
  if (this.settings.customSlug) {
    return `${baseUrl}/s/${this.settings.customSlug}`;
  }
  return `${baseUrl}/survey/${this.surveyId}`;
};

/**
 * Generate unique distribution link
 */
SurveySchema.methods.generateUniqueLink = function(options = {}) {
  const crypto = require('crypto');
  const linkId = crypto.randomBytes(8).toString('hex');
  const code = crypto.randomBytes(6).toString('hex').toUpperCase();

  const link = {
    linkId,
    code,
    label: options.label || `Link ${this.distribution.uniqueLinks.length + 1}`,
    maxUses: options.maxUses,
    expiresAt: options.expiresAt,
    usedCount: 0,
    createdAt: new Date()
  };

  this.distribution.uniqueLinks.push(link);
  return link;
};

/**
 * Validate access code
 */
SurveySchema.methods.validateAccessCode = function(code) {
  if (!this.settings.requireAccessCode) return true;
  return this.settings.accessCodes.includes(code);
};

/**
 * Check if user can submit response
 */
SurveySchema.methods.canSubmitResponse = async function(userId = null) {
  // Check if survey is active
  if (!this.isActive()) {
    return { allowed: false, reason: 'Survey is not active' };
  }

  // Check max responses
  if (this.settings.maxResponses && this.stats.totalResponses >= this.settings.maxResponses) {
    return { allowed: false, reason: 'Maximum responses reached' };
  }

  // Check user-specific limits
  if (userId && this.settings.maxResponsesPerUser) {
    const ResponseModel = mongoose.model('SurveyResponse');
    const userResponseCount = await ResponseModel.countDocuments({
      surveyId: this.surveyId,
      userId: userId
    });

    if (userResponseCount >= this.settings.maxResponsesPerUser) {
      return { allowed: false, reason: 'Maximum responses per user reached' };
    }
  }

  return { allowed: true };
};

/**
 * Increment response count
 */
SurveySchema.methods.incrementResponseCount = function(completed = false) {
  this.stats.totalResponses += 1;
  if (completed) {
    this.stats.completedResponses += 1;
  }
  this.stats.lastResponseAt = new Date();
};

/**
 * Get questions for a specific section
 */
SurveySchema.methods.getQuestionsBySection = function(sectionId) {
  return this.questions.filter(q => q.sectionId === sectionId);
};

/**
 * Evaluate conditional logic for a question
 */
SurveySchema.methods.evaluateConditionalLogic = function(questionId, responses) {
  const question = this.questions.find(q => q.questionId === questionId);
  if (!question || !question.conditionalLogic.enabled) {
    return { visible: true, action: null };
  }

  for (const rule of question.conditionalLogic.rules) {
    const triggerQuestion = responses[rule.trigger.questionId];
    if (!triggerQuestion) continue;

    const conditionMet = this._evaluateCondition(
      triggerQuestion,
      rule.trigger.operator,
      rule.trigger.value
    );

    if (conditionMet) {
      return {
        visible: rule.condition !== 'hide',
        action: rule.action,
        condition: rule.condition
      };
    }
  }

  return { visible: true, action: null };
};

/**
 * Helper to evaluate condition operators
 */
SurveySchema.methods._evaluateCondition = function(answer, operator, value) {
  switch (operator) {
    case 'equals':
      return answer === value;
    case 'not_equals':
      return answer !== value;
    case 'contains':
      return Array.isArray(answer) ? answer.includes(value) : String(answer).includes(value);
    case 'not_contains':
      return Array.isArray(answer) ? !answer.includes(value) : !String(answer).includes(value);
    case 'greater_than':
      return Number(answer) > Number(value);
    case 'less_than':
      return Number(answer) < Number(value);
    case 'is_empty':
      return !answer || answer.length === 0;
    case 'is_not_empty':
      return answer && answer.length > 0;
    default:
      return false;
  }
};

/**
 * Apply piping to question text
 */
SurveySchema.methods.applyPiping = function(questionId, responses, language = 'en') {
  const question = this.questions.find(q => q.questionId === questionId);
  if (!question || !question.piping.enabled) {
    return question.text.get(language);
  }

  let text = question.piping.template || question.text.get(language);

  for (const source of question.piping.sources) {
    const answer = responses[source.questionId];
    const placeholder = source.placeholder || `{{${source.questionId}}}`;
    text = text.replace(new RegExp(placeholder, 'g'), answer || '');
  }

  return text;
};

/**
 * Calculate calculated field value
 */
SurveySchema.methods.calculateValue = function(questionId, responses) {
  const question = this.questions.find(q => q.questionId === questionId);
  if (!question || !question.calculation.enabled) {
    return null;
  }

  let formula = question.calculation.formula;

  for (const variable of question.calculation.variables) {
    const value = responses[variable.questionId];
    const placeholder = variable.placeholder || `{{${variable.questionId}}}`;
    formula = formula.replace(new RegExp(placeholder, 'g'), value || 0);
  }

  try {
    // Safe evaluation (consider using a proper expression parser in production)
    return eval(formula);
  } catch (error) {
    console.error('Error calculating value:', error);
    return null;
  }
};

// Static methods

/**
 * Find active surveys
 */
SurveySchema.statics.findActive = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    $or: [
      { 'settings.startDate': { $exists: false } },
      { 'settings.startDate': { $lte: now } }
    ],
    $or: [
      { 'settings.endDate': { $exists: false } },
      { 'settings.endDate': { $gte: now } }
    ]
  });
};

/**
 * Find survey by custom slug or ID
 */
SurveySchema.statics.findBySlugOrId = function(identifier) {
  return this.findOne({
    $or: [
      { surveyId: identifier },
      { 'settings.customSlug': identifier }
    ]
  });
};

module.exports = mongoose.model('Survey', SurveySchema);

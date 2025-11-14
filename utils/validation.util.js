/**
 * Input Validation Utility
 * Comprehensive validation schemas using Joi
 */

const Joi = require('joi');
const securityConfig = require('../config/security.config');

/**
 * Password validation schema with security requirements
 */
const passwordSchema = Joi.string()
  .min(securityConfig.password.minLength)
  .max(securityConfig.password.maxLength)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
  .required()
  .messages({
    'string.min': `Password must be at least ${securityConfig.password.minLength} characters long`,
    'string.max': `Password must not exceed ${securityConfig.password.maxLength} characters`,
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'Password is required'
  });

/**
 * Email validation schema
 */
const emailSchema = Joi.string()
  .email({ tlds: { allow: true } })
  .lowercase()
  .trim()
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  });

/**
 * Phone number validation schema
 */
const phoneSchema = Joi.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .messages({
    'string.pattern.base': 'Please provide a valid phone number in international format'
  });

/**
 * MongoDB ObjectId validation
 */
const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    'string.pattern.base': 'Invalid ID format'
  });

/**
 * URL validation schema
 */
const urlSchema = Joi.string()
  .uri({ scheme: ['http', 'https'] })
  .messages({
    'string.uri': 'Please provide a valid URL'
  });

/**
 * User registration validation schema
 */
const userRegistrationSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    }),
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name must not exceed 50 characters',
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes',
      'any.required': 'First name is required'
    }),
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name must not exceed 50 characters',
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes',
      'any.required': 'Last name is required'
    }),
  phone: phoneSchema.optional(),
  acceptTerms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the terms and conditions',
      'any.required': 'Terms acceptance is required'
    }),
  gdprConsent: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must provide GDPR consent',
      'any.required': 'GDPR consent is required'
    })
});

/**
 * User login validation schema
 */
const userLoginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  }),
  twoFactorCode: Joi.string()
    .pattern(/^\d{6}$/)
    .optional()
    .messages({
      'string.pattern.base': '2FA code must be 6 digits'
    })
});

/**
 * Password reset request schema
 */
const passwordResetRequestSchema = Joi.object({
  email: emailSchema
});

/**
 * Password reset schema
 */
const passwordResetSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required'
  }),
  password: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
});

/**
 * Password change schema (for authenticated users)
 */
const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
});

/**
 * Profile update schema
 */
const profileUpdateSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .optional(),
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .optional(),
  phone: phoneSchema.optional().allow('', null),
  bio: Joi.string()
    .max(500)
    .optional()
    .allow('', null),
  avatar: urlSchema.optional().allow('', null)
});

/**
 * Survey creation schema
 */
const surveyCreationSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.min': 'Survey title must be at least 3 characters',
      'string.max': 'Survey title must not exceed 200 characters',
      'any.required': 'Survey title is required'
    }),
  description: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .allow(''),
  projectId: objectIdSchema.required(),
  questions: Joi.array()
    .items(Joi.object({
      type: Joi.string()
        .valid('text', 'multiple-choice', 'checkbox', 'rating', 'date', 'file')
        .required(),
      text: Joi.string().trim().min(3).max(500).required(),
      required: Joi.boolean().default(false),
      options: Joi.array().items(Joi.string().trim()).when('type', {
        is: Joi.string().valid('multiple-choice', 'checkbox'),
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    }))
    .min(1)
    .required()
    .messages({
      'array.min': 'Survey must have at least one question',
      'any.required': 'Survey questions are required'
    }),
  status: Joi.string()
    .valid('draft', 'active', 'paused', 'completed')
    .default('draft'),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).optional()
});

/**
 * File upload validation schema
 */
const fileUploadSchema = Joi.object({
  filename: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9_\-. ]+$/)
    .max(255)
    .required()
    .messages({
      'string.pattern.base': 'Filename contains invalid characters',
      'string.max': 'Filename is too long'
    }),
  mimetype: Joi.string()
    .valid(...securityConfig.fileUpload.allowedMimeTypes)
    .required()
    .messages({
      'any.only': 'File type not allowed'
    }),
  size: Joi.number()
    .max(securityConfig.fileUpload.maxFileSize)
    .required()
    .messages({
      'number.max': `File size must not exceed ${securityConfig.fileUpload.maxFileSize / (1024 * 1024)}MB`
    })
});

/**
 * Pagination schema
 */
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().optional(),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * API key creation schema
 */
const apiKeyCreationSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'API key name must be at least 3 characters',
      'string.max': 'API key name must not exceed 100 characters',
      'any.required': 'API key name is required'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow(''),
  expiresIn: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(90)
    .messages({
      'number.min': 'Expiry must be at least 1 day',
      'number.max': 'Expiry must not exceed 365 days'
    }),
  permissions: Joi.array()
    .items(Joi.string().valid('read', 'write', 'delete', 'admin'))
    .min(1)
    .required()
});

/**
 * 2FA setup schema
 */
const twoFactorSetupSchema = Joi.object({
  code: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.pattern.base': '2FA code must be 6 digits',
      'any.required': '2FA code is required'
    })
});

/**
 * GDPR data export schema
 */
const gdprDataExportSchema = Joi.object({
  email: emailSchema,
  format: Joi.string().valid('json', 'csv', 'xml').default('json'),
  includeFiles: Joi.boolean().default(false)
});

/**
 * GDPR data deletion schema
 */
const gdprDataDeletionSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required(),
  confirmDeletion: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must confirm data deletion',
      'any.required': 'Deletion confirmation is required'
    })
});

/**
 * Validation middleware factory
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }

    req[source] = value;
    next();
  };
};

/**
 * Sanitize input to prevent XSS
 */
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
};

module.exports = {
  // Schemas
  passwordSchema,
  emailSchema,
  phoneSchema,
  objectIdSchema,
  urlSchema,
  userRegistrationSchema,
  userLoginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  passwordChangeSchema,
  profileUpdateSchema,
  surveyCreationSchema,
  fileUploadSchema,
  paginationSchema,
  apiKeyCreationSchema,
  twoFactorSetupSchema,
  gdprDataExportSchema,
  gdprDataDeletionSchema,

  // Middleware
  validate,
  sanitizeInput
};

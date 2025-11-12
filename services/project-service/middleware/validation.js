const Joi = require('joi');

/**
 * Validation schemas for project service
 */
const schemas = {
  // Project validation
  createProject: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500).allow('', null),
    settings: Joi.object({
      allowPublicAccess: Joi.boolean(),
      requireApproval: Joi.boolean(),
      defaultSurveyPermission: Joi.string().valid('view', 'edit', 'none'),
      notifications: Joi.object({
        onNewResponse: Joi.boolean(),
        onNewMember: Joi.boolean(),
        onSurveyUpdate: Joi.boolean()
      })
    })
  }),

  updateProject: Joi.object({
    name: Joi.string().min(3).max(100),
    description: Joi.string().max(500).allow('', null),
    settings: Joi.object({
      allowPublicAccess: Joi.boolean(),
      requireApproval: Joi.boolean(),
      defaultSurveyPermission: Joi.string().valid('view', 'edit', 'none'),
      notifications: Joi.object({
        onNewResponse: Joi.boolean(),
        onNewMember: Joi.boolean(),
        onSurveyUpdate: Joi.boolean()
      })
    })
  }).min(1),

  // Member validation
  addMember: Joi.object({
    userId: Joi.string().required(),
    role: Joi.string().valid('admin', 'editor', 'viewer').default('viewer')
  }),

  updateMemberRole: Joi.object({
    role: Joi.string().valid('admin', 'editor', 'viewer').required()
  }),

  // Group validation
  createGroup: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500).allow('', null),
    settings: Joi.object({
      color: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
      icon: Joi.string().max(50)
    })
  }),

  updateGroup: Joi.object({
    name: Joi.string().min(3).max(100),
    description: Joi.string().max(500).allow('', null),
    settings: Joi.object({
      color: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
      icon: Joi.string().max(50)
    })
  }).min(1),

  addSurveyToGroup: Joi.object({
    surveyId: Joi.string().required()
  }),

  // Query validation
  projectQuery: Joi.object({
    status: Joi.string().valid('active', 'archived'),
    search: Joi.string().max(100),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt').default('updatedAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  groupQuery: Joi.object({
    status: Joi.string().valid('active', 'archived'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

/**
 * Validation middleware factory
 */
function validate(schemaName, source = 'body') {
  return (req, res, next) => {
    const schema = schemas[schemaName];

    if (!schema) {
      return res.status(500).json({
        success: false,
        message: 'Validation schema not found'
      });
    }

    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
}

/**
 * Validate MongoDB ObjectId
 */
function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }

    next();
  };
}

module.exports = {
  schemas,
  validate,
  validateObjectId
};

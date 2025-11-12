/**
 * Event Schemas
 * Defines the structure of all events in the system
 */

/**
 * Base Event Schema
 * All events should extend this base schema
 */
const baseEventSchema = {
  eventId: 'string',        // Unique event ID
  eventType: 'string',      // Type of event
  timestamp: 'Date',        // Event timestamp
  version: 'string',        // Schema version
  source: 'string',         // Service that generated the event
  correlationId: 'string',  // For tracing related events
  userId: 'string'          // User who triggered the event (if applicable)
};

/**
 * Survey Events
 */
const surveyEvents = {
  /**
   * Survey Created Event
   */
  created: {
    eventType: 'survey.created',
    surveyId: 'string',
    userId: 'string',
    timestamp: 'Date',
    payload: {
      title: 'string',
      description: 'string',
      questions: 'array',
      settings: 'object',
      metadata: 'object'
    }
  },

  /**
   * Survey Updated Event
   */
  updated: {
    eventType: 'survey.updated',
    surveyId: 'string',
    userId: 'string',
    timestamp: 'Date',
    payload: {
      changes: 'object',
      previousVersion: 'object',
      newVersion: 'object'
    }
  },

  /**
   * Survey Published Event
   */
  published: {
    eventType: 'survey.published',
    surveyId: 'string',
    userId: 'string',
    timestamp: 'Date',
    payload: {
      publishedAt: 'Date',
      expiresAt: 'Date',
      targetAudience: 'object',
      distribution: 'object'
    }
  },

  /**
   * Survey Deleted Event
   */
  deleted: {
    eventType: 'survey.deleted',
    surveyId: 'string',
    userId: 'string',
    timestamp: 'Date',
    payload: {
      reason: 'string',
      softDelete: 'boolean'
    }
  }
};

/**
 * Response Events
 */
const responseEvents = {
  /**
   * Response Submitted Event
   */
  submitted: {
    eventType: 'response.submitted',
    responseId: 'string',
    surveyId: 'string',
    respondentId: 'string',
    timestamp: 'Date',
    location: 'array[number, number]', // [latitude, longitude]
    payload: {
      answers: 'object',
      completionTime: 'number', // in seconds
      device: 'object',
      metadata: 'object'
    }
  },

  /**
   * Response Updated Event
   */
  updated: {
    eventType: 'response.updated',
    responseId: 'string',
    surveyId: 'string',
    respondentId: 'string',
    timestamp: 'Date',
    payload: {
      changes: 'object',
      previousAnswers: 'object',
      newAnswers: 'object'
    }
  },

  /**
   * Response Deleted Event
   */
  deleted: {
    eventType: 'response.deleted',
    responseId: 'string',
    surveyId: 'string',
    timestamp: 'Date',
    payload: {
      reason: 'string'
    }
  }
};

/**
 * Surveyor Events
 */
const surveyorEvents = {
  /**
   * Surveyor Activity Event
   */
  activity: {
    eventType: 'surveyor.activity',
    surveyorId: 'string',
    timestamp: 'Date',
    payload: {
      activityType: 'string', // 'login', 'logout', 'survey_assigned', 'survey_completed'
      details: 'object',
      location: 'array[number, number]'
    }
  },

  /**
   * Surveyor Location Event
   */
  location: {
    eventType: 'surveyor.location',
    surveyorId: 'string',
    timestamp: 'Date',
    payload: {
      latitude: 'number',
      longitude: 'number',
      accuracy: 'number',
      altitude: 'number',
      speed: 'number',
      heading: 'number',
      address: 'object'
    }
  },

  /**
   * Surveyor Registered Event
   */
  registered: {
    eventType: 'surveyor.registered',
    surveyorId: 'string',
    timestamp: 'Date',
    payload: {
      name: 'string',
      email: 'string',
      phone: 'string',
      territories: 'array',
      metadata: 'object'
    }
  }
};

/**
 * Analytics Events
 */
const analyticsEvents = {
  /**
   * Analytics Update Event
   */
  update: {
    eventType: 'analytics.update',
    entityId: 'string', // Survey ID or other entity
    entityType: 'string', // 'survey', 'response', etc.
    timestamp: 'Date',
    payload: {
      metrics: 'object',
      aggregations: 'object',
      insights: 'array'
    }
  },

  /**
   * Analytics Request Event
   */
  request: {
    eventType: 'analytics.request',
    requestId: 'string',
    userId: 'string',
    timestamp: 'Date',
    payload: {
      query: 'object',
      filters: 'object',
      dateRange: 'object'
    }
  }
};

/**
 * Notification Events
 */
const notificationEvents = {
  /**
   * Generic Notification Send Event
   */
  send: {
    eventType: 'notification.send',
    notificationId: 'string',
    userId: 'string',
    timestamp: 'Date',
    payload: {
      type: 'string', // 'email', 'sms', 'push'
      template: 'string',
      recipient: 'object',
      content: 'object',
      priority: 'string' // 'low', 'medium', 'high', 'urgent'
    }
  },

  /**
   * Email Notification Event
   */
  email: {
    eventType: 'notification.email',
    notificationId: 'string',
    userId: 'string',
    timestamp: 'Date',
    payload: {
      to: 'array',
      cc: 'array',
      bcc: 'array',
      subject: 'string',
      body: 'string',
      attachments: 'array'
    }
  },

  /**
   * SMS Notification Event
   */
  sms: {
    eventType: 'notification.sms',
    notificationId: 'string',
    userId: 'string',
    timestamp: 'Date',
    payload: {
      phoneNumber: 'string',
      message: 'string',
      provider: 'string'
    }
  },

  /**
   * Push Notification Event
   */
  push: {
    eventType: 'notification.push',
    notificationId: 'string',
    userId: 'string',
    timestamp: 'Date',
    payload: {
      deviceTokens: 'array',
      title: 'string',
      body: 'string',
      data: 'object',
      badge: 'number'
    }
  }
};

/**
 * Audit Events
 */
const auditEvents = {
  /**
   * Generic Audit Log Event
   */
  log: {
    eventType: 'audit.log',
    auditId: 'string',
    userId: 'string',
    timestamp: 'Date',
    payload: {
      action: 'string',
      resource: 'string',
      resourceId: 'string',
      changes: 'object',
      ipAddress: 'string',
      userAgent: 'string',
      result: 'string' // 'success', 'failure'
    }
  },

  /**
   * Authentication Audit Event
   */
  auth: {
    eventType: 'audit.auth',
    auditId: 'string',
    userId: 'string',
    timestamp: 'Date',
    payload: {
      action: 'string', // 'login', 'logout', 'password_change', 'mfa_enabled'
      ipAddress: 'string',
      userAgent: 'string',
      success: 'boolean',
      failureReason: 'string'
    }
  },

  /**
   * Data Access Audit Event
   */
  data: {
    eventType: 'audit.data',
    auditId: 'string',
    userId: 'string',
    timestamp: 'Date',
    payload: {
      action: 'string', // 'read', 'write', 'delete', 'export'
      dataType: 'string',
      dataId: 'string',
      sensitivityLevel: 'string', // 'public', 'internal', 'confidential', 'restricted'
      reason: 'string'
    }
  }
};

/**
 * Create event helper
 */
function createEvent(eventType, payload, options = {}) {
  return {
    eventId: options.eventId || `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    eventType,
    timestamp: options.timestamp || new Date(),
    version: options.version || '1.0.0',
    source: options.source || 'unknown',
    correlationId: options.correlationId,
    userId: options.userId,
    ...payload
  };
}

/**
 * Validate event against schema
 */
function validateEvent(event, schema) {
  // Simple validation - in production, use a library like Joi or Ajv
  const errors = [];

  for (const [key, type] of Object.entries(schema)) {
    if (!(key in event) && !['userId', 'correlationId'].includes(key)) {
      errors.push(`Missing required field: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  baseEventSchema,
  surveyEvents,
  responseEvents,
  surveyorEvents,
  analyticsEvents,
  notificationEvents,
  auditEvents,
  createEvent,
  validateEvent
};

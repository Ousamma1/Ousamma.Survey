/**
 * Comprehensive Index Definitions for All Services
 *
 * This file defines all optimized indexes for the survey platform.
 * Indexes are crucial for query performance, especially for:
 * - Frequently queried fields
 * - Fields used in sorting
 * - Fields used in filtering/where clauses
 * - Foreign key-like references
 */

module.exports = {
  /**
   * Analytics Service Indexes
   */
  analytics: {
    SurveyAnalytics: [
      // Primary queries
      { fields: { surveyId: 1 }, options: { unique: true } },
      { fields: { lastUpdated: -1 }, options: {} },

      // Sorting/filtering
      { fields: { totalResponses: -1 }, options: {} },
      { fields: { completionRate: -1 }, options: {} },

      // Compound indexes for common queries
      { fields: { surveyId: 1, lastUpdated: -1 }, options: {} },

      // Partial index for active surveys
      {
        fields: { surveyId: 1, totalResponses: -1 },
        options: {
          partialFilterExpression: { totalResponses: { $gt: 0 } }
        }
      }
    ],

    QuestionAnalytics: [
      { fields: { surveyId: 1, questionId: 1 }, options: { unique: true } },
      { fields: { surveyId: 1 }, options: {} },
      { fields: { questionId: 1 }, options: {} },
      { fields: { lastUpdated: -1 }, options: {} },

      // Compound for performance queries
      { fields: { surveyId: 1, 'statistics.responseCount': -1 }, options: {} }
    ],

    ResponseEvent: [
      // Time-series primary queries
      { fields: { surveyId: 1, timestamp: -1 }, options: {} },
      { fields: { responseId: 1 }, options: { unique: true } },
      { fields: { userId: 1, timestamp: -1 }, options: {} },

      // Completion tracking
      { fields: { isComplete: 1, surveyId: 1 }, options: {} },

      // Geospatial index
      { fields: { 'location.coordinates': '2dsphere' }, options: {} },

      // Device analytics
      { fields: { 'metadata.device': 1, surveyId: 1 }, options: {} },
      { fields: { 'metadata.browser': 1 }, options: {} },

      // Compound indexes for common analytics queries
      { fields: { surveyId: 1, isComplete: 1, timestamp: -1 }, options: {} },
      { fields: { surveyId: 1, 'metadata.device': 1, timestamp: -1 }, options: {} },

      // TTL index for data retention (optional, configure based on needs)
      // { fields: { timestamp: 1 }, options: { expireAfterSeconds: 31536000 } } // 1 year
    ]
  },

  /**
   * Geolocation Service Indexes
   */
  geolocation: {
    Location: [
      // Geospatial index (must be 2dsphere for modern queries)
      { fields: { coordinates: '2dsphere' }, options: {} },

      // Entity lookups
      { fields: { entityId: 1, type: 1 }, options: {} },
      { fields: { type: 1 }, options: {} },

      // Timestamp queries
      { fields: { createdAt: -1 }, options: {} },
      { fields: { updatedAt: -1 }, options: {} },

      // Compound for common queries
      { fields: { type: 1, entityId: 1, createdAt: -1 }, options: {} },

      // Accuracy filtering
      { fields: { accuracy: 1 }, options: {} },

      // Address lookup (text index for search)
      { fields: { address: 'text' }, options: {} }
    ],

    Territory: [
      { fields: { name: 1 }, options: { unique: true } },
      { fields: { assignedSurveyors: 1 }, options: {} },
      { fields: { isActive: 1 }, options: {} },

      // Geospatial polygon index
      { fields: { polygon: '2dsphere' }, options: {} },

      // Compound for surveyor queries
      { fields: { isActive: 1, assignedSurveyors: 1 }, options: {} },

      // Timestamps
      { fields: { createdAt: -1 }, options: {} }
    ]
  },

  /**
   * Surveyor Service Indexes
   */
  surveyor: {
    Surveyor: [
      // Unique identifiers
      { fields: { id: 1 }, options: { unique: true } },
      { fields: { email: 1 }, options: { unique: true, sparse: true } },

      // Status queries
      { fields: { status: 1, expirationDate: 1 }, options: {} },
      { fields: { status: 1 }, options: {} },

      // User management
      { fields: { createdBy: 1, createdAt: -1 }, options: {} },

      // Assignment queries
      { fields: { assignedSurveys: 1 }, options: {} },
      { fields: { assignedTerritories: 1 }, options: {} },

      // Compound for admin queries
      { fields: { status: 1, createdAt: -1 }, options: {} },
      { fields: { email: 1, status: 1 }, options: {} },

      // Region-based queries
      { fields: { region: 1, status: 1 }, options: {} },

      // Last login tracking
      { fields: { lastLoginAt: -1 }, options: {} },

      // Partial index for active surveyors only
      {
        fields: { id: 1, status: 1 },
        options: {
          partialFilterExpression: { status: 'active' }
        }
      }
    ],

    Assignment: [
      { fields: { surveyorId: 1, surveyId: 1 }, options: { unique: true } },
      { fields: { surveyorId: 1 }, options: {} },
      { fields: { surveyId: 1 }, options: {} },
      { fields: { status: 1 }, options: {} },

      // Compound for assignment queries
      { fields: { surveyorId: 1, status: 1 }, options: {} },
      { fields: { surveyId: 1, status: 1 }, options: {} },

      // Deadline tracking
      { fields: { deadline: 1, status: 1 }, options: {} },

      // Date ranges
      { fields: { assignedAt: -1 }, options: {} },
      { fields: { completedAt: -1 }, options: {} }
    ],

    Activity: [
      { fields: { surveyorId: 1, timestamp: -1 }, options: {} },
      { fields: { type: 1, timestamp: -1 }, options: {} },
      { fields: { timestamp: -1 }, options: {} },

      // Compound for activity queries
      { fields: { surveyorId: 1, type: 1, timestamp: -1 }, options: {} },

      // TTL index for activity data retention (30 days)
      { fields: { timestamp: 1 }, options: { expireAfterSeconds: 2592000 } }
    ]
  },

  /**
   * Project Service Indexes
   */
  project: {
    Project: [
      // Ownership queries
      { fields: { ownerId: 1, status: 1 }, options: {} },
      { fields: { ownerId: 1, createdAt: -1 }, options: {} },

      // Member queries
      { fields: { 'members.userId': 1 }, options: {} },
      { fields: { 'members.role': 1 }, options: {} },

      // Status queries
      { fields: { status: 1 }, options: {} },
      { fields: { status: 1, updatedAt: -1 }, options: {} },

      // Survey associations
      { fields: { surveys: 1 }, options: {} },

      // Compound for common queries
      { fields: { ownerId: 1, status: 1, updatedAt: -1 }, options: {} },

      // Text search on name
      { fields: { name: 'text', description: 'text' }, options: {} },

      // Timestamps
      { fields: { createdAt: -1 }, options: {} },
      { fields: { updatedAt: -1 }, options: {} }
    ],

    SurveyGroup: [
      { fields: { projectId: 1 }, options: {} },
      { fields: { projectId: 1, name: 1 }, options: {} },
      { fields: { surveys: 1 }, options: {} },

      // Compound queries
      { fields: { projectId: 1, createdAt: -1 }, options: {} },

      // Timestamps
      { fields: { createdAt: -1 }, options: {} }
    ]
  },

  /**
   * Notification Service Indexes
   */
  notification: {
    Notification: [
      // User notifications
      { fields: { userId: 1, createdAt: -1 }, options: {} },
      { fields: { userId: 1, read: 1, createdAt: -1 }, options: {} },

      // Status queries
      { fields: { status: 1 }, options: {} },
      { fields: { read: 1 }, options: {} },

      // Type filtering
      { fields: { type: 1, createdAt: -1 }, options: {} },

      // Channel tracking
      { fields: { channel: 1 }, options: {} },

      // Compound for common queries
      { fields: { userId: 1, type: 1, read: 1 }, options: {} },

      // Scheduled notifications
      { fields: { scheduledFor: 1, status: 1 }, options: {} },

      // TTL index for old notifications (90 days)
      {
        fields: { createdAt: 1 },
        options: { expireAfterSeconds: 7776000 }
      }
    ],

    NotificationTemplate: [
      { fields: { name: 1 }, options: { unique: true } },
      { fields: { type: 1 }, options: {} },
      { fields: { channel: 1 }, options: {} },

      // Compound for template lookup
      { fields: { type: 1, channel: 1 }, options: {} }
    ],

    NotificationPreference: [
      { fields: { userId: 1 }, options: { unique: true } },
      { fields: { userId: 1, enabled: 1 }, options: {} }
    ]
  },

  /**
   * Admin Service Indexes
   */
  admin: {
    AuditLog: [
      { fields: { timestamp: -1 }, options: {} },
      { fields: { userId: 1, timestamp: -1 }, options: {} },
      { fields: { action: 1, timestamp: -1 }, options: {} },
      { fields: { entityType: 1, entityId: 1 }, options: {} },

      // Compound for audit queries
      { fields: { userId: 1, action: 1, timestamp: -1 }, options: {} },
      { fields: { entityType: 1, timestamp: -1 }, options: {} },

      // TTL index for audit retention (1 year)
      { fields: { timestamp: 1 }, options: { expireAfterSeconds: 31536000 } }
    ],

    SystemSettings: [
      { fields: { key: 1 }, options: { unique: true } },
      { fields: { category: 1 }, options: {} },
      { fields: { updatedAt: -1 }, options: {} }
    ],

    ServiceHealth: [
      { fields: { serviceName: 1, timestamp: -1 }, options: {} },
      { fields: { status: 1, timestamp: -1 }, options: {} },

      // TTL index for health history (7 days)
      { fields: { timestamp: 1 }, options: { expireAfterSeconds: 604800 } }
    ]
  }
};

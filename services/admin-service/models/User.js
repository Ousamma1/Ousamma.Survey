const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'manager', 'surveyor', 'viewer'],
    default: 'viewer'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending'
  },
  permissions: [{
    type: String,
    enum: [
      'users.read', 'users.write', 'users.delete',
      'surveys.read', 'surveys.write', 'surveys.delete',
      'analytics.read', 'analytics.export',
      'settings.read', 'settings.write',
      'audit.read', 'audit.export',
      'system.backup', 'system.restore'
    ]
  }],
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: {
    type: Date
  },
  metadata: {
    phoneNumber: String,
    department: String,
    location: String,
    timezone: String,
    language: {
      type: String,
      default: 'en'
    }
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    }
  },
  createdBy: {
    type: String
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Method to check if account is locked
userSchema.methods.isAccountLocked = function() {
  return this.accountLockedUntil && this.accountLockedUntil > new Date();
};

// Method to get user permissions based on role
userSchema.methods.getEffectivePermissions = function() {
  const rolePermissions = {
    superadmin: [
      'users.read', 'users.write', 'users.delete',
      'surveys.read', 'surveys.write', 'surveys.delete',
      'analytics.read', 'analytics.export',
      'settings.read', 'settings.write',
      'audit.read', 'audit.export',
      'system.backup', 'system.restore'
    ],
    admin: [
      'users.read', 'users.write',
      'surveys.read', 'surveys.write', 'surveys.delete',
      'analytics.read', 'analytics.export',
      'settings.read',
      'audit.read', 'audit.export'
    ],
    manager: [
      'users.read',
      'surveys.read', 'surveys.write',
      'analytics.read', 'analytics.export',
      'settings.read'
    ],
    surveyor: [
      'surveys.read',
      'analytics.read'
    ],
    viewer: [
      'surveys.read',
      'analytics.read'
    ]
  };

  // Combine role-based permissions with custom permissions
  const basePermissions = rolePermissions[this.role] || [];
  return [...new Set([...basePermissions, ...this.permissions])];
};

// Static method to get user statistics
userSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $facet: {
        totalByStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        totalByRole: [
          { $group: { _id: '$role', count: { $sum: 1 } } }
        ],
        recentLogins: [
          { $match: { lastLogin: { $exists: true } } },
          { $sort: { lastLogin: -1 } },
          { $limit: 10 },
          { $project: { username: 1, email: 1, lastLogin: 1, role: 1 } }
        ],
        totalUsers: [
          { $count: 'count' }
        ]
      }
    }
  ]);

  return stats[0];
};

module.exports = mongoose.model('User', userSchema);

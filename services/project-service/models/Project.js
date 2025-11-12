const mongoose = require('mongoose');

/**
 * Project Schema
 * Manages projects and their members with role-based access control
 */
const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    minlength: [3, 'Project name must be at least 3 characters'],
    maxlength: [100, 'Project name cannot exceed 100 characters'],
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  ownerId: {
    type: String,
    required: [true, 'Owner ID is required'],
    index: true
  },
  members: [{
    userId: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'editor', 'viewer'],
      default: 'viewer',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: String
    }
  }],
  surveys: [{
    type: String
  }],
  groups: [{
    type: String
  }],
  settings: {
    allowPublicAccess: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    defaultSurveyPermission: {
      type: String,
      enum: ['view', 'edit', 'none'],
      default: 'view'
    },
    notifications: {
      onNewResponse: { type: Boolean, default: true },
      onNewMember: { type: Boolean, default: true },
      onSurveyUpdate: { type: Boolean, default: false }
    }
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
    index: true
  },
  metadata: {
    totalSurveys: {
      type: Number,
      default: 0,
      min: 0
    },
    totalGroups: {
      type: Number,
      default: 0,
      min: 0
    },
    totalMembers: {
      type: Number,
      default: 0,
      min: 0
    }
  }
}, {
  timestamps: true,
  collection: 'projects'
});

// Indexes for efficient querying
projectSchema.index({ ownerId: 1, status: 1 });
projectSchema.index({ 'members.userId': 1, status: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ name: 'text', description: 'text' });

// Instance method to check if user is a member
projectSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.userId === userId) || this.ownerId === userId;
};

// Instance method to get user role
projectSchema.methods.getUserRole = function(userId) {
  if (this.ownerId === userId) return 'owner';
  const member = this.members.find(member => member.userId === userId);
  return member ? member.role : null;
};

// Instance method to check permission
projectSchema.methods.hasPermission = function(userId, requiredRole) {
  const role = this.getUserRole(userId);
  if (!role) return false;

  const roleHierarchy = { owner: 4, admin: 3, editor: 2, viewer: 1 };
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  const userLevel = roleHierarchy[role] || 0;

  return userLevel >= requiredLevel;
};

// Instance method to add member
projectSchema.methods.addMember = function(userId, role = 'viewer', addedBy = null) {
  // Check if user is already a member
  if (this.isMember(userId)) {
    throw new Error('User is already a member of this project');
  }

  this.members.push({
    userId,
    role,
    addedAt: new Date(),
    addedBy
  });

  this.metadata.totalMembers = this.members.length;
};

// Instance method to remove member
projectSchema.methods.removeMember = function(userId) {
  if (this.ownerId === userId) {
    throw new Error('Cannot remove project owner');
  }

  const initialLength = this.members.length;
  this.members = this.members.filter(member => member.userId !== userId);

  if (this.members.length === initialLength) {
    throw new Error('Member not found');
  }

  this.metadata.totalMembers = this.members.length;
};

// Instance method to update member role
projectSchema.methods.updateMemberRole = function(userId, newRole) {
  if (this.ownerId === userId) {
    throw new Error('Cannot change owner role');
  }

  const member = this.members.find(m => m.userId === userId);
  if (!member) {
    throw new Error('Member not found');
  }

  member.role = newRole;
};

// Static method to find projects by user
projectSchema.statics.findByUser = function(userId, status = 'active') {
  return this.find({
    $or: [
      { ownerId: userId },
      { 'members.userId': userId }
    ],
    status
  }).sort({ updatedAt: -1 });
};

// Static method to find projects owned by user
projectSchema.statics.findByOwner = function(ownerId, status = 'active') {
  return this.find({ ownerId, status }).sort({ createdAt: -1 });
};

// Static method to search projects
projectSchema.statics.searchProjects = function(query, userId) {
  return this.find({
    $and: [
      {
        $or: [
          { ownerId: userId },
          { 'members.userId': userId }
        ]
      },
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      }
    ],
    status: 'active'
  });
};

// Pre-save hook to update metadata
projectSchema.pre('save', function(next) {
  if (this.isModified('members')) {
    this.metadata.totalMembers = this.members.length;
  }
  if (this.isModified('surveys')) {
    this.metadata.totalSurveys = this.surveys.length;
  }
  if (this.isModified('groups')) {
    this.metadata.totalGroups = this.groups.length;
  }
  next();
});

// Virtual for active surveys count
projectSchema.virtual('activeSurveysCount').get(function() {
  return this.surveys ? this.surveys.length : 0;
});

// Virtual for active groups count
projectSchema.virtual('activeGroupsCount').get(function() {
  return this.groups ? this.groups.length : 0;
});

// Ensure virtuals are included in JSON
projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Project', projectSchema);

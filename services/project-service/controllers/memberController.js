const Project = require('../models/Project');
const redisClient = require('../config/redis');
const kafkaClient = require('../config/kafka');

/**
 * Member Controller
 * Handles project membership operations
 */

/**
 * Get all members of a project
 */
async function getMembers(req, res) {
  try {
    const project = req.project; // From permission middleware

    const members = [
      {
        userId: project.ownerId,
        role: 'owner',
        addedAt: project.createdAt,
        addedBy: null
      },
      ...project.members
    ];

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('Error getting members:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving members',
      error: error.message
    });
  }
}

/**
 * Add a member to a project
 */
async function addMember(req, res) {
  try {
    const { id } = req.params;
    const { userId, role = 'viewer' } = req.body;
    const project = req.project; // From permission middleware
    const addedBy = req.userId || req.headers['x-user-id'];

    // Check if user is already a member
    if (project.isMember(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this project'
      });
    }

    // Add member
    project.addMember(userId, role, addedBy);
    await project.save();

    // Invalidate cache
    await redisClient.del(`project:${id}`);

    // Publish event
    await kafkaClient.publish('project.member.added', {
      projectId: id,
      userId,
      role,
      addedBy,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      data: project.members.find(m => m.userId === userId)
    });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error adding member'
    });
  }
}

/**
 * Remove a member from a project
 */
async function removeMember(req, res) {
  try {
    const { id, userId } = req.params;
    const project = req.project; // From permission middleware
    const removedBy = req.userId || req.headers['x-user-id'];

    // Remove member
    project.removeMember(userId);
    await project.save();

    // Invalidate cache
    await redisClient.del(`project:${id}`);

    // Publish event
    await kafkaClient.publish('project.member.removed', {
      projectId: id,
      userId,
      removedBy,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error removing member'
    });
  }
}

/**
 * Update a member's role
 */
async function updateMemberRole(req, res) {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;
    const project = req.project; // From permission middleware
    const updatedBy = req.userId || req.headers['x-user-id'];

    // Get current role
    const oldRole = project.getUserRole(userId);

    // Update role
    project.updateMemberRole(userId, role);
    await project.save();

    // Invalidate cache
    await redisClient.del(`project:${id}`);

    // Publish event
    await kafkaClient.publish('project.member.role.updated', {
      projectId: id,
      userId,
      oldRole,
      newRole: role,
      updatedBy,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Member role updated successfully',
      data: project.members.find(m => m.userId === userId)
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating member role'
    });
  }
}

/**
 * Get member's role in project
 */
async function getMemberRole(req, res) {
  try {
    const { userId } = req.params;
    const project = req.project; // From permission middleware

    const role = project.getUserRole(userId);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this project'
      });
    }

    res.json({
      success: true,
      data: {
        userId,
        role,
        projectId: project._id
      }
    });
  } catch (error) {
    console.error('Error getting member role:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving member role',
      error: error.message
    });
  }
}

/**
 * Check if user has permission
 */
async function checkPermission(req, res) {
  try {
    const { userId, permission } = req.params;
    const project = req.project; // From permission middleware

    const hasPermission = project.hasPermission(userId, permission);
    const currentRole = project.getUserRole(userId);

    res.json({
      success: true,
      data: {
        userId,
        permission,
        hasPermission,
        currentRole
      }
    });
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking permission',
      error: error.message
    });
  }
}

module.exports = {
  getMembers,
  addMember,
  removeMember,
  updateMemberRole,
  getMemberRole,
  checkPermission
};

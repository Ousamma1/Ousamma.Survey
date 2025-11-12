const Project = require('../models/Project');

/**
 * Role hierarchy for permission checking
 * Higher number = more permissions
 */
const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1
};

/**
 * Permission definitions for different operations
 */
const PERMISSIONS = {
  // Project permissions
  PROJECT_VIEW: 'viewer',
  PROJECT_EDIT: 'editor',
  PROJECT_MANAGE: 'admin',
  PROJECT_DELETE: 'owner',
  PROJECT_TRANSFER: 'owner',

  // Member permissions
  MEMBER_VIEW: 'viewer',
  MEMBER_ADD: 'admin',
  MEMBER_REMOVE: 'admin',
  MEMBER_EDIT_ROLE: 'admin',

  // Survey permissions
  SURVEY_VIEW: 'viewer',
  SURVEY_ADD: 'editor',
  SURVEY_REMOVE: 'editor',
  SURVEY_EDIT: 'editor',

  // Group permissions
  GROUP_VIEW: 'viewer',
  GROUP_CREATE: 'editor',
  GROUP_EDIT: 'editor',
  GROUP_DELETE: 'admin',

  // Settings permissions
  SETTINGS_VIEW: 'viewer',
  SETTINGS_EDIT: 'admin'
};

/**
 * Middleware to check if user has required permission level
 */
function requirePermission(requiredRole) {
  return async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const userId = req.userId || req.headers['x-user-id']; // Get from auth token or header

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Project ID is required'
        });
      }

      // Find the project
      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Check if project is archived
      if (project.status === 'archived' && requiredRole !== 'owner') {
        return res.status(403).json({
          success: false,
          message: 'Project is archived'
        });
      }

      // Check permission
      if (!project.hasPermission(userId, requiredRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: requiredRole,
          current: project.getUserRole(userId) || 'none'
        });
      }

      // Attach project and user role to request
      req.project = project;
      req.userRole = project.getUserRole(userId);

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking permissions',
        error: error.message
      });
    }
  };
}

/**
 * Middleware to check if user is project owner
 */
function requireOwner(req, res, next) {
  return requirePermission('owner')(req, res, next);
}

/**
 * Middleware to check if user is admin or above
 */
function requireAdmin(req, res, next) {
  return requirePermission('admin')(req, res, next);
}

/**
 * Middleware to check if user is editor or above
 */
function requireEditor(req, res, next) {
  return requirePermission('editor')(req, res, next);
}

/**
 * Middleware to check if user is viewer or above (any member)
 */
function requireViewer(req, res, next) {
  return requirePermission('viewer')(req, res, next);
}

/**
 * Check if user has permission without middleware
 */
async function checkPermission(userId, projectId, requiredRole) {
  try {
    const project = await Project.findById(projectId);
    if (!project) return false;
    return project.hasPermission(userId, requiredRole);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Check if user is member of project
 */
async function isMember(userId, projectId) {
  try {
    const project = await Project.findById(projectId);
    if (!project) return false;
    return project.isMember(userId);
  } catch (error) {
    console.error('Error checking membership:', error);
    return false;
  }
}

/**
 * Get user's role in project
 */
async function getUserRole(userId, projectId) {
  try {
    const project = await Project.findById(projectId);
    if (!project) return null;
    return project.getUserRole(userId);
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Compare role levels
 */
function compareRoles(role1, role2) {
  const level1 = ROLE_HIERARCHY[role1] || 0;
  const level2 = ROLE_HIERARCHY[role2] || 0;
  return level1 - level2;
}

/**
 * Check if role1 has higher or equal level than role2
 */
function hasRoleLevel(role1, role2) {
  return compareRoles(role1, role2) >= 0;
}

module.exports = {
  ROLE_HIERARCHY,
  PERMISSIONS,
  requirePermission,
  requireOwner,
  requireAdmin,
  requireEditor,
  requireViewer,
  checkPermission,
  isMember,
  getUserRole,
  compareRoles,
  hasRoleLevel
};

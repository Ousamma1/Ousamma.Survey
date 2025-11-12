const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const memberController = require('../controllers/memberController');
const groupController = require('../controllers/groupController');
const analyticsController = require('../controllers/analyticsController');
const { validate, validateObjectId } = require('../middleware/validation');
const { requireOwner, requireAdmin, requireEditor, requireViewer } = require('../middleware/permissions');

/**
 * Project Routes
 */

// Get user's project statistics
router.get('/stats', projectController.getProjectStats);

// Get all projects for the authenticated user
router.get('/', validate('projectQuery', 'query'), projectController.getProjects);

// Create a new project
router.post('/', validate('createProject'), projectController.createProject);

// Get a specific project
router.get('/:id', validateObjectId('id'), requireViewer, projectController.getProject);

// Update a project
router.put('/:id', validateObjectId('id'), validate('updateProject'), requireAdmin, projectController.updateProject);

// Archive a project
router.post('/:id/archive', validateObjectId('id'), requireOwner, projectController.archiveProject);

// Delete a project permanently
router.delete('/:id', validateObjectId('id'), requireOwner, projectController.deleteProject);

/**
 * Member Routes
 */

// Get all members of a project
router.get('/:id/members', validateObjectId('id'), requireViewer, memberController.getMembers);

// Add a member to a project
router.post('/:id/members', validateObjectId('id'), validate('addMember'), requireAdmin, memberController.addMember);

// Get a specific member's role
router.get('/:id/members/:userId', validateObjectId('id'), requireViewer, memberController.getMemberRole);

// Update a member's role
router.put('/:id/members/:userId', validateObjectId('id'), validate('updateMemberRole'), requireAdmin, memberController.updateMemberRole);

// Remove a member from a project
router.delete('/:id/members/:userId', validateObjectId('id'), requireAdmin, memberController.removeMember);

// Check if a user has a specific permission
router.get('/:id/members/:userId/permissions/:permission', validateObjectId('id'), requireViewer, memberController.checkPermission);

/**
 * Group Routes
 */

// Get all groups in a project
router.get('/:id/groups', validateObjectId('id'), validate('groupQuery', 'query'), requireViewer, groupController.getGroups);

// Create a new group
router.post('/:id/groups', validateObjectId('id'), validate('createGroup'), requireEditor, groupController.createGroup);

// Get a specific group
router.get('/:id/groups/:groupId', validateObjectId('id'), validateObjectId('groupId'), requireViewer, groupController.getGroup);

// Update a group
router.put('/:id/groups/:groupId', validateObjectId('id'), validateObjectId('groupId'), validate('updateGroup'), requireEditor, groupController.updateGroup);

// Delete a group
router.delete('/:id/groups/:groupId', validateObjectId('id'), validateObjectId('groupId'), requireAdmin, groupController.deleteGroup);

// Add a survey to a group
router.post('/:id/groups/:groupId/surveys', validateObjectId('id'), validateObjectId('groupId'), validate('addSurveyToGroup'), requireEditor, groupController.addSurveyToGroup);

// Remove a survey from a group
router.delete('/:id/groups/:groupId/surveys/:surveyId', validateObjectId('id'), validateObjectId('groupId'), requireEditor, groupController.removeSurveyFromGroup);

/**
 * Analytics Routes
 */

// Get project-wide analytics
router.get('/:id/analytics', validateObjectId('id'), requireViewer, analyticsController.getProjectAnalytics);

// Export project analytics
router.get('/:id/analytics/export', validateObjectId('id'), requireViewer, analyticsController.exportProjectAnalytics);

// Get group analytics
router.get('/:id/groups/:groupId/analytics', validateObjectId('id'), validateObjectId('groupId'), requireViewer, analyticsController.getGroupAnalytics);

// Get cross-survey analytics for a group
router.get('/:id/groups/:groupId/analytics/cross-survey', validateObjectId('id'), validateObjectId('groupId'), requireViewer, analyticsController.getCrossSurveyAnalytics);

// Compare multiple groups
router.get('/:id/analytics/compare', validateObjectId('id'), requireViewer, analyticsController.compareGroups);

module.exports = router;

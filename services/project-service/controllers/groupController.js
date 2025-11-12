const SurveyGroup = require('../models/SurveyGroup');
const Project = require('../models/Project');
const redisClient = require('../config/redis');
const kafkaClient = require('../config/kafka');

/**
 * Group Controller
 * Handles survey group operations
 */

/**
 * Get all groups in a project
 */
async function getGroups(req, res) {
  try {
    const { id } = req.params;
    const { status = 'active', page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const groups = await SurveyGroup.find({ projectId: id, status })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SurveyGroup.countDocuments({ projectId: id, status });

    res.json({
      success: true,
      data: groups,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving groups',
      error: error.message
    });
  }
}

/**
 * Get a single group by ID
 */
async function getGroup(req, res) {
  try {
    const { groupId } = req.params;

    const group = await SurveyGroup.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error getting group:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving group',
      error: error.message
    });
  }
}

/**
 * Create a new group
 */
async function createGroup(req, res) {
  try {
    const { id } = req.params;
    const { name, description, settings } = req.body;
    const createdBy = req.userId || req.headers['x-user-id'];
    const project = req.project; // From permission middleware

    // Create group
    const group = new SurveyGroup({
      projectId: id,
      name,
      description,
      createdBy,
      settings: settings || {},
      surveyIds: []
    });

    await group.save();

    // Update project
    project.groups.push(group._id.toString());
    await project.save();

    // Invalidate cache
    await redisClient.del(`project:${id}`);

    // Publish event
    await kafkaClient.publish('group.created', {
      groupId: group._id.toString(),
      projectId: id,
      name: group.name,
      createdBy,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: group
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating group',
      error: error.message
    });
  }
}

/**
 * Update a group
 */
async function updateGroup(req, res) {
  try {
    const { groupId } = req.params;
    const updates = req.body;

    const group = await SurveyGroup.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'projectId' && key !== 'surveyIds' && key !== 'createdBy') {
        if (key === 'settings' && group.settings) {
          group.settings = { ...group.settings, ...updates.settings };
        } else {
          group[key] = updates[key];
        }
      }
    });

    await group.save();

    // Publish event
    await kafkaClient.publish('group.updated', {
      groupId: group._id.toString(),
      projectId: group.projectId,
      updates: Object.keys(updates),
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Group updated successfully',
      data: group
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating group',
      error: error.message
    });
  }
}

/**
 * Delete a group
 */
async function deleteGroup(req, res) {
  try {
    const { id, groupId } = req.params;
    const project = req.project; // From permission middleware

    const group = await SurveyGroup.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Remove group from project
    project.groups = project.groups.filter(g => g !== groupId);
    await project.save();

    // Delete group
    await SurveyGroup.findByIdAndDelete(groupId);

    // Invalidate cache
    await redisClient.del(`project:${id}`);

    // Publish event
    await kafkaClient.publish('group.deleted', {
      groupId,
      projectId: id,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting group',
      error: error.message
    });
  }
}

/**
 * Add survey to group
 */
async function addSurveyToGroup(req, res) {
  try {
    const { groupId } = req.params;
    const { surveyId } = req.body;

    const group = await SurveyGroup.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Add survey to group
    group.addSurvey(surveyId);
    await group.save();

    // Publish event
    await kafkaClient.publish('group.survey.added', {
      groupId: group._id.toString(),
      projectId: group.projectId,
      surveyId,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Survey added to group successfully',
      data: group
    });
  } catch (error) {
    console.error('Error adding survey to group:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error adding survey to group'
    });
  }
}

/**
 * Remove survey from group
 */
async function removeSurveyFromGroup(req, res) {
  try {
    const { groupId, surveyId } = req.params;

    const group = await SurveyGroup.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Remove survey from group
    group.removeSurvey(surveyId);
    await group.save();

    // Publish event
    await kafkaClient.publish('group.survey.removed', {
      groupId: group._id.toString(),
      projectId: group.projectId,
      surveyId,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Survey removed from group successfully',
      data: group
    });
  } catch (error) {
    console.error('Error removing survey from group:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error removing survey from group'
    });
  }
}

module.exports = {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  addSurveyToGroup,
  removeSurveyFromGroup
};

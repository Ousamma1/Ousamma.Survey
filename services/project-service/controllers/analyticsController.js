const SurveyGroup = require('../models/SurveyGroup');
const Project = require('../models/Project');
const redisClient = require('../config/redis');

/**
 * Analytics Controller
 * Handles project and group analytics
 */

/**
 * Get project-wide analytics
 */
async function getProjectAnalytics(req, res) {
  try {
    const { id } = req.params;
    const project = req.project; // From permission middleware

    // Check cache
    const cacheKey = `analytics:project:${id}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true
      });
    }

    // Get groups
    const groups = await SurveyGroup.find({ projectId: id, status: 'active' });

    // Calculate analytics
    const analytics = {
      projectId: id,
      projectName: project.name,
      overview: {
        totalSurveys: project.metadata.totalSurveys || 0,
        totalGroups: project.metadata.totalGroups || 0,
        totalMembers: project.metadata.totalMembers || 0,
        activeSurveys: project.surveys ? project.surveys.length : 0
      },
      groups: groups.map(g => ({
        id: g._id,
        name: g.name,
        surveyCount: g.surveyIds.length,
        totalResponses: g.metadata.totalResponses || 0,
        lastActivity: g.metadata.lastActivityAt
      })),
      activity: {
        lastUpdated: project.updatedAt,
        createdAt: project.createdAt,
        daysActive: Math.floor((Date.now() - project.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      },
      members: {
        total: project.members.length + 1, // +1 for owner
        byRole: {
          owner: 1,
          admin: project.members.filter(m => m.role === 'admin').length,
          editor: project.members.filter(m => m.role === 'editor').length,
          viewer: project.members.filter(m => m.role === 'viewer').length
        }
      }
    };

    // Cache for 5 minutes
    await redisClient.set(cacheKey, JSON.stringify(analytics), 300);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting project analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving project analytics',
      error: error.message
    });
  }
}

/**
 * Get group analytics
 */
async function getGroupAnalytics(req, res) {
  try {
    const { groupId } = req.params;

    // Check cache
    const cacheKey = `analytics:group:${groupId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true
      });
    }

    const group = await SurveyGroup.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Calculate analytics
    const analytics = {
      groupId: group._id,
      groupName: group.name,
      projectId: group.projectId,
      overview: {
        totalSurveys: group.surveyIds.length,
        totalResponses: group.metadata.totalResponses || 0,
        lastActivity: group.metadata.lastActivityAt
      },
      surveys: group.surveyIds.map(surveyId => ({
        id: surveyId,
        // This would typically fetch data from the analytics service
        // For now, we'll return basic info
        groupId: group._id
      })),
      timeline: {
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        lastActivity: group.metadata.lastActivityAt,
        daysActive: Math.floor((Date.now() - group.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      }
    };

    // Cache for 5 minutes
    await redisClient.set(cacheKey, JSON.stringify(analytics), 300);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting group analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving group analytics',
      error: error.message
    });
  }
}

/**
 * Compare multiple groups
 */
async function compareGroups(req, res) {
  try {
    const { groupIds } = req.query;

    if (!groupIds) {
      return res.status(400).json({
        success: false,
        message: 'Group IDs are required'
      });
    }

    const ids = groupIds.split(',');
    const groups = await SurveyGroup.find({ _id: { $in: ids }, status: 'active' });

    const comparison = groups.map(group => ({
      id: group._id,
      name: group.name,
      projectId: group.projectId,
      surveyCount: group.surveyIds.length,
      totalResponses: group.metadata.totalResponses || 0,
      lastActivity: group.metadata.lastActivityAt,
      createdAt: group.createdAt
    }));

    // Calculate totals
    const totals = {
      totalGroups: comparison.length,
      totalSurveys: comparison.reduce((sum, g) => sum + g.surveyCount, 0),
      totalResponses: comparison.reduce((sum, g) => sum + g.totalResponses, 0)
    };

    res.json({
      success: true,
      data: {
        groups: comparison,
        totals
      }
    });
  } catch (error) {
    console.error('Error comparing groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error comparing groups',
      error: error.message
    });
  }
}

/**
 * Export project analytics
 */
async function exportProjectAnalytics(req, res) {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;
    const project = req.project; // From permission middleware

    // Get groups
    const groups = await SurveyGroup.find({ projectId: id });

    const data = {
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      statistics: {
        totalSurveys: project.metadata.totalSurveys || 0,
        totalGroups: project.metadata.totalGroups || 0,
        totalMembers: project.metadata.totalMembers || 0
      },
      groups: groups.map(g => ({
        id: g._id,
        name: g.name,
        surveyCount: g.surveyIds.length,
        totalResponses: g.metadata.totalResponses || 0,
        createdAt: g.createdAt
      })),
      members: [
        { userId: project.ownerId, role: 'owner' },
        ...project.members
      ],
      exportedAt: new Date().toISOString()
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="project-${id}-analytics.json"`);
      res.json(data);
    } else {
      res.status(400).json({
        success: false,
        message: 'Unsupported format. Use: json'
      });
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting analytics',
      error: error.message
    });
  }
}

/**
 * Get cross-survey analytics for a group
 */
async function getCrossSurveyAnalytics(req, res) {
  try {
    const { groupId } = req.params;

    const group = await SurveyGroup.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // This would integrate with the analytics service to get actual survey data
    // For now, return a structured response
    const analytics = {
      groupId: group._id,
      groupName: group.name,
      surveys: group.surveyIds,
      comparison: {
        totalSurveys: group.surveyIds.length,
        // Additional cross-survey metrics would be calculated here
        // by fetching data from the analytics service
      },
      message: 'Cross-survey analytics would integrate with analytics-service for detailed metrics'
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting cross-survey analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cross-survey analytics',
      error: error.message
    });
  }
}

module.exports = {
  getProjectAnalytics,
  getGroupAnalytics,
  compareGroups,
  exportProjectAnalytics,
  getCrossSurveyAnalytics
};

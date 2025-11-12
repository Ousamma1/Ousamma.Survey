const Project = require('../models/Project');
const redisClient = require('../config/redis');
const kafkaClient = require('../config/kafka');

/**
 * Project Controller
 * Handles project CRUD operations
 */

/**
 * Create a new project
 */
async function createProject(req, res) {
  try {
    const userId = req.userId || req.headers['x-user-id'];
    const { name, description, settings } = req.body;

    // Create project
    const project = new Project({
      name,
      description,
      ownerId: userId,
      settings: settings || {},
      members: [],
      surveys: [],
      groups: []
    });

    await project.save();

    // Publish event
    await kafkaClient.publish('project.created', {
      projectId: project._id.toString(),
      ownerId: userId,
      name: project.name,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating project',
      error: error.message
    });
  }
}

/**
 * Get all projects for a user
 */
async function getProjects(req, res) {
  try {
    const userId = req.userId || req.headers['x-user-id'];
    const { status = 'active', search, page = 1, limit = 10, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;

    // Build query
    let query = {
      $or: [
        { ownerId: userId },
        { 'members.userId': userId }
      ],
      status
    };

    if (search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Get projects
    const projects = await Project.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      data: projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving projects',
      error: error.message
    });
  }
}

/**
 * Get a single project by ID
 */
async function getProject(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId || req.headers['x-user-id'];

    // Check cache first
    const cacheKey = `project:${id}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      const project = JSON.parse(cached);
      // Verify user has access
      if (project.ownerId === userId || project.members.some(m => m.userId === userId)) {
        return res.json({
          success: true,
          data: project,
          cached: true
        });
      }
    }

    // Get from database
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access
    if (!project.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Cache the result
    await redisClient.set(cacheKey, JSON.stringify(project), 300); // 5 minutes TTL

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving project',
      error: error.message
    });
  }
}

/**
 * Update a project
 */
async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    const project = req.project; // From permission middleware

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'ownerId' && key !== 'members') {
        if (key === 'settings' && project.settings) {
          project.settings = { ...project.settings, ...updates.settings };
        } else {
          project[key] = updates[key];
        }
      }
    });

    await project.save();

    // Invalidate cache
    await redisClient.del(`project:${id}`);

    // Publish event
    await kafkaClient.publish('project.updated', {
      projectId: project._id.toString(),
      updates: Object.keys(updates),
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating project',
      error: error.message
    });
  }
}

/**
 * Archive a project (soft delete)
 */
async function archiveProject(req, res) {
  try {
    const { id } = req.params;
    const project = req.project; // From permission middleware

    project.status = 'archived';
    await project.save();

    // Invalidate cache
    await redisClient.del(`project:${id}`);

    // Publish event
    await kafkaClient.publish('project.archived', {
      projectId: project._id.toString(),
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Project archived successfully',
      data: project
    });
  } catch (error) {
    console.error('Error archiving project:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving project',
      error: error.message
    });
  }
}

/**
 * Delete a project permanently
 */
async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const project = req.project; // From permission middleware

    await Project.findByIdAndDelete(id);

    // Invalidate cache
    await redisClient.del(`project:${id}`);

    // Publish event
    await kafkaClient.publish('project.deleted', {
      projectId: id,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Project deleted permanently'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting project',
      error: error.message
    });
  }
}

/**
 * Get project statistics
 */
async function getProjectStats(req, res) {
  try {
    const userId = req.userId || req.headers['x-user-id'];

    const stats = {
      totalProjects: 0,
      activeProjects: 0,
      archivedProjects: 0,
      ownedProjects: 0,
      memberProjects: 0
    };

    // Get all projects user has access to
    const allProjects = await Project.find({
      $or: [
        { ownerId: userId },
        { 'members.userId': userId }
      ]
    });

    stats.totalProjects = allProjects.length;
    stats.activeProjects = allProjects.filter(p => p.status === 'active').length;
    stats.archivedProjects = allProjects.filter(p => p.status === 'archived').length;
    stats.ownedProjects = allProjects.filter(p => p.ownerId === userId).length;
    stats.memberProjects = allProjects.filter(p => p.ownerId !== userId).length;

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting project stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving project statistics',
      error: error.message
    });
  }
}

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  archiveProject,
  deleteProject,
  getProjectStats
};

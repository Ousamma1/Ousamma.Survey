const websocketService = require('../services/websocketService');
const RoomManager = require('../utils/roomManager');
const logger = require('../config/logger');
const { messageRateLimit } = require('../middleware/rateLimiter');

/**
 * Broadcast Controller
 * HTTP API for triggering WebSocket broadcasts
 */

/**
 * Broadcast to a specific room
 */
const broadcastToRoom = async (req, res) => {
  try {
    const { room, event, data } = req.body;

    if (!room || !event || !data) {
      return res.status(400).json({
        error: 'Missing required fields: room, event, data'
      });
    }

    // Validate room format
    if (!RoomManager.isValidRoom(room)) {
      return res.status(400).json({
        error: 'Invalid room format'
      });
    }

    // Broadcast
    websocketService.broadcastToRoom(room, event, data);

    logger.info(`Broadcast to room ${room}: ${event}`);

    res.json({
      success: true,
      room,
      event,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Error broadcasting to room:', error);
    res.status(500).json({
      error: 'Failed to broadcast message',
      message: error.message
    });
  }
};

/**
 * Broadcast to a specific user
 */
const broadcastToUser = async (req, res) => {
  try {
    const { userId, event, data } = req.body;

    if (!userId || !event || !data) {
      return res.status(400).json({
        error: 'Missing required fields: userId, event, data'
      });
    }

    // Broadcast
    websocketService.broadcastToUser(userId, event, data);

    logger.info(`Broadcast to user ${userId}: ${event}`);

    res.json({
      success: true,
      userId,
      event,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Error broadcasting to user:', error);
    res.status(500).json({
      error: 'Failed to broadcast message',
      message: error.message
    });
  }
};

/**
 * Global broadcast
 */
const broadcastGlobal = async (req, res) => {
  try {
    const { event, data } = req.body;

    if (!event || !data) {
      return res.status(400).json({
        error: 'Missing required fields: event, data'
      });
    }

    // Broadcast
    websocketService.broadcastGlobal(event, data);

    logger.info(`Global broadcast: ${event}`);

    res.json({
      success: true,
      event,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Error broadcasting globally:', error);
    res.status(500).json({
      error: 'Failed to broadcast message',
      message: error.message
    });
  }
};

/**
 * Get WebSocket statistics
 */
const getStats = (req, res) => {
  try {
    const stats = websocketService.getStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Error getting stats:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message
    });
  }
};

/**
 * Broadcast survey response notification
 */
const broadcastSurveyResponse = async (req, res) => {
  try {
    const { surveyId, responseId, response, metadata } = req.body;

    if (!surveyId || !responseId) {
      return res.status(400).json({
        error: 'Missing required fields: surveyId, responseId'
      });
    }

    // Broadcast to survey room
    const surveyRoom = RoomManager.getSurveyRoom(surveyId);
    websocketService.broadcastToRoom(surveyRoom, 'response.new', {
      type: 'response.new',
      surveyId,
      responseId,
      response,
      metadata
    });

    // Broadcast to project room if applicable
    if (metadata?.projectId) {
      const projectRoom = RoomManager.getProjectRoom(metadata.projectId);
      websocketService.broadcastToRoom(projectRoom, 'response.new', {
        type: 'response.new',
        surveyId,
        responseId,
        response,
        metadata
      });
    }

    logger.info(`Survey response broadcast: Survey ${surveyId}, Response ${responseId}`);

    res.json({
      success: true,
      surveyId,
      responseId,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Error broadcasting survey response:', error);
    res.status(500).json({
      error: 'Failed to broadcast survey response',
      message: error.message
    });
  }
};

/**
 * Broadcast location update
 */
const broadcastLocationUpdate = async (req, res) => {
  try {
    const { surveyorId, surveyId, projectId, location, metadata } = req.body;

    if (!surveyorId || !location) {
      return res.status(400).json({
        error: 'Missing required fields: surveyorId, location'
      });
    }

    // Broadcast to appropriate rooms
    if (surveyId) {
      const surveyRoom = RoomManager.getSurveyRoom(surveyId);
      websocketService.broadcastToRoom(surveyRoom, 'surveyor.location', {
        type: 'surveyor.location',
        surveyorId,
        surveyId,
        location,
        metadata
      });
    }

    if (projectId) {
      const projectRoom = RoomManager.getProjectRoom(projectId);
      websocketService.broadcastToRoom(projectRoom, 'surveyor.location', {
        type: 'surveyor.location',
        surveyorId,
        projectId,
        location,
        metadata
      });
    }

    logger.info(`Location update broadcast: Surveyor ${surveyorId}`);

    res.json({
      success: true,
      surveyorId,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Error broadcasting location update:', error);
    res.status(500).json({
      error: 'Failed to broadcast location update',
      message: error.message
    });
  }
};

module.exports = {
  broadcastToRoom,
  broadcastToUser,
  broadcastGlobal,
  getStats,
  broadcastSurveyResponse,
  broadcastLocationUpdate
};

const Activity = require('../models/Activity');
const Surveyor = require('../models/Surveyor');

// Log activity
exports.logActivity = async (req, res) => {
  try {
    const {
      surveyorId,
      activityType,
      location,
      relatedSurveyId,
      relatedAssignmentId,
      relatedResponseId,
      sessionId,
      sessionDuration,
      deviceInfo,
      metadata,
      notes
    } = req.body;

    // Validate surveyor exists
    const surveyor = await Surveyor.findOne({ id: surveyorId });

    if (!surveyor) {
      return res.status(404).json({ error: 'Surveyor not found' });
    }

    // Log the activity
    const activity = await Activity.logActivity({
      surveyorId,
      activityType,
      location,
      relatedSurveyId,
      relatedAssignmentId,
      relatedResponseId,
      sessionId,
      sessionDuration,
      deviceInfo,
      metadata,
      notes
    });

    // Update surveyor's last login if it's a login activity
    if (activityType === 'login') {
      surveyor.lastLoginAt = new Date();
      await surveyor.save();
    }

    res.status(201).json({
      success: true,
      message: 'Activity logged successfully',
      activity
    });

  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get activities for a surveyor
exports.getSurveyorActivities = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      activityType,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const surveyor = await Surveyor.findOne({ id });

    if (!surveyor) {
      return res.status(404).json({ error: 'Surveyor not found' });
    }

    // Build query
    const query = { surveyorId: id };

    if (activityType) {
      query.activityType = activityType;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Activity.countDocuments(query)
    ]);

    res.json({
      success: true,
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error getting activities:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get daily activity summary
exports.getDailySummary = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const surveyor = await Surveyor.findOne({ id });

    if (!surveyor) {
      return res.status(404).json({ error: 'Surveyor not found' });
    }

    const targetDate = date ? new Date(date) : new Date();
    const summary = await Activity.getDailySummary(id, targetDate);

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Error getting daily summary:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get response locations
exports.getResponseLocations = async (req, res) => {
  try {
    const { id } = req.params;
    const { surveyId } = req.query;

    const surveyor = await Surveyor.findOne({ id });

    if (!surveyor) {
      return res.status(404).json({ error: 'Surveyor not found' });
    }

    if (!surveyId) {
      return res.status(400).json({ error: 'Survey ID is required' });
    }

    const locations = await Activity.getResponseLocations(id, surveyId);

    res.json({
      success: true,
      locations
    });

  } catch (error) {
    console.error('Error getting response locations:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get activity statistics
exports.getActivityStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const surveyor = await Surveyor.findOne({ id });

    if (!surveyor) {
      return res.status(404).json({ error: 'Surveyor not found' });
    }

    // Build query
    const query = { surveyorId: id };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Get activity counts by type
    const activityCounts = await Activity.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total session duration
    const sessionStats = await Activity.aggregate([
      {
        $match: {
          ...query,
          sessionDuration: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          totalDuration: { $sum: '$sessionDuration' },
          avgDuration: { $avg: '$sessionDuration' },
          maxDuration: { $max: '$sessionDuration' },
          minDuration: { $min: '$sessionDuration' }
        }
      }
    ]);

    // Get daily activity breakdown
    const dailyBreakdown = await Activity.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 },
          logins: {
            $sum: { $cond: [{ $eq: ['$activityType', 'login'] }, 1, 0] }
          },
          responses: {
            $sum: { $cond: [{ $eq: ['$activityType', 'response_submission'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    const stats = {
      surveyorId: id,
      surveyorName: surveyor.name,
      period: {
        startDate: startDate || 'all time',
        endDate: endDate || 'now'
      },
      activityCounts: activityCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      sessionStats: sessionStats[0] || {
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0
      },
      dailyBreakdown
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error getting activity stats:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all activities (admin)
exports.getAllActivities = async (req, res) => {
  try {
    const {
      surveyorId,
      activityType,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    // Build query
    const query = {};

    if (surveyorId) {
      query.surveyorId = surveyorId;
    }

    if (activityType) {
      query.activityType = activityType;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Activity.countDocuments(query)
    ]);

    res.json({
      success: true,
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error getting all activities:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;

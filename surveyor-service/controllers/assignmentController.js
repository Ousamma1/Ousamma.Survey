const { v4: uuidv4 } = require('uuid');
const Assignment = require('../models/Assignment');
const Surveyor = require('../models/Surveyor');

// Assign survey to surveyor
exports.assignSurvey = async (req, res) => {
  try {
    const { surveyorId, surveyId, territoryId, targetResponses, startDate, endDate } = req.body;

    // Validate surveyor exists and is active
    const surveyor = await Surveyor.findOne({ id: surveyorId });

    if (!surveyor) {
      return res.status(404).json({ error: 'Surveyor not found' });
    }

    if (surveyor.status !== 'active') {
      return res.status(400).json({ error: 'Surveyor is not active' });
    }

    if (surveyor.isExpired()) {
      return res.status(400).json({ error: 'Surveyor account has expired' });
    }

    // Create assignment
    const assignment = new Assignment({
      id: uuidv4(),
      surveyorId,
      surveyId,
      territoryId,
      targetResponses,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: new Date(endDate),
      status: 'pending',
      assignedBy: req.user?.id || 'admin'
    });

    await assignment.save();

    // Update surveyor's assigned surveys
    if (!surveyor.assignedSurveys.includes(assignment.id)) {
      surveyor.assignedSurveys.push(assignment.id);
    }

    if (territoryId && !surveyor.assignedTerritories.includes(territoryId)) {
      surveyor.assignedTerritories.push(territoryId);
    }

    await surveyor.save();

    res.status(201).json({
      success: true,
      message: 'Survey assigned successfully',
      assignment
    });

  } catch (error) {
    console.error('Error assigning survey:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get assignments for a surveyor
exports.getSurveyorAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, includeExpired = false } = req.query;

    const surveyor = await Surveyor.findOne({ id });

    if (!surveyor) {
      return res.status(404).json({ error: 'Surveyor not found' });
    }

    // Build query
    const query = { surveyorId: id };

    if (status) {
      query.status = status;
    }

    if (!includeExpired) {
      query.endDate = { $gte: new Date() };
    }

    const assignments = await Assignment.find(query).sort({ startDate: -1 });

    res.json({
      success: true,
      assignments
    });

  } catch (error) {
    console.error('Error getting assignments:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all assignments (admin)
exports.getAllAssignments = async (req, res) => {
  try {
    const {
      surveyorId,
      surveyId,
      status,
      page = 1,
      limit = 20,
      sortBy = 'assignedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (surveyorId) {
      query.surveyorId = surveyorId;
    }

    if (surveyId) {
      query.surveyId = surveyId;
    }

    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Assignment.countDocuments(query)
    ]);

    res.json({
      success: true,
      assignments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error getting assignments:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get assignment by ID
exports.getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findOne({ id });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error getting assignment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update assignment
exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating certain fields
    delete updates.id;
    delete updates.surveyorId;
    delete updates.assignedBy;
    delete updates.assignedAt;

    const assignment = await Assignment.findOne({ id });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      assignment[key] = updates[key];
    });

    await assignment.save();

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      assignment
    });

  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Activate assignment
exports.activateAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findOne({ id });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await assignment.activate();

    res.json({
      success: true,
      message: 'Assignment activated successfully',
      assignment
    });

  } catch (error) {
    console.error('Error activating assignment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Cancel assignment
exports.cancelAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const assignment = await Assignment.findOne({ id });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await assignment.cancel(reason);

    res.json({
      success: true,
      message: 'Assignment cancelled successfully',
      assignment
    });

  } catch (error) {
    console.error('Error cancelling assignment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Record response submission (increment achieved responses)
exports.recordResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { count = 1 } = req.body;

    const assignment = await Assignment.findOne({ id });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await assignment.incrementResponses(count);

    res.json({
      success: true,
      message: 'Response recorded successfully',
      assignment
    });

  } catch (error) {
    console.error('Error recording response:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get assignment statistics
exports.getAssignmentStats = async (req, res) => {
  try {
    const stats = await Assignment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalTarget: { $sum: '$targetResponses' },
          totalAchieved: { $sum: '$achievedResponses' }
        }
      }
    ]);

    const formattedStats = {
      byStatus: {},
      overall: {
        totalAssignments: 0,
        totalTarget: 0,
        totalAchieved: 0,
        overallProgress: 0
      }
    };

    stats.forEach(stat => {
      formattedStats.byStatus[stat._id] = {
        count: stat.count,
        totalTarget: stat.totalTarget,
        totalAchieved: stat.totalAchieved,
        progress: stat.totalTarget > 0 ? Math.round((stat.totalAchieved / stat.totalTarget) * 100) : 0
      };

      formattedStats.overall.totalAssignments += stat.count;
      formattedStats.overall.totalTarget += stat.totalTarget;
      formattedStats.overall.totalAchieved += stat.totalAchieved;
    });

    if (formattedStats.overall.totalTarget > 0) {
      formattedStats.overall.overallProgress = Math.round(
        (formattedStats.overall.totalAchieved / formattedStats.overall.totalTarget) * 100
      );
    }

    res.json({
      success: true,
      stats: formattedStats
    });

  } catch (error) {
    console.error('Error getting assignment stats:', error);
    res.status(500).json({ error: error.message });
  }
};

// Bulk assign surveys
exports.bulkAssign = async (req, res) => {
  try {
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'Invalid assignments data' });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const assignmentData of assignments) {
      try {
        const { surveyorId, surveyId, territoryId, targetResponses, startDate, endDate } = assignmentData;

        // Validate surveyor
        const surveyor = await Surveyor.findOne({ id: surveyorId });

        if (!surveyor || surveyor.status !== 'active' || surveyor.isExpired()) {
          results.failed.push({
            surveyorId,
            surveyId,
            error: 'Surveyor not found, inactive, or expired'
          });
          continue;
        }

        // Create assignment
        const assignment = new Assignment({
          id: uuidv4(),
          surveyorId,
          surveyId,
          territoryId,
          targetResponses,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: new Date(endDate),
          status: 'pending',
          assignedBy: req.user?.id || 'admin'
        });

        await assignment.save();

        // Update surveyor
        if (!surveyor.assignedSurveys.includes(assignment.id)) {
          surveyor.assignedSurveys.push(assignment.id);
        }

        if (territoryId && !surveyor.assignedTerritories.includes(territoryId)) {
          surveyor.assignedTerritories.push(territoryId);
        }

        await surveyor.save();

        results.successful.push({
          assignmentId: assignment.id,
          surveyorId,
          surveyId
        });

      } catch (error) {
        results.failed.push({
          surveyorId: assignmentData.surveyorId,
          surveyId: assignmentData.surveyId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk assignment completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      results
    });

  } catch (error) {
    console.error('Error in bulk assignment:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;

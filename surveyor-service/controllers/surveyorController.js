const { v4: uuidv4 } = require('uuid');
const Surveyor = require('../models/Surveyor');
const Assignment = require('../models/Assignment');
const Activity = require('../models/Activity');

// Generate random password
const generatePassword = (length = 10) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Create new surveyor
exports.createSurveyor = async (req, res) => {
  try {
    const { name, email, phone, assignedTerritories, region, languages, notes, expirationDays } = req.body;

    // Check if surveyor already exists
    const existingSurveyor = await Surveyor.findOne({ email });
    if (existingSurveyor) {
      return res.status(400).json({ error: 'Surveyor with this email already exists' });
    }

    // Generate temporary password
    const temporaryPassword = generatePassword(parseInt(process.env.DEFAULT_PASSWORD_LENGTH) || 10);

    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + (expirationDays || parseInt(process.env.ACCOUNT_EXPIRATION_DAYS) || 30));

    // Create surveyor
    const surveyor = new Surveyor({
      id: uuidv4(),
      name,
      email,
      phone,
      temporaryPassword, // Will be hashed by pre-save hook
      expirationDate,
      assignedTerritories: assignedTerritories || [],
      region,
      languages: languages || [],
      notes,
      createdBy: req.user?.id || 'admin', // Assuming auth middleware sets req.user
      status: 'active'
    });

    await surveyor.save();

    // Return surveyor data with temporary password (only time it's visible)
    const surveyorData = surveyor.toObject();
    surveyorData.plainPassword = temporaryPassword; // Include plain password in response
    delete surveyorData.temporaryPassword; // Remove hashed password from response

    res.status(201).json({
      success: true,
      message: 'Surveyor created successfully',
      surveyor: surveyorData
    });

  } catch (error) {
    console.error('Error creating surveyor:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all surveyors with filtering and pagination
exports.getSurveyors = async (req, res) => {
  try {
    const {
      status,
      region,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (region) {
      query.region = region;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const [surveyors, total] = await Promise.all([
      Surveyor.find(query)
        .select('-temporaryPassword')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Surveyor.countDocuments(query)
    ]);

    // Check for expired accounts and update status
    const now = new Date();
    const updatePromises = surveyors.map(async (surveyor) => {
      if (surveyor.isExpired() && surveyor.status !== 'expired') {
        surveyor.status = 'expired';
        await surveyor.save();
      }
      return surveyor;
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      surveyors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error getting surveyors:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get surveyor by ID
exports.getSurveyorById = async (req, res) => {
  try {
    const { id } = req.params;

    const surveyor = await Surveyor.findOne({ id }).select('-temporaryPassword');

    if (!surveyor) {
      return res.status(404).json({ error: 'Surveyor not found' });
    }

    // Update status if expired
    if (surveyor.isExpired() && surveyor.status !== 'expired') {
      surveyor.status = 'expired';
      await surveyor.save();
    }

    res.json({
      success: true,
      surveyor
    });

  } catch (error) {
    console.error('Error getting surveyor:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update surveyor
exports.updateSurveyor = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating sensitive fields directly
    delete updates.id;
    delete updates.temporaryPassword;
    delete updates.createdBy;
    delete updates.createdAt;

    const surveyor = await Surveyor.findOne({ id });

    if (!surveyor) {
      return res.status(404).json({ error: 'Surveyor not found' });
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      surveyor[key] = updates[key];
    });

    surveyor.updatedAt = new Date();

    await surveyor.save();

    const surveyorData = surveyor.toObject();
    delete surveyorData.temporaryPassword;

    res.json({
      success: true,
      message: 'Surveyor updated successfully',
      surveyor: surveyorData
    });

  } catch (error) {
    console.error('Error updating surveyor:', error);
    res.status(500).json({ error: error.message });
  }
};

// Deactivate surveyor (soft delete)
exports.deactivateSurveyor = async (req, res) => {
  try {
    const { id } = req.params;

    const surveyor = await Surveyor.findOne({ id });

    if (!surveyor) {
      return res.status(404).json({ error: 'Surveyor not found' });
    }

    surveyor.status = 'inactive';
    surveyor.updatedAt = new Date();

    await surveyor.save();

    // Also cancel all active assignments
    await Assignment.updateMany(
      { surveyorId: id, status: 'active' },
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: 'Surveyor deactivated'
      }
    );

    res.json({
      success: true,
      message: 'Surveyor deactivated successfully'
    });

  } catch (error) {
    console.error('Error deactivating surveyor:', error);
    res.status(500).json({ error: error.message });
  }
};

// Extend surveyor expiration
exports.extendExpiration = async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body;

    if (!days || days <= 0) {
      return res.status(400).json({ error: 'Invalid number of days' });
    }

    const surveyor = await Surveyor.findOne({ id });

    if (!surveyor) {
      return res.status(404).json({ error: 'Surveyor not found' });
    }

    await surveyor.extendExpiration(days);

    const surveyorData = surveyor.toObject();
    delete surveyorData.temporaryPassword;

    res.json({
      success: true,
      message: `Expiration extended by ${days} days`,
      surveyor: surveyorData
    });

  } catch (error) {
    console.error('Error extending expiration:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get surveyor performance metrics
exports.getPerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const surveyor = await Surveyor.findOne({ id });

    if (!surveyor) {
      return res.status(404).json({ error: 'Surveyor not found' });
    }

    // Get assignments
    const assignments = await Assignment.find({ surveyorId: id });

    // Get activities
    const activityQuery = { surveyorId: id };
    if (startDate || endDate) {
      activityQuery.timestamp = {};
      if (startDate) activityQuery.timestamp.$gte = new Date(startDate);
      if (endDate) activityQuery.timestamp.$lte = new Date(endDate);
    }

    const activities = await Activity.find(activityQuery).sort({ timestamp: -1 });

    // Calculate metrics
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.status === 'completed').length;
    const activeAssignments = assignments.filter(a => a.status === 'active').length;
    const totalTargetResponses = assignments.reduce((sum, a) => sum + a.targetResponses, 0);
    const totalAchievedResponses = assignments.reduce((sum, a) => sum + a.achievedResponses, 0);

    const loginActivities = activities.filter(a => a.activityType === 'login');
    const responseSubmissions = activities.filter(a => a.activityType === 'response_submission');

    const performance = {
      surveyorId: id,
      surveyorName: surveyor.name,
      period: {
        startDate: startDate || 'all time',
        endDate: endDate || 'now'
      },
      assignments: {
        total: totalAssignments,
        active: activeAssignments,
        completed: completedAssignments,
        pending: assignments.filter(a => a.status === 'pending').length,
        cancelled: assignments.filter(a => a.status === 'cancelled').length,
        completionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0
      },
      responses: {
        target: totalTargetResponses,
        achieved: totalAchievedResponses,
        remaining: Math.max(0, totalTargetResponses - totalAchievedResponses),
        achievementRate: totalTargetResponses > 0 ? Math.round((totalAchievedResponses / totalTargetResponses) * 100) : 0
      },
      activity: {
        totalLogins: loginActivities.length,
        totalResponses: responseSubmissions.length,
        lastLogin: surveyor.lastLoginAt,
        totalActivities: activities.length
      },
      recentAssignments: assignments.slice(0, 5).map(a => ({
        assignmentId: a.id,
        surveyId: a.surveyId,
        status: a.status,
        progress: a.progressPercentage,
        achievedResponses: a.achievedResponses,
        targetResponses: a.targetResponses
      }))
    };

    res.json({
      success: true,
      performance
    });

  } catch (error) {
    console.error('Error getting performance:', error);
    res.status(500).json({ error: error.message });
  }
};

// Reset surveyor password
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const surveyor = await Surveyor.findOne({ id });

    if (!surveyor) {
      return res.status(404).json({ error: 'Surveyor not found' });
    }

    // Generate new temporary password
    const newPassword = generatePassword(parseInt(process.env.DEFAULT_PASSWORD_LENGTH) || 10);

    surveyor.temporaryPassword = newPassword; // Will be hashed by pre-save hook
    surveyor.hasChangedPassword = false;
    surveyor.updatedAt = new Date();

    await surveyor.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
      newPassword: newPassword // Send plain password to admin
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: error.message });
  }
};

// Bulk import surveyors from CSV/JSON
exports.bulkImport = async (req, res) => {
  try {
    const { surveyors } = req.body;

    if (!Array.isArray(surveyors) || surveyors.length === 0) {
      return res.status(400).json({ error: 'Invalid surveyors data. Expected an array.' });
    }

    const results = {
      successful: [],
      failed: [],
      passwords: {} // Store passwords for successful imports
    };

    const defaultExpirationDays = parseInt(process.env.ACCOUNT_EXPIRATION_DAYS) || 30;

    for (const surveyorData of surveyors) {
      try {
        const { name, email, phone, assignedTerritories, region, languages, notes, expirationDays } = surveyorData;

        // Validate required fields
        if (!name || !email || !phone) {
          results.failed.push({
            email: email || 'unknown',
            error: 'Missing required fields: name, email, or phone'
          });
          continue;
        }

        // Check if surveyor already exists
        const existingSurveyor = await Surveyor.findOne({ email });
        if (existingSurveyor) {
          results.failed.push({
            email,
            error: 'Surveyor with this email already exists'
          });
          continue;
        }

        // Generate temporary password
        const temporaryPassword = generatePassword(parseInt(process.env.DEFAULT_PASSWORD_LENGTH) || 10);

        // Calculate expiration date
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + (expirationDays || defaultExpirationDays));

        // Create surveyor
        const surveyor = new Surveyor({
          id: uuidv4(),
          name,
          email,
          phone,
          temporaryPassword, // Will be hashed by pre-save hook
          expirationDate,
          assignedTerritories: assignedTerritories || [],
          region,
          languages: languages || [],
          notes,
          createdBy: req.user?.id || 'admin',
          status: 'active'
        });

        await surveyor.save();

        results.successful.push({
          id: surveyor.id,
          name: surveyor.name,
          email: surveyor.email
        });

        // Store password for this surveyor
        results.passwords[surveyor.email] = temporaryPassword;

      } catch (error) {
        results.failed.push({
          email: surveyorData.email || 'unknown',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk import completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      results
    });

  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;

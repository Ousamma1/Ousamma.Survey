const User = require('../models/User');
const kafkaClient = require('../config/kafka');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      role,
      status,
      search
    } = req.query;

    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;

    // Text search
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting users',
      error: error.message
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password').lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user',
      error: error.message
    });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    const currentUserId = req.userId || req.headers['x-user-id'];
    const {
      email,
      username,
      password,
      firstName,
      lastName,
      role,
      status,
      permissions,
      metadata
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create new user
    const user = new User({
      email,
      username,
      password, // TODO: Hash password in production
      firstName,
      lastName,
      role: role || 'viewer',
      status: status || 'pending',
      permissions: permissions || [],
      metadata: metadata || {},
      createdBy: currentUserId
    });

    await user.save();

    // Publish event
    await kafkaClient.publish('audit.log', {
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'user.created',
      timestamp: new Date().toISOString(),
      userId: currentUserId,
      payload: {
        newUserId: user._id.toString(),
        username: user.username,
        role: user.role
      }
    });

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const currentUserId = req.userId || req.headers['x-user-id'];
    const { id } = req.params;
    const updates = req.body;

    // Don't allow password update through this endpoint
    delete updates.password;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store old values for audit
    const oldValues = {
      role: user.role,
      status: user.status,
      permissions: user.permissions
    };

    // Update user
    Object.assign(user, updates);
    user.updatedBy = currentUserId;
    await user.save();

    // Publish event
    await kafkaClient.publish('audit.log', {
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'user.updated',
      timestamp: new Date().toISOString(),
      userId: currentUserId,
      payload: {
        updatedUserId: user._id.toString(),
        username: user.username,
        changes: {
          before: oldValues,
          after: {
            role: user.role,
            status: user.status,
            permissions: user.permissions
          }
        }
      }
    });

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const currentUserId = req.userId || req.headers['x-user-id'];
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.deleteOne();

    // Publish event
    await kafkaClient.publish('audit.log', {
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'user.deleted',
      timestamp: new Date().toISOString(),
      userId: currentUserId,
      payload: {
        deletedUserId: id,
        username: user.username,
        role: user.role
      }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

// Bulk user operations
exports.bulkOperation = async (req, res) => {
  try {
    const currentUserId = req.userId || req.headers['x-user-id'];
    const { operation, userIds } = req.body;

    if (!operation || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Provide operation and userIds array'
      });
    }

    let result;

    switch (operation) {
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { status: 'active', updatedBy: currentUserId }
        );
        break;

      case 'deactivate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { status: 'inactive', updatedBy: currentUserId }
        );
        break;

      case 'suspend':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { status: 'suspended', updatedBy: currentUserId }
        );
        break;

      case 'delete':
        result = await User.deleteMany({ _id: { $in: userIds } });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid operation'
        });
    }

    // Publish event
    await kafkaClient.publish('audit.log', {
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'user.bulk_operation',
      timestamp: new Date().toISOString(),
      userId: currentUserId,
      payload: {
        operation,
        userCount: userIds.length,
        modifiedCount: result.modifiedCount || result.deletedCount
      }
    });

    res.json({
      success: true,
      message: `Bulk ${operation} completed`,
      data: {
        operation,
        requested: userIds.length,
        modified: result.modifiedCount || result.deletedCount
      }
    });
  } catch (error) {
    console.error('Error in bulk operation:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk operation',
      error: error.message
    });
  }
};

// Get user statistics
exports.getUserStatistics = async (req, res) => {
  try {
    const statistics = await User.getStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error getting user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user statistics',
      error: error.message
    });
  }
};

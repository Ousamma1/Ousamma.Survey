// Simple authentication middleware
// TODO: Implement proper JWT authentication

exports.authenticate = (req, res, next) => {
  try {
    // For now, accept x-user-id header
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    req.userId = userId;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

// Require admin role
exports.requireAdmin = (req, res, next) => {
  try {
    // For now, check x-user-role header
    const userRole = req.headers['x-user-role'];

    if (!userRole || !['admin', 'superadmin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    req.isAdmin = true;
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(403).json({
      success: false,
      message: 'Authorization failed',
      error: error.message
    });
  }
};

// Require superadmin role
exports.requireSuperAdmin = (req, res, next) => {
  try {
    const userRole = req.headers['x-user-role'];

    if (userRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Superadmin access required'
      });
    }

    req.isSuperAdmin = true;
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(403).json({
      success: false,
      message: 'Authorization failed',
      error: error.message
    });
  }
};

// Extract user info from request
exports.extractUserInfo = (req, res, next) => {
  req.userId = req.headers['x-user-id'] || 'anonymous';
  req.username = req.headers['x-username'] || 'anonymous';
  req.userRole = req.headers['x-user-role'] || 'viewer';
  req.ipAddress = req.ip || req.connection.remoteAddress;
  req.userAgent = req.headers['user-agent'];
  next();
};

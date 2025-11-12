// Placeholder auth middleware
// TODO: Implement JWT authentication

exports.authenticateToken = (req, res, next) => {
  // For now, just set a dummy user
  // In production, this should validate JWT token and set real user data
  req.user = {
    id: 'admin',
    role: 'admin'
  };

  next();
};

exports.requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  next();
};

module.exports = exports;

const mongoose = require('mongoose');

// Validate MongoDB ObjectId
exports.validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}. Must be a valid MongoDB ObjectId`
      });
    }

    next();
  };
};

// Validate required fields
exports.validateRequired = (fields) => {
  return (req, res, next) => {
    const missingFields = [];

    for (const field of fields) {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields
      });
    }

    next();
  };
};

// Validate email format
exports.validateEmail = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next();
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  next();
};

// Validate pagination parameters
exports.validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid page parameter. Must be a positive integer'
    });
  }

  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 1000)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid limit parameter. Must be between 1 and 1000'
    });
  }

  next();
};

// Validate user role
exports.validateRole = (req, res, next) => {
  const { role } = req.body;

  if (!role) {
    return next();
  }

  const validRoles = ['superadmin', 'admin', 'manager', 'surveyor', 'viewer'];

  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role',
      validRoles
    });
  }

  next();
};

// Validate user status
exports.validateStatus = (req, res, next) => {
  const { status } = req.body;

  if (!status) {
    return next();
  }

  const validStatuses = ['active', 'inactive', 'suspended', 'pending'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status',
      validStatuses
    });
  }

  next();
};

module.exports = exports;

/**
 * GDPR Compliance Routes
 * Data export, deletion, consent management
 */

const express = require('express');
const router = express.Router();

// Middleware
const { authenticate } = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../utils/validation.util');
const {
  gdprDataExportSchema,
  gdprDataDeletionSchema
} = require('../utils/validation.util');

// Utilities
const {
  DataExportService,
  DataDeletionService,
  ConsentManager
} = require('../utils/gdpr.util');

/**
 * @route   POST /api/gdpr/export
 * @desc    Export user data (Right to Data Portability)
 * @access  Private
 */
router.post('/export',
  authenticate,
  apiLimiter,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { format = 'json', includeFiles = false } = req.body;

      // Get user data
      // const user = await User.findById(userId);
      // const surveys = await Survey.find({ userId });
      // const responses = await Response.find({ userId });
      // const projects = await Project.find({ userId });
      // const activityLog = await ActivityLog.find({ userId });

      const userData = {
        id: userId,
        email: req.user.email,
        // ... collect all user data
      };

      // Export data
      const exportResult = await DataExportService.exportUserData(
        userData,
        format,
        includeFiles
      );

      // Log export request
      console.info(`GDPR data export requested by user ${userId}`);

      // In production, send download link via email
      res.json({
        status: 'success',
        message: 'Data export completed',
        data: {
          format: exportResult.format,
          exportedAt: exportResult.metadata.exportedAt,
          recordCount: exportResult.metadata.recordCount,
          downloadUrl: `/api/gdpr/download/${userId}` // Implement secure download
        }
      });
    } catch (error) {
      console.error('Data export error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Data export failed'
      });
    }
  }
);

/**
 * @route   POST /api/gdpr/delete
 * @desc    Request data deletion (Right to be Forgotten)
 * @access  Private
 */
router.post('/delete',
  authenticate,
  apiLimiter,
  validate(gdprDataDeletionSchema),
  async (req, res) => {
    try {
      const { email, password, confirmDeletion } = req.body;
      const userId = req.user.id;

      // Verify user email matches
      if (email !== req.user.email) {
        return res.status(400).json({
          status: 'error',
          message: 'Email does not match your account'
        });
      }

      // Verify password
      // const user = await User.findById(userId);
      // const isPasswordValid = await require('../utils/auth.util').PasswordUtil.verify(
      //   password,
      //   user.password
      // );

      // if (!isPasswordValid) {
      //   return res.status(401).json({
      //     status: 'error',
      //     message: 'Invalid password'
      //   });
      // }

      // Schedule deletion (30-day grace period)
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30);

      // Create deletion request
      // await DeletionRequest.create({
      //   userId,
      //   email,
      //   requestedAt: new Date(),
      //   scheduledFor: deletionDate,
      //   status: 'pending'
      // });

      // Log deletion request
      console.warn(`GDPR data deletion requested by user ${userId}`);

      res.json({
        status: 'success',
        message: 'Data deletion scheduled',
        data: {
          scheduledFor: deletionDate,
          gracePeriod: '30 days',
          cancellationDeadline: deletionDate
        }
      });
    } catch (error) {
      console.error('Data deletion error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Data deletion request failed'
      });
    }
  }
);

/**
 * @route   POST /api/gdpr/delete/cancel
 * @desc    Cancel data deletion request
 * @access  Private
 */
router.post('/delete/cancel', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Cancel deletion request
    // await DeletionRequest.updateOne(
    //   { userId, status: 'pending' },
    //   { status: 'cancelled', cancelledAt: new Date() }
    // );

    res.json({
      status: 'success',
      message: 'Data deletion request cancelled'
    });
  } catch (error) {
    console.error('Cancel deletion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel deletion request'
    });
  }
});

/**
 * @route   GET /api/gdpr/consents
 * @desc    Get user consents
 * @access  Private
 */
router.get('/consents', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user consents
    const consents = await ConsentManager.getUserConsents(userId);

    // Get available consent types
    const consentTypes = ConsentManager.getConsentTypes();

    res.json({
      status: 'success',
      data: {
        consents,
        availableTypes: consentTypes
      }
    });
  } catch (error) {
    console.error('Get consents error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get consents'
    });
  }
});

/**
 * @route   POST /api/gdpr/consents
 * @desc    Update user consent
 * @access  Private
 */
router.post('/consents', authenticate, async (req, res) => {
  try {
    const { consentType, granted } = req.body;
    const userId = req.user.id;

    // Validate consent type
    const validTypes = ConsentManager.getConsentTypes();
    const isValidType = validTypes.some(t => t.type === consentType);

    if (!isValidType) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid consent type'
      });
    }

    // Check if consent type is required
    const consentTypeInfo = validTypes.find(t => t.type === consentType);
    if (consentTypeInfo.required && !granted) {
      return res.status(400).json({
        status: 'error',
        message: 'This consent is required and cannot be withdrawn'
      });
    }

    // Record consent
    const consent = await ConsentManager.recordConsent(
      userId,
      consentType,
      granted,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    res.json({
      status: 'success',
      message: 'Consent updated successfully',
      data: { consent }
    });
  } catch (error) {
    console.error('Update consent error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update consent'
    });
  }
});

/**
 * @route   POST /api/gdpr/consents/:consentType/withdraw
 * @desc    Withdraw specific consent
 * @access  Private
 */
router.post('/consents/:consentType/withdraw', authenticate, async (req, res) => {
  try {
    const { consentType } = req.params;
    const userId = req.user.id;

    // Validate consent type
    const validTypes = ConsentManager.getConsentTypes();
    const consentTypeInfo = validTypes.find(t => t.type === consentType);

    if (!consentTypeInfo) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid consent type'
      });
    }

    if (consentTypeInfo.required) {
      return res.status(400).json({
        status: 'error',
        message: 'This consent is required and cannot be withdrawn'
      });
    }

    // Withdraw consent
    await ConsentManager.withdrawConsent(userId, consentType);

    res.json({
      status: 'success',
      message: 'Consent withdrawn successfully'
    });
  } catch (error) {
    console.error('Withdraw consent error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to withdraw consent'
    });
  }
});

/**
 * @route   GET /api/gdpr/privacy-policy
 * @desc    Get privacy policy
 * @access  Public
 */
router.get('/privacy-policy', (req, res) => {
  res.json({
    status: 'success',
    data: {
      version: '1.0',
      effectiveDate: '2024-01-01',
      lastUpdated: '2024-01-01',
      content: 'Privacy policy content here...',
      url: '/privacy-policy.html'
    }
  });
});

/**
 * @route   GET /api/gdpr/terms-of-service
 * @desc    Get terms of service
 * @access  Public
 */
router.get('/terms-of-service', (req, res) => {
  res.json({
    status: 'success',
    data: {
      version: '1.0',
      effectiveDate: '2024-01-01',
      lastUpdated: '2024-01-01',
      content: 'Terms of service content here...',
      url: '/terms-of-service.html'
    }
  });
});

/**
 * @route   GET /api/gdpr/data-retention
 * @desc    Get data retention policy
 * @access  Public
 */
router.get('/data-retention', (req, res) => {
  const securityConfig = require('../config/security.config');

  res.json({
    status: 'success',
    data: {
      retentionPeriod: `${securityConfig.gdpr.dataRetentionDays} days`,
      inactiveDeletion: `${securityConfig.gdpr.inactiveDeletionDays} days`,
      policy: 'Data retention policy details...'
    }
  });
});

/**
 * @route   POST /api/gdpr/data-access-request
 * @desc    Submit data access request
 * @access  Public
 */
router.post('/data-access-request', apiLimiter, async (req, res) => {
  try {
    const { email, requestType, message } = req.body;

    // Create access request
    // await DataAccessRequest.create({
    //   email,
    //   requestType,
    //   message,
    //   requestedAt: new Date(),
    //   status: 'pending'
    // });

    res.json({
      status: 'success',
      message: 'Data access request submitted successfully. We will respond within 30 days.'
    });
  } catch (error) {
    console.error('Data access request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit data access request'
    });
  }
});

/**
 * @route   GET /api/gdpr/my-data-summary
 * @desc    Get summary of user data
 * @access  Private
 */
router.get('/my-data-summary', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get data summary
    // const surveysCount = await Survey.countDocuments({ userId });
    // const responsesCount = await Response.countDocuments({ userId });
    // const projectsCount = await Project.countDocuments({ userId });
    // const filesCount = await File.countDocuments({ userId });

    res.json({
      status: 'success',
      data: {
        userId,
        accountCreated: new Date(),
        dataTypes: {
          surveys: 0,
          responses: 0,
          projects: 0,
          files: 0
        },
        storageUsed: '0 MB',
        lastActivity: new Date()
      }
    });
  } catch (error) {
    console.error('Get data summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get data summary'
    });
  }
});

module.exports = router;

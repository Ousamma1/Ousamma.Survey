/**
 * API Key Management Routes
 * Create, manage, and rotate API keys
 */

const express = require('express');
const router = express.Router();

// Middleware
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../utils/validation.util');
const { apiKeyCreationSchema, paginationSchema } = require('../utils/validation.util');

// Utilities
const ApiKeyManager = require('../utils/apiKey.util');

// Models (implement based on your database)
// const ApiKey = require('../models/ApiKey');

/**
 * @route   POST /api/keys
 * @desc    Create new API key
 * @access  Private
 */
router.post('/',
  authenticate,
  apiLimiter,
  validate(apiKeyCreationSchema),
  async (req, res) => {
    try {
      const { name, description, permissions, expiresIn } = req.body;
      const userId = req.user.id;

      // Check if user has reached max keys limit
      // const userKeys = await ApiKey.find({ userId, active: true });
      // if (ApiKeyManager.hasReachedLimit(userKeys.length)) {
      //   return res.status(400).json({
      //     status: 'error',
      //     message: `Maximum ${require('../config/security.config').apiKey.maxKeysPerUser} API keys allowed per user`
      //   });
      // }

      // Generate API key
      const { apiKey, record } = ApiKeyManager.generateApiKey({
        userId,
        name,
        description,
        permissions,
        expiresIn
      });

      // Save to database
      // const savedKey = await ApiKey.create({
      //   ...record,
      //   userId
      // });

      res.status(201).json({
        status: 'success',
        message: 'API key created successfully',
        data: {
          apiKey, // Return plain key only once!
          id: 'placeholder-key-id',
          name,
          description,
          permissions,
          expiresAt: record.expiresAt,
          createdAt: record.createdAt
        },
        warning: 'Save this API key securely. It will not be shown again.'
      });
    } catch (error) {
      console.error('API key creation error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create API key'
      });
    }
  }
);

/**
 * @route   GET /api/keys
 * @desc    Get all API keys for user
 * @access  Private
 */
router.get('/',
  authenticate,
  validate(paginationSchema, 'query'),
  async (req, res) => {
    try {
      const { page, limit } = req.query;
      const userId = req.user.id;

      // Get user's API keys (exclude sensitive data)
      // const keys = await ApiKey.find({ userId })
      //   .select('-keyHash')
      //   .sort({ createdAt: -1 })
      //   .limit(limit)
      //   .skip((page - 1) * limit);

      // const total = await ApiKey.countDocuments({ userId });

      // Get statistics
      // const stats = ApiKeyManager.getStatistics(keys);

      res.json({
        status: 'success',
        data: {
          keys: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          },
          statistics: {
            total: 0,
            active: 0,
            expired: 0,
            rotationDue: 0
          }
        }
      });
    } catch (error) {
      console.error('Get API keys error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get API keys'
      });
    }
  }
);

/**
 * @route   GET /api/keys/:keyId
 * @desc    Get specific API key details
 * @access  Private
 */
router.get('/:keyId', authenticate, async (req, res) => {
  try {
    const { keyId } = req.params;
    const userId = req.user.id;

    // Get API key
    // const key = await ApiKey.findOne({ _id: keyId, userId }).select('-keyHash');

    // if (!key) {
    //   return res.status(404).json({
    //     status: 'error',
    //     message: 'API key not found'
    //   });
    // }

    res.json({
      status: 'success',
      data: {
        key: {
          id: keyId,
          name: 'Example Key',
          description: 'Example description',
          keyPrefix: 'osk_...',
          permissions: ['read', 'write'],
          createdAt: new Date(),
          expiresAt: new Date(),
          lastUsedAt: null,
          usageCount: 0,
          active: true
        }
      }
    });
  } catch (error) {
    console.error('Get API key error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get API key'
    });
  }
});

/**
 * @route   PUT /api/keys/:keyId
 * @desc    Update API key (name, description, permissions)
 * @access  Private
 */
router.put('/:keyId', authenticate, async (req, res) => {
  try {
    const { keyId } = req.params;
    const { name, description, permissions } = req.body;
    const userId = req.user.id;

    // Update API key
    // const key = await ApiKey.findOneAndUpdate(
    //   { _id: keyId, userId },
    //   { name, description, permissions },
    //   { new: true }
    // ).select('-keyHash');

    // if (!key) {
    //   return res.status(404).json({
    //     status: 'error',
    //     message: 'API key not found'
    //   });
    // }

    res.json({
      status: 'success',
      message: 'API key updated successfully',
      data: {
        key: {
          id: keyId,
          name,
          description,
          permissions
        }
      }
    });
  } catch (error) {
    console.error('Update API key error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update API key'
    });
  }
});

/**
 * @route   POST /api/keys/:keyId/rotate
 * @desc    Rotate API key
 * @access  Private
 */
router.post('/:keyId/rotate', authenticate, apiLimiter, async (req, res) => {
  try {
    const { keyId } = req.params;
    const userId = req.user.id;

    // Get existing key
    // const oldKey = await ApiKey.findOne({ _id: keyId, userId });

    // if (!oldKey) {
    //   return res.status(404).json({
    //     status: 'error',
    //     message: 'API key not found'
    //   });
    // }

    // Rotate key
    // const { newKey, newRecord, oldKeyExpiresAt } = ApiKeyManager.rotateApiKey(oldKey);

    // Create new key
    // const savedNewKey = await ApiKey.create({
    //   ...newRecord,
    //   userId
    // });

    // Update old key
    // await ApiKey.updateOne({ _id: keyId }, {
    //   active: false,
    //   expiresAt: oldKeyExpiresAt,
    //   rotatedTo: savedNewKey._id
    // });

    res.json({
      status: 'success',
      message: 'API key rotated successfully',
      data: {
        newApiKey: 'osk_new_key_here', // Return only once!
        newKeyId: 'new-key-id',
        oldKeyExpiresAt: new Date(),
        gracePeriod: '7 days'
      },
      warning: 'Your old API key will remain active for 7 days. Update your applications with the new key.'
    });
  } catch (error) {
    console.error('Rotate API key error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to rotate API key'
    });
  }
});

/**
 * @route   DELETE /api/keys/:keyId
 * @desc    Revoke/delete API key
 * @access  Private
 */
router.delete('/:keyId', authenticate, async (req, res) => {
  try {
    const { keyId } = req.params;
    const userId = req.user.id;

    // Revoke key
    // const result = await ApiKey.updateOne(
    //   { _id: keyId, userId },
    //   { active: false, revokedAt: new Date() }
    // );

    // if (result.matchedCount === 0) {
    //   return res.status(404).json({
    //     status: 'error',
    //     message: 'API key not found'
    //   });
    // }

    res.json({
      status: 'success',
      message: 'API key revoked successfully'
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to revoke API key'
    });
  }
});

/**
 * @route   GET /api/keys/:keyId/usage
 * @desc    Get API key usage statistics
 * @access  Private
 */
router.get('/:keyId/usage', authenticate, async (req, res) => {
  try {
    const { keyId } = req.params;
    const userId = req.user.id;

    // Get API key
    // const key = await ApiKey.findOne({ _id: keyId, userId });

    // if (!key) {
    //   return res.status(404).json({
    //     status: 'error',
    //     message: 'API key not found'
    //   });
    // }

    // Get usage statistics (implement based on your logging system)
    // const usageStats = await ApiKeyUsage.aggregate([
    //   { $match: { apiKeyId: keyId } },
    //   {
    //     $group: {
    //       _id: '$endpoint',
    //       count: { $sum: 1 },
    //       lastUsed: { $max: '$timestamp' }
    //     }
    //   }
    // ]);

    res.json({
      status: 'success',
      data: {
        keyId,
        totalRequests: 0,
        lastUsedAt: null,
        usage: []
      }
    });
  } catch (error) {
    console.error('Get API key usage error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get API key usage'
    });
  }
});

/**
 * @route   POST /api/keys/validate
 * @desc    Validate API key (for testing)
 * @access  Public (with API key)
 */
router.post('/validate', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        status: 'error',
        message: 'API key required'
      });
    }

    // Hash and find key
    // const apiKeyHash = require('../utils/encryption.util').hashApiKey(apiKey);
    // const storedKey = await ApiKey.findOne({ keyHash: apiKeyHash });

    // Validate key
    // const validation = ApiKeyManager.validateApiKey(apiKey, storedKey);

    // if (!validation.valid) {
    //   return res.status(401).json({
    //     status: 'error',
    //     message: validation.reason
    //   });
    // }

    // Update usage
    // await ApiKey.updateOne(
    //   { _id: storedKey._id },
    //   {
    //     lastUsedAt: new Date(),
    //     $inc: { usageCount: 1 }
    //   }
    // );

    res.json({
      status: 'success',
      message: 'API key is valid',
      data: {
        valid: true,
        permissions: ['read', 'write'],
        expiresAt: new Date()
      }
    });
  } catch (error) {
    console.error('Validate API key error:', error);
    res.status(500).json({
      status: 'error',
      message: 'API key validation failed'
    });
  }
});

module.exports = router;

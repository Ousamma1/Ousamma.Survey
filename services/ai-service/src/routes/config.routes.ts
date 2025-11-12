/**
 * Configuration Routes
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as configController from '../controllers/config.controller';
import { validate } from '../middleware/validation';

const router = Router();

/**
 * POST /config/providers
 * Create provider configuration
 */
router.post(
  '/providers',
  [
    body('type').isString().notEmpty().withMessage('Provider type is required'),
    body('name').isString().notEmpty().withMessage('Provider name is required'),
    body('tenantId').optional().isString(),
    body('apiKey').optional().isString(),
    body('endpoint').optional().isString(),
    body('model').optional().isString(),
    body('organizationId').optional().isString(),
    body('deploymentId').optional().isString(),
    body('maxRetries').optional().isInt({ min: 0, max: 10 }),
    body('timeout').optional().isInt({ min: 1000, max: 300000 }),
    body('enabled').optional().isBoolean(),
    body('priority').optional().isInt(),
    validate
  ],
  configController.createProvider
);

/**
 * GET /config/providers
 * List provider configurations
 */
router.get(
  '/providers',
  [
    query('tenantId').optional().isString(),
    query('type').optional().isString(),
    query('enabled').optional().isBoolean(),
    validate
  ],
  configController.listProviders
);

/**
 * GET /config/providers/:providerId
 * Get provider configuration
 */
router.get(
  '/providers/:providerId',
  [param('providerId').isString().notEmpty(), validate],
  configController.getProvider
);

/**
 * PUT /config/providers/:providerId
 * Update provider configuration
 */
router.put(
  '/providers/:providerId',
  [
    param('providerId').isString().notEmpty(),
    body('name').optional().isString(),
    body('apiKey').optional().isString(),
    body('endpoint').optional().isString(),
    body('model').optional().isString(),
    body('enabled').optional().isBoolean(),
    body('priority').optional().isInt(),
    validate
  ],
  configController.updateProvider
);

/**
 * DELETE /config/providers/:providerId
 * Delete provider configuration
 */
router.delete(
  '/providers/:providerId',
  [param('providerId').isString().notEmpty(), validate],
  configController.deleteProvider
);

/**
 * POST /config/providers/:providerId/toggle
 * Enable/disable provider
 */
router.post(
  '/providers/:providerId/toggle',
  [
    param('providerId').isString().notEmpty(),
    body('enabled').isBoolean().withMessage('Enabled flag is required'),
    validate
  ],
  configController.toggleProvider
);

export default router;

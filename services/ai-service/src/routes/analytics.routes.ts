/**
 * Analytics Routes
 */

import { Router } from 'express';
import { query } from 'express-validator';
import * as analyticsController from '../controllers/analytics.controller';
import { validate } from '../middleware/validation';

const router = Router();

/**
 * GET /analytics/usage
 * Get usage metrics
 */
router.get(
  '/usage',
  [
    query('userId').optional().isString(),
    query('tenantId').optional().isString(),
    query('providerId').optional().isString(),
    query('providerType').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('offset').optional().isInt({ min: 0 }),
    validate
  ],
  analyticsController.getUsageMetrics
);

/**
 * GET /analytics/stats
 * Get usage statistics
 */
router.get(
  '/stats',
  [
    query('userId').optional().isString(),
    query('tenantId').optional().isString(),
    query('providerId').optional().isString(),
    query('providerType').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    validate
  ],
  analyticsController.getUsageStats
);

/**
 * GET /analytics/cost
 * Get cost summary
 */
router.get(
  '/cost',
  [
    query('userId').optional().isString(),
    query('tenantId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    validate
  ],
  analyticsController.getCostSummary
);

export default router;

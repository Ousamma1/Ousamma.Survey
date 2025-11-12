/**
 * AI Routes
 */

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import * as aiController from '../controllers/ai.controller';
import { validate } from '../middleware/validation';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

/**
 * POST /ai/chat
 * Chat with AI
 */
router.post(
  '/chat',
  rateLimit({ windowMs: 60000, maxRequests: 20 }),
  [
    body('message').isString().notEmpty().withMessage('Message is required'),
    body('conversationId').optional().isString(),
    body('userId').optional().isString(),
    body('tenantId').optional().isString(),
    body('providerId').optional().isString(),
    body('providerType').optional().isString(),
    body('maxTokens').optional().isInt({ min: 1, max: 4000 }),
    body('temperature').optional().isFloat({ min: 0, max: 2 }),
    validate
  ],
  aiController.chat
);

/**
 * POST /ai/stream
 * Stream chat with AI
 */
router.post(
  '/stream',
  rateLimit({ windowMs: 60000, maxRequests: 20 }),
  [
    body('message').isString().notEmpty().withMessage('Message is required'),
    body('conversationId').optional().isString(),
    body('userId').optional().isString(),
    body('tenantId').optional().isString(),
    body('providerId').optional().isString(),
    body('providerType').optional().isString(),
    body('maxTokens').optional().isInt({ min: 1, max: 4000 }),
    body('temperature').optional().isFloat({ min: 0, max: 2 }),
    validate
  ],
  aiController.streamChat
);

/**
 * POST /ai/generate-survey
 * Generate survey from description
 */
router.post(
  '/generate-survey',
  rateLimit({ windowMs: 60000, maxRequests: 10 }),
  [
    body('description').isString().notEmpty().withMessage('Description is required'),
    body('questionCount').optional().isInt({ min: 1, max: 50 }),
    body('language').optional().isIn(['en', 'ar', 'bilingual']),
    body('questionTypes').optional().isArray(),
    body('targetAudience').optional().isString(),
    body('userId').optional().isString(),
    body('tenantId').optional().isString(),
    body('providerId').optional().isString(),
    body('providerType').optional().isString(),
    validate
  ],
  aiController.generateSurvey
);

/**
 * POST /ai/optimize-survey
 * Optimize existing survey
 */
router.post(
  '/optimize-survey',
  rateLimit({ windowMs: 60000, maxRequests: 10 }),
  [
    body('survey').isObject().notEmpty().withMessage('Survey is required'),
    body('optimizationGoals').optional().isArray(),
    body('userId').optional().isString(),
    body('tenantId').optional().isString(),
    body('providerId').optional().isString(),
    body('providerType').optional().isString(),
    validate
  ],
  aiController.optimizeSurvey
);

/**
 * POST /ai/analyze-responses
 * Analyze survey responses
 */
router.post(
  '/analyze-responses',
  rateLimit({ windowMs: 60000, maxRequests: 10 }),
  [
    body('survey').isObject().notEmpty().withMessage('Survey is required'),
    body('responses').isArray().notEmpty().withMessage('Responses are required'),
    body('userId').optional().isString(),
    body('tenantId').optional().isString(),
    body('providerId').optional().isString(),
    body('providerType').optional().isString(),
    validate
  ],
  aiController.analyzeResponses
);

/**
 * POST /ai/generate-report
 * Generate report from survey data
 */
router.post(
  '/generate-report',
  rateLimit({ windowMs: 60000, maxRequests: 10 }),
  [
    body('survey').isObject().notEmpty().withMessage('Survey is required'),
    body('responses').isArray().notEmpty().withMessage('Responses are required'),
    body('reportType').optional().isIn(['summary', 'detailed', 'executive']),
    body('userId').optional().isString(),
    body('tenantId').optional().isString(),
    body('providerId').optional().isString(),
    body('providerType').optional().isString(),
    validate
  ],
  aiController.generateReport
);

/**
 * GET /ai/providers
 * List available providers
 */
router.get(
  '/providers',
  [query('tenantId').optional().isString(), validate],
  aiController.listProviders
);

/**
 * GET /ai/health
 * Health check
 */
router.get('/health', aiController.healthCheck);

/**
 * GET /ai/conversations
 * Get user conversations
 */
router.get(
  '/conversations',
  [
    query('userId').optional().isString(),
    query('tenantId').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    validate
  ],
  aiController.getConversations
);

/**
 * GET /ai/conversations/:conversationId
 * Get conversation by ID
 */
router.get(
  '/conversations/:conversationId',
  [param('conversationId').isString().notEmpty(), validate],
  aiController.getConversation
);

/**
 * DELETE /ai/conversations/:conversationId
 * Delete conversation
 */
router.delete(
  '/conversations/:conversationId',
  [param('conversationId').isString().notEmpty(), validate],
  aiController.deleteConversation
);

export default router;

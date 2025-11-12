import { Router } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { config } from '../config';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rate-limit';
import winston from 'winston';

export const createRoutes = (logger: winston.Logger): Router => {
  const router = Router();

  // Proxy configuration helper
  const createProxy = (target: string, pathRewrite?: Options['pathRewrite']) => {
    return createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite,
      onProxyReq: (proxyReq, req, res) => {
        logger.http(`Proxying request to ${target}${req.url}`);
      },
      onProxyRes: (proxyRes, req, res) => {
        logger.http(`Received response from ${target}: ${proxyRes.statusCode}`);
      },
      onError: (err, req, res) => {
        logger.error(`Proxy error for ${target}:`, err);
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'The requested service is currently unavailable'
          },
          timestamp: new Date()
        });
      }
    });
  };

  // Health check endpoint (no auth required)
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'api-gateway',
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime()
      }
    });
  });

  // Auth Service Routes (public, but rate limited)
  router.use(
    '/api/auth',
    authRateLimiter,
    createProxy(config.services.auth, { '^/api/auth': '/api/auth' })
  );

  // User Service Routes (authenticated)
  router.use(
    '/api/users',
    authenticate,
    createProxy(config.services.user, { '^/api/users': '/api/users' })
  );

  // Config Service Routes (authenticated, admin only for modifications)
  router.use(
    '/api/config',
    authenticate,
    createProxy(config.services.config, { '^/api/config': '/api/config' })
  );

  // Survey Service Routes (authenticated)
  router.use(
    '/api/surveys',
    authenticate,
    createProxy(config.services.survey, { '^/api/surveys': '/api/surveys' })
  );

  // Public survey access (optional auth for personalized experience)
  router.use(
    '/api/public/surveys',
    optionalAuth,
    createProxy(config.services.survey, { '^/api/public/surveys': '/api/public/surveys' })
  );

  // Response Service Routes (authenticated)
  router.use(
    '/api/responses',
    authenticate,
    createProxy(config.services.response, { '^/api/responses': '/api/responses' })
  );

  // Analytics Service Routes (authenticated)
  router.use(
    '/api/analytics',
    authenticate,
    createProxy(config.services.analytics, { '^/api/analytics': '/api/analytics' })
  );

  // AI Service Routes (authenticated)
  router.use(
    '/api/ai',
    authenticate,
    createProxy(config.services.ai, { '^/api/ai': '/api/ai' })
  );

  // Geolocation Service Routes (optional auth)
  router.use(
    '/api/geolocation',
    optionalAuth,
    createProxy(config.services.geolocation, { '^/api/geolocation': '/api/geolocation' })
  );

  // Notification Service Routes (authenticated)
  router.use(
    '/api/notifications',
    authenticate,
    createProxy(config.services.notification, { '^/api/notifications': '/api/notifications' })
  );

  // File Service Routes (authenticated)
  router.use(
    '/api/files',
    authenticate,
    createProxy(config.services.file, { '^/api/files': '/api/files' })
  );

  // 404 handler for undefined routes
  router.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested endpoint does not exist'
      },
      timestamp: new Date()
    });
  });

  return router;
};

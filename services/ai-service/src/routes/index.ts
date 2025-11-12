/**
 * Route exports
 */

import { Router } from 'express';
import aiRoutes from './ai.routes';
import configRoutes from './config.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

// Mount routes
router.use('/ai', aiRoutes);
router.use('/config', configRoutes);
router.use('/analytics', analyticsRoutes);

export default router;

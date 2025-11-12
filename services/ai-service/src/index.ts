/**
 * AI Service Entry Point
 */

import dotenv from 'dotenv';
import { createApp } from './app';
import { connectDatabase } from './config';
import { logger } from './utils/logger';
import { ProviderManager } from './providers';
import { ContextService, EncryptionService, ProviderConfigService, UsageTrackingService } from './services';
import { AIService } from './agents';
import * as aiController from './controllers/ai.controller';
import * as configController from './controllers/config.controller';
import * as analyticsController from './controllers/analytics.controller';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize services
    const encryptionService = new EncryptionService();
    const contextService = new ContextService();
    const providerConfigService = new ProviderConfigService(encryptionService);
    const usageTrackingService = new UsageTrackingService();
    const providerManager = new ProviderManager();

    // Initialize AI service
    const aiService = new AIService(
      providerManager,
      contextService,
      providerConfigService,
      usageTrackingService
    );

    await aiService.initialize();

    // Set services in controllers
    aiController.setAIService(aiService);
    configController.setProviderConfigService(providerConfigService);
    analyticsController.setUsageTrackingService(usageTrackingService);

    // Create and start Express app
    const app = createApp();

    app.listen(PORT, () => {
      logger.info(`AI Service listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start AI Service:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
bootstrap();

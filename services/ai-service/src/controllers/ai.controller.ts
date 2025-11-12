/**
 * AI Controller
 */

import { Request, Response, NextFunction } from 'express';
import { AIService } from '../agents';
import { AppError } from '../middleware/errorHandler';

let aiService: AIService;

export const setAIService = (service: AIService) => {
  aiService = service;
};

export const chat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await aiService.chat(req.body);

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};

export const streamChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of aiService.streamChat(req.body)) {
      const data = JSON.stringify(chunk);
      res.write(`data: ${data}\n\n`);

      if (chunk.isComplete) {
        res.write('data: [DONE]\n\n');
        break;
      }
    }

    res.end();
  } catch (error) {
    next(error);
  }
};

export const generateSurvey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiService.generateSurvey(req.body);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const optimizeSurvey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiService.optimizeSurvey(req.body);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const analyzeResponses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiService.analyzeResponses(req.body);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const generateReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiService.generateReport(req.body);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const listProviders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await aiService.healthCheck();

    res.json({
      success: true,
      data: Array.from(health.entries()).map(([id, status]) => ({
        id,
        ...status
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await aiService.healthCheck();

    res.json({
      success: true,
      data: Object.fromEntries(health)
    });
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Implementation would use ContextService
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Implementation would use ContextService
    res.json({
      success: true,
      data: null
    });
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Implementation would use ContextService
    res.json({
      success: true,
      message: 'Conversation deleted'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Rate Limiting Middleware
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
}

export const rateLimit = (options: RateLimitOptions = {}) => {
  const {
    windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message = 'Too many requests, please try again later.'
  } = options;

  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      error: message
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

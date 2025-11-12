import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export const errorHandler = (logger: winston.Logger) => {
  return (err: AppError, req: Request, res: Response, next: NextFunction): void => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const code = err.code || 'INTERNAL_SERVER_ERROR';

    logger.error('Error occurred:', {
      error: message,
      code,
      statusCode,
      path: req.path,
      method: req.method,
      stack: err.stack
    });

    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      },
      timestamp: new Date()
    });
  };
};

export class ApiError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(statusCode: number, message: string, code: string = 'API_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request') {
    super(400, message, 'BAD_REQUEST');
  }
}

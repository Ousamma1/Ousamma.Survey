import { ApiResponse, PaginatedResponse, ErrorResponse } from '../types';
import { AppError } from './errors';

export class ResponseFormatter {
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date()
    };
  }

  static error(error: AppError | Error, includeStack: boolean = false): ApiResponse {
    const errorResponse: ErrorResponse = {
      code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
      message: error.message,
      details: error instanceof AppError ? error.details : undefined
    };

    if (includeStack && error.stack) {
      errorResponse.stack = error.stack;
    }

    return {
      success: false,
      error: errorResponse,
      timestamp: new Date()
    };
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): ApiResponse<PaginatedResponse<T>> {
    return {
      success: true,
      data: {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      timestamp: new Date()
    };
  }

  static created<T>(data: T, message: string = 'Resource created successfully'): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date()
    };
  }

  static updated<T>(data: T, message: string = 'Resource updated successfully'): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date()
    };
  }

  static deleted(message: string = 'Resource deleted successfully'): ApiResponse {
    return {
      success: true,
      message,
      timestamp: new Date()
    };
  }

  static noContent(): ApiResponse {
    return {
      success: true,
      timestamp: new Date()
    };
  }
}

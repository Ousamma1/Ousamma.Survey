export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  message?: string;
  timestamp: Date;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export enum ServiceName {
  API_GATEWAY = 'api-gateway',
  AUTH_SERVICE = 'auth-service',
  USER_SERVICE = 'user-service',
  CONFIG_SERVICE = 'config-service',
  SURVEY_SERVICE = 'survey-service',
  RESPONSE_SERVICE = 'response-service',
  ANALYTICS_SERVICE = 'analytics-service',
  AI_SERVICE = 'ai-service',
  GEOLOCATION_SERVICE = 'geolocation-service',
  NOTIFICATION_SERVICE = 'notification-service',
  FILE_SERVICE = 'file-service'
}

export interface ServiceConfig {
  name: ServiceName;
  port: number;
  host: string;
  version: string;
  healthCheckPath: string;
}

export interface HealthCheckResponse {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  uptime: number;
  version: string;
  dependencies?: {
    [key: string]: {
      status: 'up' | 'down';
      responseTime?: number;
    };
  };
}

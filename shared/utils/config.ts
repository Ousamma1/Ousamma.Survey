import dotenv from 'dotenv';
import { ServiceName } from '../types';

dotenv.config();

export interface BaseServiceConfig {
  serviceName: ServiceName;
  port: number;
  nodeEnv: string;
  logLevel: string;

  // MongoDB
  mongoUri: string;
  mongoDbName: string;

  // Redis
  redisHost: string;
  redisPort: number;
  redisPassword?: string;

  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;

  // CORS
  corsOrigins: string[];

  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export class ConfigLoader {
  static load<T extends BaseServiceConfig>(serviceName: ServiceName): T {
    const config: any = {
      serviceName,
      port: this.getNumber('PORT', 3000),
      nodeEnv: this.getString('NODE_ENV', 'development'),
      logLevel: this.getString('LOG_LEVEL', 'info'),

      // MongoDB
      mongoUri: this.getString('MONGO_URI', 'mongodb://mongodb:27017'),
      mongoDbName: this.getString('MONGO_DB_NAME', serviceName),

      // Redis
      redisHost: this.getString('REDIS_HOST', 'redis'),
      redisPort: this.getNumber('REDIS_PORT', 6379),
      redisPassword: this.getString('REDIS_PASSWORD', undefined),

      // JWT
      jwtSecret: this.getString('JWT_SECRET', 'your-secret-key-change-in-production'),
      jwtExpiresIn: this.getString('JWT_EXPIRES_IN', '15m'),
      jwtRefreshSecret: this.getString('JWT_REFRESH_SECRET', 'your-refresh-secret-key-change-in-production'),
      jwtRefreshExpiresIn: this.getString('JWT_REFRESH_EXPIRES_IN', '7d'),

      // CORS
      corsOrigins: this.getArray('CORS_ORIGINS', ['http://localhost:3000']),

      // Rate Limiting
      rateLimitWindowMs: this.getNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
      rateLimitMaxRequests: this.getNumber('RATE_LIMIT_MAX_REQUESTS', 100)
    };

    return config as T;
  }

  private static getString(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is required but not set`);
      }
      return defaultValue;
    }
    return value;
  }

  private static getNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is required but not set`);
      }
      return defaultValue;
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a valid number`);
    }
    return parsed;
  }

  private static getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is required but not set`);
      }
      return defaultValue;
    }
    return value.toLowerCase() === 'true';
  }

  private static getArray(key: string, defaultValue?: string[]): string[] {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is required but not set`);
      }
      return defaultValue;
    }
    return value.split(',').map(item => item.trim());
  }
}

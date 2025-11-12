import axios from 'axios';
import winston from 'winston';
import { config } from '../config';

interface ServiceHealth {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime?: number;
}

export class ServiceRegistry {
  private services: Map<string, ServiceHealth>;
  private logger: winston.Logger;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.services = new Map();
    this.initializeServices();
  }

  private initializeServices(): void {
    Object.entries(config.services).forEach(([name, url]) => {
      this.services.set(name, {
        name,
        url,
        status: 'unknown',
        lastCheck: new Date()
      });
    });
  }

  async checkServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const service = this.services.get(serviceName);

    if (!service) {
      throw new Error(`Service ${serviceName} not found in registry`);
    }

    const startTime = Date.now();

    try {
      const response = await axios.get(`${service.url}/health`, {
        timeout: 5000
      });

      const responseTime = Date.now() - startTime;

      const health: ServiceHealth = {
        ...service,
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
        responseTime
      };

      this.services.set(serviceName, health);
      return health;
    } catch (error) {
      this.logger.error(`Health check failed for ${serviceName}:`, error);

      const health: ServiceHealth = {
        ...service,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };

      this.services.set(serviceName, health);
      return health;
    }
  }

  async checkAllServices(): Promise<Map<string, ServiceHealth>> {
    const checks = Array.from(this.services.keys()).map(name =>
      this.checkServiceHealth(name).catch(err => {
        this.logger.error(`Failed to check service ${name}:`, err);
        return this.services.get(name)!;
      })
    );

    await Promise.all(checks);
    return this.services;
  }

  getServiceHealth(serviceName: string): ServiceHealth | undefined {
    return this.services.get(serviceName);
  }

  getAllServicesHealth(): ServiceHealth[] {
    return Array.from(this.services.values());
  }

  isServiceHealthy(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    return service?.status === 'healthy';
  }

  startHealthChecks(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      return;
    }

    this.logger.info(`Starting health checks every ${intervalMs}ms`);

    // Initial check
    this.checkAllServices();

    // Periodic checks
    this.checkInterval = setInterval(() => {
      this.checkAllServices();
    }, intervalMs);
  }

  stopHealthChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.logger.info('Stopped health checks');
    }
  }

  getServiceUrl(serviceName: string): string | undefined {
    return this.services.get(serviceName)?.url;
  }
}

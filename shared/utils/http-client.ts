import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Logger } from './logger';
import { ServiceUnavailableError, InternalServerError } from './errors';

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export class HttpClient {
  private client: AxiosInstance;
  private logger: Logger;
  private retries: number;
  private retryDelay: number;

  constructor(config: HttpClientConfig, logger: Logger) {
    this.logger = logger;
    this.retries = config.retries || 3;
    this.retryDelay = config.retryDelay || 1000;

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        this.logger.http(`Request: ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data
        });
        return config;
      },
      (error) => {
        this.logger.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        this.logger.http(`Response: ${response.status} ${response.config.url}`, {
          data: response.data
        });
        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as AxiosRequestConfig & { _retry?: number };

        if (!config) {
          return Promise.reject(error);
        }

        // Retry logic for network errors or 5xx errors
        if (
          (error.code === 'ECONNABORTED' ||
           error.code === 'ENOTFOUND' ||
           error.code === 'ECONNREFUSED' ||
           (error.response && error.response.status >= 500)) &&
          (!config._retry || config._retry < this.retries)
        ) {
          config._retry = (config._retry || 0) + 1;

          this.logger.warn(`Retrying request (${config._retry}/${this.retries}): ${config.url}`);

          await new Promise(resolve => setTimeout(resolve, this.retryDelay * config._retry!));

          return this.client.request(config);
        }

        this.logger.error('Response error:', error);
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.patch(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.delete(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  private handleError(error: AxiosError): void {
    if (error.response) {
      // Server responded with error status
      this.logger.error(`HTTP Error: ${error.response.status}`, {
        url: error.config?.url,
        data: error.response.data
      });
    } else if (error.request) {
      // Request was made but no response received
      this.logger.error('No response received from server', {
        url: error.config?.url
      });
      throw new ServiceUnavailableError('Service is not responding');
    } else {
      // Error in request setup
      this.logger.error('Error setting up request', error);
      throw new InternalServerError('Failed to make request');
    }
  }

  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }
}

/**
 * AIProvider Interface
 *
 * All AI providers must implement this interface to ensure
 * consistent behavior across different AI services
 */

import { CompletionRequest, CompletionResponse, StreamChunk, ProviderConfig } from '../../types';

export interface IAIProvider {
  /**
   * Provider type identifier
   */
  readonly type: string;

  /**
   * Initialize the provider with configuration
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * Generate a completion from the AI model
   * @param request - Completion request parameters
   * @returns Promise with completion response
   */
  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Stream a completion from the AI model
   * @param request - Completion request parameters
   * @returns AsyncIterator yielding stream chunks
   */
  streamCompletion(request: CompletionRequest): AsyncIterableIterator<StreamChunk>;

  /**
   * Validate the provider configuration
   * @returns true if configuration is valid
   */
  validateConfig(): boolean;

  /**
   * Test the provider connection
   * @returns Promise<boolean> indicating connection status
   */
  testConnection(): Promise<boolean>;

  /**
   * Get provider health status
   */
  getHealthStatus(): Promise<{
    healthy: boolean;
    message?: string;
    latency?: number;
  }>;

  /**
   * Clean up resources
   */
  dispose(): Promise<void>;
}

/**
 * Base abstract class for AI providers
 */
export abstract class BaseAIProvider implements IAIProvider {
  protected config: ProviderConfig;
  protected initialized: boolean = false;

  abstract readonly type: string;

  constructor() {
    this.config = {} as ProviderConfig;
  }

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
  }

  abstract generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;
  abstract streamCompletion(request: CompletionRequest): AsyncIterableIterator<StreamChunk>;
  abstract validateConfig(): boolean;

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generateCompletion({
        prompt: 'test',
        maxTokens: 5
      });
      return !!response.content;
    } catch (error) {
      return false;
    }
  }

  async getHealthStatus(): Promise<{ healthy: boolean; message?: string; latency?: number }> {
    const startTime = Date.now();
    try {
      const isHealthy = await this.testConnection();
      const latency = Date.now() - startTime;
      return {
        healthy: isHealthy,
        latency,
        message: isHealthy ? 'Provider is healthy' : 'Provider connection failed'
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime
      };
    }
  }

  async dispose(): Promise<void> {
    this.initialized = false;
  }

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`Provider ${this.type} is not initialized`);
    }
  }

  protected buildMessages(request: CompletionRequest): any[] {
    const messages = [];

    // Add context messages if available
    if (request.context?.history && request.context.history.length > 0) {
      messages.push(...request.context.history);
    }

    // Add system context if available
    if (request.context?.surveyContext) {
      messages.unshift({
        role: 'system',
        content: this.buildSystemContext(request.context)
      });
    }

    // Add the current prompt
    if (request.messages) {
      messages.push(...request.messages);
    } else {
      messages.push({
        role: 'user',
        content: request.prompt
      });
    }

    return messages;
  }

  protected buildSystemContext(context: any): string {
    const parts: string[] = [];

    if (context.surveyContext) {
      parts.push('Survey Context:');
      parts.push(JSON.stringify(context.surveyContext, null, 2));
    }

    if (context.responseContext) {
      parts.push('Response Context:');
      parts.push(JSON.stringify(context.responseContext, null, 2));
    }

    if (context.fileContext) {
      parts.push('File Context:');
      parts.push(JSON.stringify(context.fileContext, null, 2));
    }

    return parts.join('\n\n');
  }
}

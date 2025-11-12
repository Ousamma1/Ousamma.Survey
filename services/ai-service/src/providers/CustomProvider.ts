/**
 * Custom Provider Implementation
 * Generic provider for custom AI APIs that follow OpenAI-like format
 */

import axios, { AxiosInstance } from 'axios';
import { BaseAIProvider } from './interfaces/AIProvider';
import { CompletionRequest, CompletionResponse, StreamChunk, ProviderConfig, ProviderType } from '../types';

interface CustomAPIResponse {
  choices?: Array<{
    message?: { content?: string };
    text?: string;
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
}

export class CustomProvider extends BaseAIProvider {
  readonly type = ProviderType.CUSTOM;
  private client: AxiosInstance | null = null;
  private model: string = 'custom-model';

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    if (!config.endpoint) {
      throw new Error('Custom provider endpoint is required');
    }

    this.model = config.model || this.model;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.customHeaders
    };

    // Add API key to headers if provided
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    this.client = axios.create({
      baseURL: config.endpoint,
      timeout: config.timeout || 60000,
      headers
    });
  }

  validateConfig(): boolean {
    return !!(this.config.endpoint && this.initialized && this.client);
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('Custom provider client not initialized');
    }

    const messages = this.buildMessages(request);

    try {
      const response = await this.client.post<CustomAPIResponse>('', {
        model: this.model,
        messages: messages,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
        top_p: request.topP || 1,
        stream: false
      });

      const data = response.data;
      const choice = data.choices?.[0];

      // Try to extract content from different possible response formats
      const content =
        choice?.message?.content || choice?.text || JSON.stringify(data);

      return {
        content,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens || 0,
              completionTokens: data.usage.completion_tokens || 0,
              totalTokens: data.usage.total_tokens || 0
            }
          : undefined,
        model: data.model || this.model,
        finishReason: choice?.finish_reason
      };
    } catch (error) {
      console.error('Custom provider completion error:', error);
      throw new Error(
        `Custom provider API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async *streamCompletion(request: CompletionRequest): AsyncIterableIterator<StreamChunk> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('Custom provider client not initialized');
    }

    const messages = this.buildMessages(request);

    try {
      const response = await this.client.post(
        '',
        {
          model: this.model,
          messages: messages,
          max_tokens: request.maxTokens || 2000,
          temperature: request.temperature || 0.7,
          top_p: request.topP || 1,
          stream: true
        },
        {
          responseType: 'stream'
        }
      );

      for await (const chunk of response.data) {
        const lines = chunk
          .toString()
          .split('\n')
          .filter((line: string) => line.trim().startsWith('data: '));

        for (const line of lines) {
          const data = line.replace(/^data: /, '').trim();

          if (data === '[DONE]') {
            yield {
              content: '',
              isComplete: true
            };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            const content = delta?.content || delta?.text || '';

            if (content) {
              yield {
                content,
                isComplete: false
              };
            }

            if (parsed.choices?.[0]?.finish_reason) {
              yield {
                content: '',
                isComplete: true,
                usage: parsed.usage
              };
            }
          } catch (parseError) {
            console.error('Error parsing custom provider stream chunk:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Custom provider stream error:', error);
      throw new Error(
        `Custom provider stream error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async dispose(): Promise<void> {
    this.client = null;
    await super.dispose();
  }
}

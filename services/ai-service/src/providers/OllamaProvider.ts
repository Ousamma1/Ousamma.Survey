/**
 * Ollama (Local) Provider Implementation
 */

import axios, { AxiosInstance } from 'axios';
import { BaseAIProvider } from './interfaces/AIProvider';
import { CompletionRequest, CompletionResponse, StreamChunk, ProviderConfig, ProviderType } from '../types';

export class OllamaProvider extends BaseAIProvider {
  readonly type = ProviderType.OLLAMA;
  private client: AxiosInstance | null = null;
  private baseUrl: string = 'http://localhost:11434';
  private model: string = 'llama2';

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    this.baseUrl = config.endpoint || this.baseUrl;
    this.model = config.model || this.model;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 120000, // Ollama can be slower
      headers: {
        'Content-Type': 'application/json',
        ...config.customHeaders
      }
    });
  }

  validateConfig(): boolean {
    return !!(this.initialized && this.client && this.baseUrl);
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('Ollama client not initialized');
    }

    const messages = this.buildMessages(request);
    const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');

    try {
      const response = await this.client.post('/api/generate', {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          top_p: request.topP || 1,
          num_predict: request.maxTokens || 2000
        }
      });

      return {
        content: response.data.response,
        usage: {
          promptTokens: response.data.prompt_eval_count || 0,
          completionTokens: response.data.eval_count || 0,
          totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
        },
        model: this.model,
        finishReason: response.data.done ? 'stop' : undefined
      };
    } catch (error) {
      console.error('Ollama completion error:', error);
      throw new Error(
        `Ollama API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async *streamCompletion(request: CompletionRequest): AsyncIterableIterator<StreamChunk> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('Ollama client not initialized');
    }

    const messages = this.buildMessages(request);
    const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');

    try {
      const response = await this.client.post(
        '/api/generate',
        {
          model: this.model,
          prompt: prompt,
          stream: true,
          options: {
            temperature: request.temperature || 0.7,
            top_p: request.topP || 1,
            num_predict: request.maxTokens || 2000
          }
        },
        {
          responseType: 'stream'
        }
      );

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter((line: string) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.response) {
              yield {
                content: data.response,
                isComplete: false
              };
            }

            if (data.done) {
              yield {
                content: '',
                isComplete: true,
                usage: {
                  promptTokens: data.prompt_eval_count || 0,
                  completionTokens: data.eval_count || 0,
                  totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
                }
              };
            }
          } catch (parseError) {
            console.error('Error parsing Ollama stream chunk:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Ollama stream error:', error);
      throw new Error(
        `Ollama stream error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) return false;
      const response = await this.client.get('/api/tags');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async dispose(): Promise<void> {
    this.client = null;
    await super.dispose();
  }
}

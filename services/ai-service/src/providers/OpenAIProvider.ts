/**
 * OpenAI Provider Implementation
 */

import OpenAI from 'openai';
import { BaseAIProvider } from './interfaces/AIProvider';
import { CompletionRequest, CompletionResponse, StreamChunk, ProviderConfig, ProviderType } from '../types';

export class OpenAIProvider extends BaseAIProvider {
  readonly type = ProviderType.OPENAI;
  private client: OpenAI | null = null;
  private model: string = 'gpt-4-turbo-preview';

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organizationId,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 60000
    });

    this.model = config.model || this.model;
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.initialized && this.client);
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const messages = this.buildMessages(request);

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
        top_p: request.topP || 1,
        stream: false
      });

      const choice = completion.choices[0];

      return {
        content: choice.message.content || '',
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        },
        model: completion.model,
        finishReason: choice.finish_reason || undefined
      };
    } catch (error) {
      console.error('OpenAI completion error:', error);
      throw new Error(
        `OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async *streamCompletion(request: CompletionRequest): AsyncIterableIterator<StreamChunk> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const messages = this.buildMessages(request);

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
        top_p: request.topP || 1,
        stream: true
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content || '';

        if (content) {
          yield {
            content,
            isComplete: false
          };
        }

        // Check if stream is complete
        if (chunk.choices[0]?.finish_reason) {
          yield {
            content: '',
            isComplete: true,
            usage: chunk.usage ? {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens
            } : undefined
          };
        }
      }
    } catch (error) {
      console.error('OpenAI stream error:', error);
      throw new Error(
        `OpenAI stream error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async dispose(): Promise<void> {
    this.client = null;
    await super.dispose();
  }
}

/**
 * Claude (Anthropic) Provider Implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider } from './interfaces/AIProvider';
import { CompletionRequest, CompletionResponse, StreamChunk, ProviderConfig, ProviderType } from '../types';

export class ClaudeProvider extends BaseAIProvider {
  readonly type = ProviderType.CLAUDE;
  private client: Anthropic | null = null;
  private model: string = 'claude-3-sonnet-20240229';

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
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
      throw new Error('Claude client not initialized');
    }

    const messages = this.buildMessages(request);

    // Extract system message if present
    let systemMessage = '';
    const userMessages = messages.filter(msg => {
      if (msg.role === 'system') {
        systemMessage = msg.content;
        return false;
      }
      return true;
    });

    try {
      const completion = await this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
        top_p: request.topP || 1,
        system: systemMessage || undefined,
        messages: userMessages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }))
      });

      const textContent = completion.content.find(c => c.type === 'text');

      return {
        content: textContent && 'text' in textContent ? textContent.text : '',
        usage: {
          promptTokens: completion.usage.input_tokens,
          completionTokens: completion.usage.output_tokens,
          totalTokens: completion.usage.input_tokens + completion.usage.output_tokens
        },
        model: completion.model,
        finishReason: completion.stop_reason || undefined
      };
    } catch (error) {
      console.error('Claude completion error:', error);
      throw new Error(
        `Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async *streamCompletion(request: CompletionRequest): AsyncIterableIterator<StreamChunk> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('Claude client not initialized');
    }

    const messages = this.buildMessages(request);

    // Extract system message if present
    let systemMessage = '';
    const userMessages = messages.filter(msg => {
      if (msg.role === 'system') {
        systemMessage = msg.content;
        return false;
      }
      return true;
    });

    try {
      const stream = await this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
        top_p: request.topP || 1,
        system: systemMessage || undefined,
        messages: userMessages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })),
        stream: true
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield {
            content: event.delta.text,
            isComplete: false
          };
        }

        if (event.type === 'message_stop') {
          yield {
            content: '',
            isComplete: true
          };
        }
      }
    } catch (error) {
      console.error('Claude stream error:', error);
      throw new Error(
        `Claude stream error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async dispose(): Promise<void> {
    this.client = null;
    await super.dispose();
  }
}

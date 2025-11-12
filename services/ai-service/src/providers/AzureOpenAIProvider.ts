/**
 * Azure OpenAI Provider Implementation
 */

import OpenAI from 'openai';
import { BaseAIProvider } from './interfaces/AIProvider';
import { CompletionRequest, CompletionResponse, StreamChunk, ProviderConfig, ProviderType } from '../types';

export class AzureOpenAIProvider extends BaseAIProvider {
  readonly type = ProviderType.AZURE_OPENAI;
  private client: OpenAI | null = null;
  private deploymentId: string = '';

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    if (!config.apiKey || !config.endpoint || !config.deploymentId) {
      throw new Error('Azure OpenAI API key, endpoint, and deployment ID are required');
    }

    this.deploymentId = config.deploymentId;

    // Azure OpenAI uses a different base URL format
    const baseURL = `${config.endpoint}/openai/deployments/${this.deploymentId}`;

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL,
      defaultQuery: { 'api-version': '2024-02-15-preview' },
      defaultHeaders: { 'api-key': config.apiKey },
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 60000
    });
  }

  validateConfig(): boolean {
    return !!(
      this.config.apiKey &&
      this.config.endpoint &&
      this.config.deploymentId &&
      this.initialized &&
      this.client
    );
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('Azure OpenAI client not initialized');
    }

    const messages = this.buildMessages(request);

    try {
      const completion = await this.client.chat.completions.create({
        model: this.deploymentId, // In Azure, this is the deployment name
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
      console.error('Azure OpenAI completion error:', error);
      throw new Error(
        `Azure OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async *streamCompletion(request: CompletionRequest): AsyncIterableIterator<StreamChunk> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('Azure OpenAI client not initialized');
    }

    const messages = this.buildMessages(request);

    try {
      const stream = await this.client.chat.completions.create({
        model: this.deploymentId,
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
            usage: chunk.usage
              ? {
                  promptTokens: chunk.usage.prompt_tokens,
                  completionTokens: chunk.usage.completion_tokens,
                  totalTokens: chunk.usage.total_tokens
                }
              : undefined
          };
        }
      }
    } catch (error) {
      console.error('Azure OpenAI stream error:', error);
      throw new Error(
        `Azure OpenAI stream error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async dispose(): Promise<void> {
    this.client = null;
    await super.dispose();
  }
}

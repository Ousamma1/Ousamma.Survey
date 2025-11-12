/**
 * Google Gemini Provider Implementation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseAIProvider } from './interfaces/AIProvider';
import { CompletionRequest, CompletionResponse, StreamChunk, ProviderConfig, ProviderType } from '../types';

export class GeminiProvider extends BaseAIProvider {
  readonly type = ProviderType.GEMINI;
  private client: GoogleGenerativeAI | null = null;
  private model: string = 'gemini-pro';

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    if (!config.apiKey) {
      throw new Error('Google API key is required');
    }

    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || this.model;
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.initialized && this.client);
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('Gemini client not initialized');
    }

    try {
      const model = this.client.getGenerativeModel({ model: this.model });

      // Build prompt from messages
      const messages = this.buildMessages(request);
      const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: request.maxTokens || 2000,
          temperature: request.temperature || 0.7,
          topP: request.topP || 1
        }
      });

      const response = result.response;
      const text = response.text();

      return {
        content: text,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0
        },
        model: this.model,
        finishReason: response.candidates?.[0]?.finishReason
      };
    } catch (error) {
      console.error('Gemini completion error:', error);
      throw new Error(
        `Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async *streamCompletion(request: CompletionRequest): AsyncIterableIterator<StreamChunk> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('Gemini client not initialized');
    }

    try {
      const model = this.client.getGenerativeModel({ model: this.model });

      // Build prompt from messages
      const messages = this.buildMessages(request);
      const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');

      const result = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: request.maxTokens || 2000,
          temperature: request.temperature || 0.7,
          topP: request.topP || 1
        }
      });

      for await (const chunk of result.stream) {
        const text = chunk.text();

        if (text) {
          yield {
            content: text,
            isComplete: false
          };
        }
      }

      // Signal completion
      yield {
        content: '',
        isComplete: true
      };
    } catch (error) {
      console.error('Gemini stream error:', error);
      throw new Error(
        `Gemini stream error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async dispose(): Promise<void> {
    this.client = null;
    await super.dispose();
  }
}

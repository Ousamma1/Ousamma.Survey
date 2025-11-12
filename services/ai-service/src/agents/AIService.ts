/**
 * AI Service
 * Main service orchestrating AI operations
 */

import { ProviderManager, ProviderFactory } from '../providers';
import { SurveyAgent } from './SurveyAgent';
import { ProviderType, CompletionRequest, CompletionResponse, StreamChunk } from '../types';
import { ContextService, ProviderConfigService, UsageTrackingService } from '../services';

export class AIService {
  private providerManager: ProviderManager;
  private contextService: ContextService;
  private providerConfigService: ProviderConfigService;
  private usageTrackingService: UsageTrackingService;

  constructor(
    providerManager: ProviderManager,
    contextService: ContextService,
    providerConfigService: ProviderConfigService,
    usageTrackingService: UsageTrackingService
  ) {
    this.providerManager = providerManager;
    this.contextService = contextService;
    this.providerConfigService = providerConfigService;
    this.usageTrackingService = usageTrackingService;
  }

  /**
   * Initialize the service with provider configurations
   */
  async initialize(): Promise<void> {
    // Load provider configurations from database
    const configs = await this.providerConfigService.getAllDecryptedProviderConfigs({
      enabled: true
    });

    // Register providers
    for (const config of configs) {
      this.providerManager.registerProvider(`${config.type}-default`, config);
    }

    // Set fallback order based on priority
    const fallbackOrder = configs
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .map(c => c.type);

    this.providerManager.setFallbackOrder(fallbackOrder);
  }

  /**
   * Chat with AI
   */
  async chat(request: {
    message: string;
    conversationId?: string;
    userId?: string;
    tenantId?: string;
    providerId?: string;
    providerType?: ProviderType;
    maxTokens?: number;
    temperature?: number;
  }): Promise<CompletionResponse> {
    const startTime = Date.now();

    try {
      // Get or create conversation
      let conversation;
      if (request.conversationId) {
        conversation = await this.contextService.getConversation(request.conversationId);
      }

      if (!conversation) {
        conversation = await this.contextService.createConversation({
          userId: request.userId,
          tenantId: request.tenantId
        });
      }

      // Add user message to conversation
      await this.contextService.addMessage(conversation.conversationId, {
        role: 'user',
        content: request.message
      });

      // Build context
      const context = await this.contextService.buildConversationContext(
        conversation.conversationId
      );

      // Get provider
      const provider = await this.getProvider(request.providerId, request.providerType);

      // Generate completion
      const completionRequest: CompletionRequest = {
        prompt: request.message,
        context,
        maxTokens: request.maxTokens,
        temperature: request.temperature
      };

      const response = await provider.generateCompletion(completionRequest);

      // Add assistant message to conversation
      await this.contextService.addMessage(conversation.conversationId, {
        role: 'assistant',
        content: response.content
      });

      // Update usage
      if (response.usage) {
        await this.contextService.updateUsage(
          conversation.conversationId,
          response.usage.totalTokens,
          0 // Cost calculation would go here
        );
      }

      // Track usage
      const latency = Date.now() - startTime;
      await this.usageTrackingService.trackUsage({
        conversationId: conversation.conversationId,
        userId: request.userId,
        tenantId: request.tenantId,
        providerId: request.providerId || 'default',
        providerType: provider.type,
        model: response.model,
        operation: 'completion',
        promptTokens: response.usage?.promptTokens,
        completionTokens: response.usage?.completionTokens,
        totalTokens: response.usage?.totalTokens,
        latency,
        success: true
      });

      return response;
    } catch (error) {
      const latency = Date.now() - startTime;

      // Track failure
      await this.usageTrackingService.trackUsage({
        userId: request.userId,
        tenantId: request.tenantId,
        providerId: request.providerId || 'default',
        providerType: request.providerType || 'unknown',
        operation: 'completion',
        latency,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Stream chat with AI
   */
  async *streamChat(request: {
    message: string;
    conversationId?: string;
    userId?: string;
    tenantId?: string;
    providerId?: string;
    providerType?: ProviderType;
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterableIterator<StreamChunk> {
    const startTime = Date.now();

    try {
      // Get or create conversation
      let conversation;
      if (request.conversationId) {
        conversation = await this.contextService.getConversation(request.conversationId);
      }

      if (!conversation) {
        conversation = await this.contextService.createConversation({
          userId: request.userId,
          tenantId: request.tenantId
        });
      }

      // Add user message
      await this.contextService.addMessage(conversation.conversationId, {
        role: 'user',
        content: request.message
      });

      // Build context
      const context = await this.contextService.buildConversationContext(
        conversation.conversationId
      );

      // Get provider
      const provider = await this.getProvider(request.providerId, request.providerType);

      // Stream completion
      const completionRequest: CompletionRequest = {
        prompt: request.message,
        context,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        stream: true
      };

      let fullResponse = '';
      let totalTokens = 0;

      for await (const chunk of provider.streamCompletion(completionRequest)) {
        fullResponse += chunk.content;

        if (chunk.usage) {
          totalTokens = chunk.usage.totalTokens;
        }

        yield chunk;
      }

      // Add assistant message
      await this.contextService.addMessage(conversation.conversationId, {
        role: 'assistant',
        content: fullResponse
      });

      // Update usage
      if (totalTokens > 0) {
        await this.contextService.updateUsage(conversation.conversationId, totalTokens, 0);
      }

      // Track usage
      const latency = Date.now() - startTime;
      await this.usageTrackingService.trackUsage({
        conversationId: conversation.conversationId,
        userId: request.userId,
        tenantId: request.tenantId,
        providerId: request.providerId || 'default',
        providerType: provider.type,
        operation: 'stream',
        totalTokens,
        latency,
        success: true
      });
    } catch (error) {
      const latency = Date.now() - startTime;

      await this.usageTrackingService.trackUsage({
        userId: request.userId,
        tenantId: request.tenantId,
        providerId: request.providerId || 'default',
        providerType: request.providerType || 'unknown',
        operation: 'stream',
        latency,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Generate survey
   */
  async generateSurvey(request: {
    description: string;
    questionCount?: number;
    language?: 'en' | 'ar' | 'bilingual';
    questionTypes?: string[];
    targetAudience?: string;
    userId?: string;
    tenantId?: string;
    providerId?: string;
    providerType?: ProviderType;
  }): Promise<any> {
    const provider = await this.getProvider(request.providerId, request.providerType);
    const agent = new SurveyAgent(provider);

    return await agent.generateSurvey(request.description, {
      questionCount: request.questionCount,
      language: request.language,
      questionTypes: request.questionTypes,
      targetAudience: request.targetAudience
    });
  }

  /**
   * Optimize survey
   */
  async optimizeSurvey(request: {
    survey: any;
    optimizationGoals?: string[];
    userId?: string;
    tenantId?: string;
    providerId?: string;
    providerType?: ProviderType;
  }): Promise<any> {
    const provider = await this.getProvider(request.providerId, request.providerType);
    const agent = new SurveyAgent(provider);

    return await agent.optimizeSurvey(request.survey, request.optimizationGoals);
  }

  /**
   * Analyze responses
   */
  async analyzeResponses(request: {
    survey: any;
    responses: any[];
    userId?: string;
    tenantId?: string;
    providerId?: string;
    providerType?: ProviderType;
  }): Promise<any> {
    const provider = await this.getProvider(request.providerId, request.providerType);
    const agent = new SurveyAgent(provider);

    return await agent.analyzeResponses(request.survey, request.responses);
  }

  /**
   * Generate report
   */
  async generateReport(request: {
    survey: any;
    responses: any[];
    reportType?: 'summary' | 'detailed' | 'executive';
    userId?: string;
    tenantId?: string;
    providerId?: string;
    providerType?: ProviderType;
  }): Promise<string> {
    const provider = await this.getProvider(request.providerId, request.providerType);
    const agent = new SurveyAgent(provider);

    return await agent.generateReport(request.survey, request.responses, request.reportType);
  }

  /**
   * Get provider (with fallback support)
   */
  private async getProvider(providerId?: string, providerType?: ProviderType) {
    if (providerId) {
      return await this.providerManager.getProvider(providerId);
    }

    if (providerType) {
      return await this.providerManager.getProviderWithFallback(providerType);
    }

    // Use default provider (first enabled)
    const providers = this.providerManager.getEnabledProviders();
    if (providers.size === 0) {
      throw new Error('No enabled providers available');
    }

    const defaultProviderId = Array.from(providers.keys())[0];
    return await this.providerManager.getProvider(defaultProviderId);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<Map<string, any>> {
    return await this.providerManager.checkHealth();
  }
}

/**
 * Core types for AI Service
 */

export enum ProviderType {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  GEMINI = 'gemini',
  OLLAMA = 'ollama',
  AZURE_OPENAI = 'azure_openai',
  CUSTOM = 'custom'
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  prompt: string;
  context?: ConversationContext;
  messages?: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
}

export interface StreamChunk {
  content: string;
  isComplete: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ConversationContext {
  conversationId?: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  history?: AIMessage[];
  surveyContext?: SurveyContext;
  responseContext?: ResponseContext;
  fileContext?: FileContext;
}

export interface SurveyContext {
  surveyId?: string;
  surveyTitle?: string;
  questions?: any[];
  metadata?: Record<string, any>;
}

export interface ResponseContext {
  responseId?: string;
  responses?: any[];
  statistics?: Record<string, any>;
}

export interface FileContext {
  fileId?: string;
  fileName?: string;
  fileType?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  organizationId?: string;
  deploymentId?: string;
  maxRetries?: number;
  timeout?: number;
  customHeaders?: Record<string, string>;
  enabled: boolean;
  priority?: number;
}

export interface ProviderMetrics {
  requestCount: number;
  errorCount: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  lastUsed?: Date;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  perUser?: boolean;
  perTenant?: boolean;
}

export interface CostConfig {
  promptTokenCost: number;
  completionTokenCost: number;
  currency: string;
}

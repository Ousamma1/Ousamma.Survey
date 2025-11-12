/**
 * Provider Configuration Service
 * Manages AI provider configurations with encryption
 */

import { v4 as uuidv4 } from 'uuid';
import { ProviderConfigModel, IProviderConfig } from '../models';
import { ProviderType, ProviderConfig } from '../types';
import { EncryptionService } from './EncryptionService';

export class ProviderConfigService {
  private encryptionService: EncryptionService;

  constructor(encryptionService: EncryptionService) {
    this.encryptionService = encryptionService;
  }

  /**
   * Create a new provider configuration
   */
  async createProviderConfig(data: {
    tenantId?: string;
    type: ProviderType;
    name: string;
    apiKey?: string;
    endpoint?: string;
    model?: string;
    organizationId?: string;
    deploymentId?: string;
    maxRetries?: number;
    timeout?: number;
    customHeaders?: Record<string, string>;
    enabled?: boolean;
    priority?: number;
    rateLimit?: {
      windowMs: number;
      maxRequests: number;
    };
    costConfig?: {
      promptTokenCost: number;
      completionTokenCost: number;
      currency: string;
    };
    metadata?: Record<string, any>;
  }): Promise<IProviderConfig> {
    // Encrypt API key if provided
    const encryptedApiKey = data.apiKey ? this.encryptionService.encrypt(data.apiKey) : undefined;

    const config = new ProviderConfigModel({
      providerId: uuidv4(),
      ...data,
      apiKey: encryptedApiKey
    });

    return await config.save();
  }

  /**
   * Get provider configuration by ID
   */
  async getProviderConfig(providerId: string): Promise<IProviderConfig | null> {
    return await ProviderConfigModel.findOne({ providerId });
  }

  /**
   * Get provider configuration with decrypted API key
   */
  async getDecryptedProviderConfig(providerId: string): Promise<ProviderConfig | null> {
    const config = await this.getProviderConfig(providerId);

    if (!config) {
      return null;
    }

    return this.decryptProviderConfig(config);
  }

  /**
   * Get all provider configurations
   */
  async getAllProviderConfigs(filters: {
    tenantId?: string;
    type?: ProviderType;
    enabled?: boolean;
  } = {}): Promise<IProviderConfig[]> {
    const query: any = {};

    if (filters.tenantId) query.tenantId = filters.tenantId;
    if (filters.type) query.type = filters.type;
    if (filters.enabled !== undefined) query.enabled = filters.enabled;

    return await ProviderConfigModel.find(query).sort({ priority: -1, createdAt: -1 });
  }

  /**
   * Get all decrypted provider configurations
   */
  async getAllDecryptedProviderConfigs(filters: {
    tenantId?: string;
    type?: ProviderType;
    enabled?: boolean;
  } = {}): Promise<ProviderConfig[]> {
    const configs = await this.getAllProviderConfigs(filters);
    return configs.map(config => this.decryptProviderConfig(config));
  }

  /**
   * Update provider configuration
   */
  async updateProviderConfig(
    providerId: string,
    updates: Partial<{
      name: string;
      apiKey: string;
      endpoint: string;
      model: string;
      organizationId: string;
      deploymentId: string;
      maxRetries: number;
      timeout: number;
      customHeaders: Record<string, string>;
      enabled: boolean;
      priority: number;
      rateLimit: {
        windowMs: number;
        maxRequests: number;
      };
      costConfig: {
        promptTokenCost: number;
        completionTokenCost: number;
        currency: string;
      };
      metadata: Record<string, any>;
    }>
  ): Promise<IProviderConfig | null> {
    // Encrypt API key if provided in updates
    if (updates.apiKey) {
      updates.apiKey = this.encryptionService.encrypt(updates.apiKey);
    }

    return await ProviderConfigModel.findOneAndUpdate(
      { providerId },
      { $set: updates },
      { new: true }
    );
  }

  /**
   * Delete provider configuration
   */
  async deleteProviderConfig(providerId: string): Promise<boolean> {
    const result = await ProviderConfigModel.deleteOne({ providerId });
    return result.deletedCount === 1;
  }

  /**
   * Enable/disable provider
   */
  async toggleProvider(providerId: string, enabled: boolean): Promise<IProviderConfig | null> {
    return await ProviderConfigModel.findOneAndUpdate(
      { providerId },
      { $set: { enabled } },
      { new: true }
    );
  }

  /**
   * Get enabled providers by priority
   */
  async getEnabledProviders(tenantId?: string): Promise<ProviderConfig[]> {
    const query: any = { enabled: true };
    if (tenantId) query.tenantId = tenantId;

    const configs = await ProviderConfigModel.find(query).sort({ priority: -1 });

    return configs.map(config => this.decryptProviderConfig(config));
  }

  /**
   * Get provider by type
   */
  async getProviderByType(
    type: ProviderType,
    tenantId?: string
  ): Promise<ProviderConfig | null> {
    const query: any = { type, enabled: true };
    if (tenantId) query.tenantId = tenantId;

    const config = await ProviderConfigModel.findOne(query).sort({ priority: -1 });

    if (!config) {
      return null;
    }

    return this.decryptProviderConfig(config);
  }

  /**
   * Decrypt provider configuration
   */
  private decryptProviderConfig(config: IProviderConfig): ProviderConfig {
    const decryptedApiKey = config.apiKey
      ? this.encryptionService.decrypt(config.apiKey)
      : undefined;

    return {
      type: config.type,
      apiKey: decryptedApiKey,
      endpoint: config.endpoint,
      model: config.model,
      organizationId: config.organizationId,
      deploymentId: config.deploymentId,
      maxRetries: config.maxRetries,
      timeout: config.timeout,
      customHeaders: config.customHeaders,
      enabled: config.enabled,
      priority: config.priority
    };
  }

  /**
   * Validate provider configuration
   */
  validateConfig(type: ProviderType, config: Partial<ProviderConfig>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    switch (type) {
      case ProviderType.OPENAI:
        if (!config.apiKey) errors.push('API key is required for OpenAI');
        break;

      case ProviderType.CLAUDE:
        if (!config.apiKey) errors.push('API key is required for Claude');
        break;

      case ProviderType.GEMINI:
        if (!config.apiKey) errors.push('API key is required for Gemini');
        break;

      case ProviderType.AZURE_OPENAI:
        if (!config.apiKey) errors.push('API key is required for Azure OpenAI');
        if (!config.endpoint) errors.push('Endpoint is required for Azure OpenAI');
        if (!config.deploymentId) errors.push('Deployment ID is required for Azure OpenAI');
        break;

      case ProviderType.OLLAMA:
        if (!config.endpoint) errors.push('Endpoint is required for Ollama');
        break;

      case ProviderType.CUSTOM:
        if (!config.endpoint) errors.push('Endpoint is required for custom provider');
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

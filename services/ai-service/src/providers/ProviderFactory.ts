/**
 * Provider Factory
 * Manages creation and lifecycle of AI providers
 */

import { IAIProvider } from './interfaces/AIProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { GeminiProvider } from './GeminiProvider';
import { OllamaProvider } from './OllamaProvider';
import { AzureOpenAIProvider } from './AzureOpenAIProvider';
import { CustomProvider } from './CustomProvider';
import { ProviderType, ProviderConfig } from '../types';

export class ProviderFactory {
  private static providers: Map<string, IAIProvider> = new Map();

  /**
   * Create a provider instance
   */
  static async createProvider(config: ProviderConfig): Promise<IAIProvider> {
    const provider = this.instantiateProvider(config.type);
    await provider.initialize(config);
    return provider;
  }

  /**
   * Get or create a cached provider
   */
  static async getProvider(config: ProviderConfig): Promise<IAIProvider> {
    const key = this.generateProviderKey(config);

    if (this.providers.has(key)) {
      const provider = this.providers.get(key)!;

      // Validate that the cached provider is still valid
      if (provider.validateConfig()) {
        return provider;
      } else {
        // Remove invalid provider
        await this.removeProvider(key);
      }
    }

    // Create new provider
    const provider = await this.createProvider(config);
    this.providers.set(key, provider);
    return provider;
  }

  /**
   * Remove a provider from cache
   */
  static async removeProvider(key: string): Promise<void> {
    const provider = this.providers.get(key);
    if (provider) {
      await provider.dispose();
      this.providers.delete(key);
    }
  }

  /**
   * Clear all providers
   */
  static async clearAll(): Promise<void> {
    const disposePromises = Array.from(this.providers.values()).map(p => p.dispose());
    await Promise.all(disposePromises);
    this.providers.clear();
  }

  /**
   * Get all active providers
   */
  static getActiveProviders(): Map<string, IAIProvider> {
    return new Map(this.providers);
  }

  /**
   * Check health of all providers
   */
  static async checkAllHealth(): Promise<
    Map<
      string,
      {
        healthy: boolean;
        message?: string;
        latency?: number;
      }
    >
  > {
    const results = new Map();

    for (const [key, provider] of this.providers) {
      const health = await provider.getHealthStatus();
      results.set(key, health);
    }

    return results;
  }

  /**
   * Instantiate a provider based on type
   */
  private static instantiateProvider(type: ProviderType): IAIProvider {
    switch (type) {
      case ProviderType.OPENAI:
        return new OpenAIProvider();
      case ProviderType.CLAUDE:
        return new ClaudeProvider();
      case ProviderType.GEMINI:
        return new GeminiProvider();
      case ProviderType.OLLAMA:
        return new OllamaProvider();
      case ProviderType.AZURE_OPENAI:
        return new AzureOpenAIProvider();
      case ProviderType.CUSTOM:
        return new CustomProvider();
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Generate a unique key for a provider configuration
   */
  private static generateProviderKey(config: ProviderConfig): string {
    return `${config.type}-${config.model || 'default'}-${config.endpoint || 'default'}`;
  }
}

/**
 * Provider Manager
 * High-level manager for working with multiple providers
 */
export class ProviderManager {
  private configs: Map<string, ProviderConfig> = new Map();
  private fallbackOrder: ProviderType[] = [];

  /**
   * Register a provider configuration
   */
  registerProvider(id: string, config: ProviderConfig): void {
    this.configs.set(id, config);
  }

  /**
   * Unregister a provider
   */
  async unregisterProvider(id: string): Promise<void> {
    const config = this.configs.get(id);
    if (config) {
      const key = this.generateProviderKey(config);
      await ProviderFactory.removeProvider(key);
      this.configs.delete(id);
    }
  }

  /**
   * Get a provider by ID
   */
  async getProvider(id: string): Promise<IAIProvider> {
    const config = this.configs.get(id);
    if (!config) {
      throw new Error(`Provider ${id} not found`);
    }

    if (!config.enabled) {
      throw new Error(`Provider ${id} is disabled`);
    }

    return ProviderFactory.getProvider(config);
  }

  /**
   * Get provider by type with fallback
   */
  async getProviderByType(type: ProviderType): Promise<IAIProvider> {
    // Find the first enabled provider of the requested type
    for (const [id, config] of this.configs) {
      if (config.type === type && config.enabled) {
        return this.getProvider(id);
      }
    }

    throw new Error(`No enabled provider found for type: ${type}`);
  }

  /**
   * Get provider with fallback support
   */
  async getProviderWithFallback(preferredType: ProviderType): Promise<IAIProvider> {
    // Try preferred provider first
    try {
      return await this.getProviderByType(preferredType);
    } catch (error) {
      console.warn(`Preferred provider ${preferredType} not available, trying fallback`);
    }

    // Try fallback providers in order
    for (const fallbackType of this.fallbackOrder) {
      if (fallbackType === preferredType) continue;

      try {
        return await this.getProviderByType(fallbackType);
      } catch (error) {
        console.warn(`Fallback provider ${fallbackType} not available`);
      }
    }

    throw new Error('No available providers');
  }

  /**
   * Set fallback order
   */
  setFallbackOrder(order: ProviderType[]): void {
    this.fallbackOrder = order;
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): Map<string, ProviderConfig> {
    return new Map(this.configs);
  }

  /**
   * Get enabled providers
   */
  getEnabledProviders(): Map<string, ProviderConfig> {
    const enabled = new Map();
    for (const [id, config] of this.configs) {
      if (config.enabled) {
        enabled.set(id, config);
      }
    }
    return enabled;
  }

  /**
   * Check health of all providers
   */
  async checkHealth(): Promise<Map<string, any>> {
    const results = new Map();

    for (const [id, config] of this.configs) {
      if (!config.enabled) {
        results.set(id, { healthy: false, message: 'Provider disabled' });
        continue;
      }

      try {
        const provider = await this.getProvider(id);
        const health = await provider.getHealthStatus();
        results.set(id, health);
      } catch (error) {
        results.set(id, {
          healthy: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  private generateProviderKey(config: ProviderConfig): string {
    return `${config.type}-${config.model || 'default'}-${config.endpoint || 'default'}`;
  }
}

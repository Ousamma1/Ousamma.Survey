/**
 * Usage Tracking Service
 * Tracks AI usage metrics and costs
 */

import { v4 as uuidv4 } from 'uuid';
import { UsageMetric, IUsageMetric } from '../models';

export interface UsageMetricData {
  conversationId?: string;
  userId?: string;
  tenantId?: string;
  providerId: string;
  providerType: string;
  model?: string;
  operation: 'completion' | 'stream' | 'health_check';
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  currency?: string;
  latency?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class UsageTrackingService {
  /**
   * Track a usage metric
   */
  async trackUsage(data: UsageMetricData): Promise<IUsageMetric> {
    const metric = new UsageMetric({
      metricId: uuidv4(),
      ...data,
      timestamp: new Date()
    });

    return await metric.save();
  }

  /**
   * Get usage metrics by filters
   */
  async getUsageMetrics(filters: {
    userId?: string;
    tenantId?: string;
    providerId?: string;
    providerType?: string;
    operation?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<IUsageMetric[]> {
    const query: any = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.tenantId) query.tenantId = filters.tenantId;
    if (filters.providerId) query.providerId = filters.providerId;
    if (filters.providerType) query.providerType = filters.providerType;
    if (filters.operation) query.operation = filters.operation;
    if (filters.success !== undefined) query.success = filters.success;

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }

    return await UsageMetric.find(query)
      .sort({ timestamp: -1 })
      .skip(filters.offset || 0)
      .limit(filters.limit || 100);
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(filters: {
    userId?: string;
    tenantId?: string;
    providerId?: string;
    providerType?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalTokens: number;
    totalCost: number;
    averageLatency: number;
    byProvider: Record<string, any>;
  }> {
    const query: any = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.tenantId) query.tenantId = filters.tenantId;
    if (filters.providerId) query.providerId = filters.providerId;
    if (filters.providerType) query.providerType = filters.providerType;

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }

    const metrics = await UsageMetric.find(query);

    const stats = {
      totalRequests: metrics.length,
      successfulRequests: metrics.filter(m => m.success).length,
      failedRequests: metrics.filter(m => !m.success).length,
      totalTokens: metrics.reduce((sum, m) => sum + m.totalTokens, 0),
      totalCost: metrics.reduce((sum, m) => sum + m.cost, 0),
      averageLatency: metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length || 0,
      byProvider: {} as Record<string, any>
    };

    // Group by provider
    const providerGroups: Record<string, IUsageMetric[]> = {};
    for (const metric of metrics) {
      if (!providerGroups[metric.providerType]) {
        providerGroups[metric.providerType] = [];
      }
      providerGroups[metric.providerType].push(metric);
    }

    for (const [provider, providerMetrics] of Object.entries(providerGroups)) {
      stats.byProvider[provider] = {
        requests: providerMetrics.length,
        successful: providerMetrics.filter(m => m.success).length,
        failed: providerMetrics.filter(m => !m.success).length,
        tokens: providerMetrics.reduce((sum, m) => sum + m.totalTokens, 0),
        cost: providerMetrics.reduce((sum, m) => sum + m.cost, 0),
        averageLatency: providerMetrics.reduce((sum, m) => sum + m.latency, 0) / providerMetrics.length
      };
    }

    return stats;
  }

  /**
   * Get cost summary
   */
  async getCostSummary(filters: {
    userId?: string;
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{
    totalCost: number;
    costByProvider: Record<string, number>;
    costByDay: Array<{ date: string; cost: number }>;
  }> {
    const query: any = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.tenantId) query.tenantId = filters.tenantId;

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }

    const metrics = await UsageMetric.find(query);

    const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0);

    const costByProvider: Record<string, number> = {};
    for (const metric of metrics) {
      if (!costByProvider[metric.providerType]) {
        costByProvider[metric.providerType] = 0;
      }
      costByProvider[metric.providerType] += metric.cost;
    }

    // Group by day
    const costByDay: Record<string, number> = {};
    for (const metric of metrics) {
      const date = metric.timestamp.toISOString().split('T')[0];
      if (!costByDay[date]) {
        costByDay[date] = 0;
      }
      costByDay[date] += metric.cost;
    }

    return {
      totalCost,
      costByProvider,
      costByDay: Object.entries(costByDay).map(([date, cost]) => ({ date, cost }))
    };
  }

  /**
   * Clean up old metrics
   */
  async cleanupOldMetrics(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await UsageMetric.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    return result.deletedCount || 0;
  }
}

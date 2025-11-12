/**
 * Usage Metrics Model
 * Tracks AI usage and costs
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IUsageMetric extends Document {
  metricId: string;
  conversationId?: string;
  userId?: string;
  tenantId?: string;
  providerId: string;
  providerType: string;
  model?: string;
  operation: 'completion' | 'stream' | 'health_check';
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  currency: string;
  latency: number; // milliseconds
  success: boolean;
  errorMessage?: string;
  metadata: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
}

const UsageMetricSchema = new Schema<IUsageMetric>(
  {
    metricId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    conversationId: {
      type: String,
      index: true
    },
    userId: {
      type: String,
      index: true
    },
    tenantId: {
      type: String,
      index: true
    },
    providerId: {
      type: String,
      required: true,
      index: true
    },
    providerType: {
      type: String,
      required: true,
      index: true
    },
    model: {
      type: String
    },
    operation: {
      type: String,
      enum: ['completion', 'stream', 'health_check'],
      required: true
    },
    promptTokens: {
      type: Number,
      default: 0
    },
    completionTokens: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    cost: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    latency: {
      type: Number,
      default: 0
    },
    success: {
      type: Boolean,
      required: true,
      index: true
    },
    errorMessage: {
      type: String
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'usage_metrics'
  }
);

// Indexes for analytics queries
UsageMetricSchema.index({ timestamp: -1 });
UsageMetricSchema.index({ userId: 1, timestamp: -1 });
UsageMetricSchema.index({ tenantId: 1, timestamp: -1 });
UsageMetricSchema.index({ providerId: 1, timestamp: -1 });
UsageMetricSchema.index({ success: 1, timestamp: -1 });

// Compound indexes for common analytics queries
UsageMetricSchema.index({ tenantId: 1, providerType: 1, timestamp: -1 });
UsageMetricSchema.index({ userId: 1, operation: 1, timestamp: -1 });

export const UsageMetric = mongoose.model<IUsageMetric>('UsageMetric', UsageMetricSchema);

/**
 * Provider Configuration Model
 * Stores AI provider configurations (encrypted)
 */

import mongoose, { Schema, Document } from 'mongoose';
import { ProviderType } from '../types';

export interface IProviderConfig extends Document {
  providerId: string;
  tenantId?: string;
  type: ProviderType;
  name: string;
  apiKey?: string; // Will be encrypted
  endpoint?: string;
  model?: string;
  organizationId?: string;
  deploymentId?: string;
  maxRetries: number;
  timeout: number;
  customHeaders?: Record<string, string>;
  enabled: boolean;
  priority: number;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  costConfig?: {
    promptTokenCost: number;
    completionTokenCost: number;
    currency: string;
  };
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderConfigSchema = new Schema<IProviderConfig>(
  {
    providerId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    tenantId: {
      type: String,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(ProviderType),
      required: true
    },
    name: {
      type: String,
      required: true
    },
    apiKey: {
      type: String
    },
    endpoint: {
      type: String
    },
    model: {
      type: String
    },
    organizationId: {
      type: String
    },
    deploymentId: {
      type: String
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    timeout: {
      type: Number,
      default: 60000
    },
    customHeaders: {
      type: Schema.Types.Mixed
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true
    },
    priority: {
      type: Number,
      default: 0
    },
    rateLimit: {
      windowMs: Number,
      maxRequests: Number
    },
    costConfig: {
      promptTokenCost: Number,
      completionTokenCost: Number,
      currency: String
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'provider_configs'
  }
);

// Indexes
ProviderConfigSchema.index({ tenantId: 1, enabled: 1, priority: -1 });
ProviderConfigSchema.index({ type: 1, enabled: 1 });

export const ProviderConfigModel = mongoose.model<IProviderConfig>(
  'ProviderConfig',
  ProviderConfigSchema
);

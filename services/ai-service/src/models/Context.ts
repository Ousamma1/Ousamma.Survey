/**
 * Context Model
 * Stores contextual information for AI conversations
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IContext extends Document {
  contextId: string;
  conversationId?: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  contextType: 'survey' | 'response' | 'file' | 'custom';
  data: Record<string, any>;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContextSchema = new Schema<IContext>(
  {
    contextId: {
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
    sessionId: {
      type: String,
      index: true
    },
    contextType: {
      type: String,
      enum: ['survey', 'response', 'file', 'custom'],
      required: true,
      index: true
    },
    data: {
      type: Schema.Types.Mixed,
      required: true
    },
    expiresAt: {
      type: Date,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'contexts'
  }
);

// Indexes for efficient queries
ContextSchema.index({ conversationId: 1, contextType: 1 });
ContextSchema.index({ userId: 1, contextType: 1, createdAt: -1 });
ContextSchema.index({ tenantId: 1, contextType: 1, createdAt: -1 });
ContextSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Methods
ContextSchema.methods.updateData = function (newData: Record<string, any>) {
  this.data = { ...this.data, ...newData };
  return this.save();
};

ContextSchema.methods.isExpired = function () {
  return this.expiresAt && this.expiresAt < new Date();
};

export const Context = mongoose.model<IContext>('Context', ContextSchema);

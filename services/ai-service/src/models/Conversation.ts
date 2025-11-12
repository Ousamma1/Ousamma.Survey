/**
 * Conversation Model
 * Stores conversation history between users and AI
 */

import mongoose, { Schema, Document } from 'mongoose';
import { AIMessage } from '../types';

export interface IConversation extends Document {
  conversationId: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  title?: string;
  messages: AIMessage[];
  metadata: Record<string, any>;
  providerType?: string;
  model?: string;
  totalTokens: number;
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  status: 'active' | 'archived' | 'deleted';
}

const ConversationSchema = new Schema<IConversation>(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
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
    title: {
      type: String,
      default: 'New Conversation'
    },
    messages: [
      {
        role: {
          type: String,
          enum: ['system', 'user', 'assistant'],
          required: true
        },
        content: {
          type: String,
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ],
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    providerType: {
      type: String
    },
    model: {
      type: String
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active'
    }
  },
  {
    timestamps: true,
    collection: 'conversations'
  }
);

// Indexes for efficient queries
ConversationSchema.index({ userId: 1, createdAt: -1 });
ConversationSchema.index({ tenantId: 1, createdAt: -1 });
ConversationSchema.index({ sessionId: 1, createdAt: -1 });
ConversationSchema.index({ status: 1, lastMessageAt: -1 });

// Methods
ConversationSchema.methods.addMessage = function (message: AIMessage) {
  this.messages.push(message);
  this.lastMessageAt = new Date();
  return this.save();
};

ConversationSchema.methods.getRecentMessages = function (limit: number = 10) {
  return this.messages.slice(-limit);
};

ConversationSchema.methods.updateUsage = function (tokens: number, cost: number) {
  this.totalTokens += tokens;
  this.totalCost += cost;
  return this.save();
};

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);

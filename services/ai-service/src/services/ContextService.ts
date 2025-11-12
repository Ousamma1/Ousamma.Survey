/**
 * Context Service
 * Manages conversation contexts and related data
 */

import { v4 as uuidv4 } from 'uuid';
import { Conversation, IConversation, Context, IContext } from '../models';
import { ConversationContext, AIMessage } from '../types';

export class ContextService {
  /**
   * Create a new conversation
   */
  async createConversation(data: {
    userId?: string;
    tenantId?: string;
    sessionId?: string;
    title?: string;
    metadata?: Record<string, any>;
  }): Promise<IConversation> {
    const conversation = new Conversation({
      conversationId: uuidv4(),
      ...data
    });

    return await conversation.save();
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<IConversation | null> {
    return await Conversation.findOne({ conversationId, status: 'active' });
  }

  /**
   * Get conversations by user
   */
  async getUserConversations(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<IConversation[]> {
    return await Conversation.find({ userId, status: 'active' })
      .sort({ lastMessageAt: -1 })
      .skip(offset)
      .limit(limit);
  }

  /**
   * Get conversations by tenant
   */
  async getTenantConversations(
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<IConversation[]> {
    return await Conversation.find({ tenantId, status: 'active' })
      .sort({ lastMessageAt: -1 })
      .skip(offset)
      .limit(limit);
  }

  /**
   * Add message to conversation
   */
  async addMessage(conversationId: string, message: AIMessage): Promise<IConversation> {
    const conversation = await this.getConversation(conversationId);

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    return await conversation.addMessage(message);
  }

  /**
   * Get conversation messages
   */
  async getMessages(conversationId: string, limit?: number): Promise<AIMessage[]> {
    const conversation = await this.getConversation(conversationId);

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    return limit ? conversation.getRecentMessages(limit) : conversation.messages;
  }

  /**
   * Update conversation usage
   */
  async updateUsage(conversationId: string, tokens: number, cost: number): Promise<void> {
    const conversation = await this.getConversation(conversationId);

    if (conversation) {
      await conversation.updateUsage(tokens, cost);
    }
  }

  /**
   * Archive conversation
   */
  async archiveConversation(conversationId: string): Promise<void> {
    await Conversation.updateOne({ conversationId }, { status: 'archived' });
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await Conversation.updateOne({ conversationId }, { status: 'deleted' });
  }

  /**
   * Create context
   */
  async createContext(data: {
    conversationId?: string;
    userId?: string;
    tenantId?: string;
    sessionId?: string;
    contextType: 'survey' | 'response' | 'file' | 'custom';
    data: Record<string, any>;
    expiresAt?: Date;
  }): Promise<IContext> {
    const context = new Context({
      contextId: uuidv4(),
      ...data
    });

    return await context.save();
  }

  /**
   * Get context by ID
   */
  async getContext(contextId: string): Promise<IContext | null> {
    const context = await Context.findOne({ contextId });

    if (context && context.isExpired()) {
      return null;
    }

    return context;
  }

  /**
   * Get contexts by conversation
   */
  async getConversationContexts(conversationId: string): Promise<IContext[]> {
    return await Context.find({ conversationId }).sort({ createdAt: -1 });
  }

  /**
   * Get contexts by type
   */
  async getContextsByType(
    contextType: string,
    filters: {
      userId?: string;
      tenantId?: string;
      sessionId?: string;
    } = {}
  ): Promise<IContext[]> {
    const query: any = { contextType, ...filters };
    return await Context.find(query).sort({ createdAt: -1 });
  }

  /**
   * Update context data
   */
  async updateContext(contextId: string, data: Record<string, any>): Promise<IContext> {
    const context = await this.getContext(contextId);

    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }

    return await context.updateData(data);
  }

  /**
   * Delete context
   */
  async deleteContext(contextId: string): Promise<void> {
    await Context.deleteOne({ contextId });
  }

  /**
   * Build conversation context for AI request
   */
  async buildConversationContext(conversationId: string): Promise<ConversationContext> {
    const conversation = await this.getConversation(conversationId);

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const contexts = await this.getConversationContexts(conversationId);

    const context: ConversationContext = {
      conversationId: conversation.conversationId,
      userId: conversation.userId,
      tenantId: conversation.tenantId,
      sessionId: conversation.sessionId,
      metadata: conversation.metadata,
      history: conversation.messages
    };

    // Add specific contexts
    for (const ctx of contexts) {
      if (ctx.contextType === 'survey') {
        context.surveyContext = ctx.data;
      } else if (ctx.contextType === 'response') {
        context.responseContext = ctx.data;
      } else if (ctx.contextType === 'file') {
        context.fileContext = ctx.data;
      }
    }

    return context;
  }

  /**
   * Clean up expired contexts
   */
  async cleanupExpiredContexts(): Promise<number> {
    const result = await Context.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    return result.deletedCount || 0;
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(conversationId: string): Promise<{
    messageCount: number;
    totalTokens: number;
    totalCost: number;
    duration: number; // milliseconds
  }> {
    const conversation = await this.getConversation(conversationId);

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const duration = conversation.lastMessageAt.getTime() - conversation.createdAt.getTime();

    return {
      messageCount: conversation.messages.length,
      totalTokens: conversation.totalTokens,
      totalCost: conversation.totalCost,
      duration
    };
  }
}

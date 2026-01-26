import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import {
  ChannelType,
  ConversationStatus,
  ConversationPriority,
  MessageDirection,
  MessageStatus,
  MessageContentType,
} from '@prisma/client';

export interface CreateConversationDto {
  customerId: string;
  customerName?: string;
  customerPhone: string;
  channel: ChannelType;
  subject?: string;
  initialMessage?: string;
}

export interface SendMessageDto {
  content: string;
  contentType?: MessageContentType;
  mediaUrl?: string;
  mediaType?: string;
}

export interface ConversationFilters {
  status?: ConversationStatus | ConversationStatus[];
  channel?: ChannelType;
  assignedTo?: string;
  unreadOnly?: boolean;
  customerId?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createConversation(tenantId: string, dto: CreateConversationDto) {
    // Check if open conversation already exists
    const existing = await this.prisma.conversationThread.findFirst({
      where: {
        tenantId,
        customerId: dto.customerId,
        channel: dto.channel,
        status: { in: ['OPEN', 'PENDING'] },
      },
    });

    if (existing) {
      return existing;
    }

    const conversation = await this.prisma.conversationThread.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        channel: dto.channel,
        subject: dto.subject,
        status: 'OPEN',
      },
    });

    // Add initial message if provided
    if (dto.initialMessage) {
      await this.addMessage(tenantId, conversation.id, {
        content: dto.initialMessage,
        direction: 'INBOUND',
      });
    }

    this.logger.log(`Created conversation ${conversation.id} for customer ${dto.customerId}`);
    return conversation;
  }

  async listConversations(tenantId: string, filters?: ConversationFilters) {
    const where: Record<string, unknown> = { tenantId };

    if (filters?.status) {
      where.status = Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status;
    }
    if (filters?.channel) {
      where.channel = filters.channel;
    }
    if (filters?.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.unreadOnly) {
      where.unreadCount = { gt: 0 };
    }

    return this.prisma.conversationThread.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { unreadCount: 'desc' },
        { lastMessageAt: 'desc' },
      ],
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  }

  async getConversation(tenantId: string, id: string) {
    const conversation = await this.prisma.conversationThread.findFirst({
      where: { id, tenantId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    return conversation;
  }

  async addMessage(
    tenantId: string,
    threadId: string,
    data: {
      content: string;
      direction: MessageDirection;
      contentType?: MessageContentType;
      mediaUrl?: string;
      mediaType?: string;
      senderName?: string;
      senderPhone?: string;
      externalId?: string;
    }
  ) {
    const message = await this.prisma.message.create({
      data: {
        threadId,
        tenantId,
        content: data.content,
        direction: data.direction,
        contentType: data.contentType || 'TEXT',
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        senderName: data.senderName,
        senderPhone: data.senderPhone,
        externalId: data.externalId,
        status: data.direction === 'INBOUND' ? 'DELIVERED' : 'PENDING',
      },
    });

    // Update thread
    const updateData: Record<string, unknown> = {
      lastMessageAt: new Date(),
      lastMessagePreview: data.content.substring(0, 100),
    };

    if (data.direction === 'INBOUND') {
      updateData.unreadCount = { increment: 1 };
      updateData.status = 'PENDING';
    }

    await this.prisma.conversationThread.update({
      where: { id: threadId },
      data: updateData,
    });

    return message;
  }

  async sendMessage(tenantId: string, threadId: string, dto: SendMessageDto) {
    const thread = await this.getConversation(tenantId, threadId);

    const message = await this.addMessage(tenantId, threadId, {
      content: dto.content,
      direction: 'OUTBOUND',
      contentType: dto.contentType || 'TEXT',
      mediaUrl: dto.mediaUrl,
      mediaType: dto.mediaType,
    });

    // Here you would integrate with actual messaging provider
    // For now, we'll mark as sent
    await this.updateMessageStatus(message.id, 'SENT');

    return message;
  }

  async updateMessageStatus(messageId: string, status: MessageStatus) {
    const now = new Date();
    const data: Record<string, unknown> = { status };

    switch (status) {
      case 'SENT':
        data.sentAt = now;
        break;
      case 'DELIVERED':
        data.deliveredAt = now;
        break;
      case 'READ':
        data.readAt = now;
        break;
      case 'FAILED':
        data.failedAt = now;
        break;
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data,
    });
  }

  async markAsRead(tenantId: string, threadId: string) {
    // Mark all unread messages as read
    await this.prisma.message.updateMany({
      where: {
        threadId,
        tenantId,
        direction: 'INBOUND',
        readAt: null,
      },
      data: {
        readAt: new Date(),
        status: 'READ',
      },
    });

    // Reset unread count
    await this.prisma.conversationThread.update({
      where: { id: threadId },
      data: { unreadCount: 0 },
    });
  }

  async assignConversation(tenantId: string, threadId: string, userId: string | null) {
    await this.getConversation(tenantId, threadId);

    return this.prisma.conversationThread.update({
      where: { id: threadId },
      data: { assignedTo: userId },
    });
  }

  async updateStatus(
    tenantId: string,
    threadId: string,
    status: ConversationStatus,
    closedBy?: string
  ) {
    await this.getConversation(tenantId, threadId);

    const data: Record<string, unknown> = { status };
    if (status === 'RESOLVED' || status === 'CLOSED') {
      data.closedAt = new Date();
      data.closedBy = closedBy;
    }

    return this.prisma.conversationThread.update({
      where: { id: threadId },
      data,
    });
  }

  async updatePriority(
    tenantId: string,
    threadId: string,
    priority: ConversationPriority
  ) {
    await this.getConversation(tenantId, threadId);

    return this.prisma.conversationThread.update({
      where: { id: threadId },
      data: { priority },
    });
  }

  async addTags(tenantId: string, threadId: string, tags: string[]) {
    const thread = await this.getConversation(tenantId, threadId);

    const existingTags = thread.tags || [];
    const newTags = [...new Set([...existingTags, ...tags])];

    return this.prisma.conversationThread.update({
      where: { id: threadId },
      data: { tags: newTags },
    });
  }

  async removeTags(tenantId: string, threadId: string, tags: string[]) {
    const thread = await this.getConversation(tenantId, threadId);

    const newTags = (thread.tags || []).filter(t => !tags.includes(t));

    return this.prisma.conversationThread.update({
      where: { id: threadId },
      data: { tags: newTags },
    });
  }

  async getInboxStats(tenantId: string) {
    const [open, pending, unread, byChannel] = await Promise.all([
      this.prisma.conversationThread.count({
        where: { tenantId, status: 'OPEN' },
      }),
      this.prisma.conversationThread.count({
        where: { tenantId, status: 'PENDING' },
      }),
      this.prisma.conversationThread.count({
        where: { tenantId, unreadCount: { gt: 0 } },
      }),
      this.prisma.conversationThread.groupBy({
        by: ['channel'],
        where: { tenantId, status: { in: ['OPEN', 'PENDING'] } },
        _count: { channel: true },
      }),
    ]);

    return {
      open,
      pending,
      unread,
      total: open + pending,
      byChannel: byChannel.reduce((acc, c) => {
        acc[c.channel] = c._count.channel;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  async searchConversations(tenantId: string, query: string, limit = 20) {
    return this.prisma.conversationThread.findMany({
      where: {
        tenantId,
        OR: [
          { customerName: { contains: query, mode: 'insensitive' } },
          { customerPhone: { contains: query } },
          { subject: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      take: limit,
    });
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { ConversationService } from './conversation.service';
import { WhatsAppTemplateCategory, WhatsAppTemplateStatus, Prisma } from '@prisma/client';

export interface CreateTemplateDto {
  name: string;
  language?: string;
  category: WhatsAppTemplateCategory;
  headerType?: string;
  headerContent?: string;
  bodyText: string;
  footerText?: string;
  buttons?: Prisma.InputJsonValue;
  exampleValues?: Prisma.InputJsonValue;
}

export interface SendTemplateMessageDto {
  customerId: string;
  customerPhone: string;
  templateName: string;
  language?: string;
  variables?: Record<string, string>;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationService: ConversationService,
  ) {}

  // ==================== Template Management ====================

  async createTemplate(tenantId: string, dto: CreateTemplateDto) {
    // Validate template name (alphanumeric + underscore only)
    if (!/^[a-z0-9_]+$/.test(dto.name)) {
      throw new Error('Template name must contain only lowercase letters, numbers, and underscores');
    }

    const template = await this.prisma.whatsAppTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        language: dto.language || 'en',
        category: dto.category,
        headerType: dto.headerType,
        headerContent: dto.headerContent,
        bodyText: dto.bodyText,
        footerText: dto.footerText,
        buttons: dto.buttons,
        exampleValues: dto.exampleValues,
        status: 'DRAFT',
      },
    });

    this.logger.log(`Created WhatsApp template ${template.id}: ${template.name}`);
    return template;
  }

  async listTemplates(tenantId: string, options?: {
    category?: WhatsAppTemplateCategory;
    status?: WhatsAppTemplateStatus;
  }) {
    const where: Record<string, unknown> = { tenantId };

    if (options?.category) {
      where.category = options.category;
    }
    if (options?.status) {
      where.status = options.status;
    }

    return this.prisma.whatsAppTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async getTemplate(tenantId: string, id: string) {
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return template;
  }

  async updateTemplate(tenantId: string, id: string, dto: Partial<CreateTemplateDto>) {
    await this.getTemplate(tenantId, id);

    // If template is approved, create a new version instead
    const template = await this.prisma.whatsAppTemplate.findUnique({ where: { id } });
    if (template?.status === 'APPROVED') {
      throw new Error('Cannot modify approved template. Create a new version instead.');
    }

    return this.prisma.whatsAppTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTemplate(tenantId: string, id: string) {
    await this.getTemplate(tenantId, id);

    await this.prisma.whatsAppTemplate.delete({ where: { id } });
    this.logger.log(`Deleted WhatsApp template ${id}`);
  }

  async submitTemplate(tenantId: string, id: string) {
    const template = await this.getTemplate(tenantId, id);

    if (template.status !== 'DRAFT') {
      throw new Error('Only draft templates can be submitted');
    }

    // In production, this would call the WhatsApp Business API
    // For now, we'll mark as pending
    return this.prisma.whatsAppTemplate.update({
      where: { id },
      data: {
        status: 'PENDING',
        submittedAt: new Date(),
      },
    });
  }

  // ==================== Sending Messages ====================

  async sendTemplateMessage(tenantId: string, dto: SendTemplateMessageDto) {
    // Get the template
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: {
        tenantId,
        name: dto.templateName,
        language: dto.language || 'en',
        status: 'APPROVED',
      },
    });

    if (!template) {
      throw new NotFoundException(`Approved template '${dto.templateName}' not found`);
    }

    // Render the template with variables
    const renderedContent = this.renderTemplate(template.bodyText, dto.variables || {});

    // Get or create conversation
    const conversation = await this.conversationService.createConversation(tenantId, {
      customerId: dto.customerId,
      customerPhone: dto.customerPhone,
      channel: 'WHATSAPP',
    });

    // Add message to conversation
    const message = await this.conversationService.addMessage(tenantId, conversation.id, {
      content: renderedContent,
      direction: 'OUTBOUND',
      contentType: 'TEMPLATE',
    });

    // In production, this would call the WhatsApp Business API
    // await this.sendViaWhatsAppApi(dto.customerPhone, template, dto.variables);

    // Update template usage count
    await this.prisma.whatsAppTemplate.update({
      where: { id: template.id },
      data: { usageCount: { increment: 1 } },
    });

    this.logger.log(`Sent WhatsApp template message to ${dto.customerPhone}`);

    return {
      messageId: message.id,
      conversationId: conversation.id,
      templateUsed: template.name,
      renderedContent,
    };
  }

  async sendMessage(
    tenantId: string,
    customerPhone: string,
    content: string,
    customerId?: string
  ) {
    // For non-template messages, customer must have messaged us first (24h window)
    // This is enforced by WhatsApp Business API

    // Find existing conversation
    let conversation = await this.prisma.conversationThread.findFirst({
      where: {
        tenantId,
        customerPhone,
        channel: 'WHATSAPP',
        status: { in: ['OPEN', 'PENDING'] },
      },
    });

    if (!conversation) {
      if (!customerId) {
        throw new Error('Cannot send message to new customer without template');
      }

      conversation = await this.conversationService.createConversation(tenantId, {
        customerId,
        customerPhone,
        channel: 'WHATSAPP',
      });
    }

    return this.conversationService.sendMessage(tenantId, conversation.id, {
      content,
    });
  }

  // ==================== Webhook Handling ====================

  async handleIncomingMessage(payload: {
    tenantId: string;
    from: string;
    messageId: string;
    content: string;
    contentType: string;
    mediaUrl?: string;
    timestamp: Date;
    customerName?: string;
  }) {
    // Find or create customer
    let customer = await this.prisma.customer.findFirst({
      where: {
        tenantId: payload.tenantId,
        phone: payload.from,
      },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          tenantId: payload.tenantId,
          name: payload.customerName || 'WhatsApp User',
          phone: payload.from,
        },
      });
    }

    // Find or create conversation
    let conversation = await this.prisma.conversationThread.findFirst({
      where: {
        tenantId: payload.tenantId,
        customerPhone: payload.from,
        channel: 'WHATSAPP',
        status: { in: ['OPEN', 'PENDING'] },
      },
    });

    if (!conversation) {
      conversation = await this.conversationService.createConversation(payload.tenantId, {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: payload.from,
        channel: 'WHATSAPP',
      });
    }

    // Add the message
    const contentType = this.mapContentType(payload.contentType);
    await this.conversationService.addMessage(payload.tenantId, conversation.id, {
      content: payload.content,
      direction: 'INBOUND',
      contentType,
      mediaUrl: payload.mediaUrl,
      externalId: payload.messageId,
      senderPhone: payload.from,
      senderName: payload.customerName,
    });

    return conversation;
  }

  async handleMessageStatus(payload: {
    messageId: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: Date;
    error?: string;
  }) {
    const message = await this.prisma.message.findFirst({
      where: { externalId: payload.messageId },
    });

    if (!message) {
      this.logger.warn(`Message not found for status update: ${payload.messageId}`);
      return;
    }

    const statusMap: Record<string, 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
    };

    const updateData: Record<string, unknown> = { status: statusMap[payload.status] };

    if (payload.status === 'failed' && payload.error) {
      updateData.failureReason = payload.error;
      updateData.failedAt = payload.timestamp;
    }

    await this.conversationService.updateMessageStatus(message.id, statusMap[payload.status]);
  }

  // ==================== Helpers ====================

  private renderTemplate(bodyText: string, variables: Record<string, string>): string {
    let rendered = bodyText;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return rendered;
  }

  private mapContentType(whatsappType: string): 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'LOCATION' | 'CONTACT' {
    const typeMap: Record<string, 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'LOCATION' | 'CONTACT'> = {
      text: 'TEXT',
      image: 'IMAGE',
      video: 'VIDEO',
      audio: 'AUDIO',
      document: 'DOCUMENT',
      location: 'LOCATION',
      contacts: 'CONTACT',
    };
    return typeMap[whatsappType] || 'TEXT';
  }
}

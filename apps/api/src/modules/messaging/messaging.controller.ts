import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { ConversationService, ConversationFilters, SendMessageDto, CreateConversationDto } from './conversation.service';
import { WhatsAppService, CreateTemplateDto, SendTemplateMessageDto } from './whatsapp.service';
import { QuickReplyService, CreateQuickReplyDto } from './quick-reply.service';
import { ChannelType, ConversationStatus, ConversationPriority, WhatsAppTemplateCategory, WhatsAppTemplateStatus } from '@prisma/client';

interface AuthenticatedRequest {
  auth: { tenantId: string; userId: string };
}

@Controller('messaging')
@UseGuards(ClerkAuthGuard)
export class MessagingController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly whatsAppService: WhatsAppService,
    private readonly quickReplyService: QuickReplyService,
  ) {}

  // ==================== Conversations ====================

  @Get('conversations')
  async listConversations(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('channel') channel?: ChannelType,
    @Query('assignedTo') assignedTo?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('customerId') customerId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: ConversationFilters = {
      channel,
      assignedTo,
      customerId,
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    if (status) {
      filters.status = status.includes(',')
        ? status.split(',') as ConversationStatus[]
        : status as ConversationStatus;
    }

    return this.conversationService.listConversations(req.auth.tenantId, filters);
  }

  @Get('conversations/stats')
  async getInboxStats(@Req() req: AuthenticatedRequest) {
    return this.conversationService.getInboxStats(req.auth.tenantId);
  }

  @Get('conversations/search')
  async searchConversations(
    @Req() req: AuthenticatedRequest,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversationService.searchConversations(
      req.auth.tenantId,
      query,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Post('conversations')
  async createConversation(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationService.createConversation(req.auth.tenantId, dto);
  }

  @Get('conversations/:id')
  async getConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.conversationService.getConversation(req.auth.tenantId, id);
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') threadId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversationService.sendMessage(req.auth.tenantId, threadId, dto);
  }

  @Post('conversations/:id/read')
  async markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('id') threadId: string,
  ) {
    await this.conversationService.markAsRead(req.auth.tenantId, threadId);
    return { success: true };
  }

  @Post('conversations/:id/assign')
  async assignConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') threadId: string,
    @Body() body: { userId: string | null },
  ) {
    return this.conversationService.assignConversation(
      req.auth.tenantId,
      threadId,
      body.userId,
    );
  }

  @Put('conversations/:id/status')
  async updateConversationStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') threadId: string,
    @Body() body: { status: ConversationStatus },
  ) {
    return this.conversationService.updateStatus(
      req.auth.tenantId,
      threadId,
      body.status,
      req.auth.userId,
    );
  }

  @Put('conversations/:id/priority')
  async updateConversationPriority(
    @Req() req: AuthenticatedRequest,
    @Param('id') threadId: string,
    @Body() body: { priority: ConversationPriority },
  ) {
    return this.conversationService.updatePriority(
      req.auth.tenantId,
      threadId,
      body.priority,
    );
  }

  @Post('conversations/:id/tags')
  async addTags(
    @Req() req: AuthenticatedRequest,
    @Param('id') threadId: string,
    @Body() body: { tags: string[] },
  ) {
    return this.conversationService.addTags(req.auth.tenantId, threadId, body.tags);
  }

  @Delete('conversations/:id/tags')
  async removeTags(
    @Req() req: AuthenticatedRequest,
    @Param('id') threadId: string,
    @Body() body: { tags: string[] },
  ) {
    return this.conversationService.removeTags(req.auth.tenantId, threadId, body.tags);
  }

  // ==================== WhatsApp Templates ====================

  @Post('whatsapp/templates')
  async createTemplate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.whatsAppService.createTemplate(req.auth.tenantId, dto);
  }

  @Get('whatsapp/templates')
  async listTemplates(
    @Req() req: AuthenticatedRequest,
    @Query('category') category?: WhatsAppTemplateCategory,
    @Query('status') status?: WhatsAppTemplateStatus,
  ) {
    return this.whatsAppService.listTemplates(req.auth.tenantId, {
      category,
      status,
    });
  }

  @Get('whatsapp/templates/:id')
  async getTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.whatsAppService.getTemplate(req.auth.tenantId, id);
  }

  @Put('whatsapp/templates/:id')
  async updateTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: Partial<CreateTemplateDto>,
  ) {
    return this.whatsAppService.updateTemplate(req.auth.tenantId, id, dto);
  }

  @Delete('whatsapp/templates/:id')
  async deleteTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.whatsAppService.deleteTemplate(req.auth.tenantId, id);
    return { success: true };
  }

  @Post('whatsapp/templates/:id/submit')
  async submitTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.whatsAppService.submitTemplate(req.auth.tenantId, id);
  }

  @Post('whatsapp/send-template')
  async sendTemplateMessage(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SendTemplateMessageDto,
  ) {
    return this.whatsAppService.sendTemplateMessage(req.auth.tenantId, dto);
  }

  @Post('whatsapp/send')
  async sendWhatsAppMessage(
    @Req() req: AuthenticatedRequest,
    @Body() body: { customerPhone: string; content: string; customerId?: string },
  ) {
    return this.whatsAppService.sendMessage(
      req.auth.tenantId,
      body.customerPhone,
      body.content,
      body.customerId,
    );
  }

  // ==================== Quick Replies ====================

  @Post('quick-replies')
  async createQuickReply(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateQuickReplyDto,
  ) {
    return this.quickReplyService.create(req.auth.tenantId, req.auth.userId, dto);
  }

  @Get('quick-replies')
  async listQuickReplies(
    @Req() req: AuthenticatedRequest,
    @Query('category') category?: string,
    @Query('channel') channel?: ChannelType,
  ) {
    return this.quickReplyService.list(req.auth.tenantId, {
      category,
      channel,
    });
  }

  @Get('quick-replies/categories')
  async getQuickReplyCategories(@Req() req: AuthenticatedRequest) {
    return this.quickReplyService.getCategories(req.auth.tenantId);
  }

  @Get('quick-replies/search')
  async searchQuickReplies(
    @Req() req: AuthenticatedRequest,
    @Query('q') query: string,
  ) {
    return this.quickReplyService.search(req.auth.tenantId, query);
  }

  @Get('quick-replies/shortcut/:shortcut')
  async getQuickReplyByShortcut(
    @Req() req: AuthenticatedRequest,
    @Param('shortcut') shortcut: string,
  ) {
    return this.quickReplyService.getByShortcut(req.auth.tenantId, shortcut);
  }

  @Get('quick-replies/:id')
  async getQuickReply(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.quickReplyService.getById(req.auth.tenantId, id);
  }

  @Put('quick-replies/:id')
  async updateQuickReply(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: Partial<CreateQuickReplyDto>,
  ) {
    return this.quickReplyService.update(req.auth.tenantId, id, dto);
  }

  @Delete('quick-replies/:id')
  async deleteQuickReply(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.quickReplyService.delete(req.auth.tenantId, id);
    return { success: true };
  }

  @Post('quick-replies/:id/toggle')
  async toggleQuickReply(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.quickReplyService.toggleActive(req.auth.tenantId, id, body.isActive);
  }

  @Post('quick-replies/:id/use')
  async recordQuickReplyUsage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.quickReplyService.recordUsage(req.auth.tenantId, id);
    return { success: true };
  }
}

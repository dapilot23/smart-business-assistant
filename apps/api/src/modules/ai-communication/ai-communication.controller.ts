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
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MessageClassificationService } from './message-classification.service';
import { ResponseGenerationService } from './response-generation.service';
import { ConversationSummaryService } from './conversation-summary.service';
import { SuggestedResponseService } from './suggested-response.service';
import {
  ClassifyMessageDto,
  GenerateResponsesDto,
  GenerateStoredSuggestionsDto,
  AcceptSuggestionDto,
  CreateAutoResponderRuleDto,
  UpdateAutoResponderRuleDto,
  SummarizeHandoffDto,
} from './dto/ai-communication.dto';

@Controller('ai-communication')
@UseGuards(JwtAuthGuard)
export class AiCommunicationController {
  constructor(
    private readonly classification: MessageClassificationService,
    private readonly responseGeneration: ResponseGenerationService,
    private readonly conversationSummary: ConversationSummaryService,
    private readonly suggestedResponses: SuggestedResponseService,
  ) {}

  // ============================================
  // Message Classification
  // ============================================

  @Post('classify/:messageId')
  async classifyMessage(
    @Request() req,
    @Param('messageId') messageId: string,
    @Query('conversationId') conversationId: string,
    @Body() body: ClassifyMessageDto,
  ) {
    const tenantId = req.user?.tenantId;
    return this.classification.classifyMessage(
      messageId,
      body.content,
      tenantId,
      conversationId,
      body.customerContext,
    );
  }

  @Get('classification/:messageId')
  async getClassification(@Param('messageId') messageId: string) {
    return this.classification.getClassification(messageId);
  }

  @Get('classifications/:conversationId')
  async getConversationClassifications(
    @Param('conversationId') conversationId: string,
  ) {
    return this.classification.getConversationClassifications(conversationId);
  }

  // ============================================
  // Response Generation
  // ============================================

  @Post('suggest-responses/:conversationId')
  async suggestResponses(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() body?: GenerateResponsesDto,
  ) {
    const tenantId = req.user?.tenantId;
    return this.responseGeneration.generateResponseSuggestions(
      conversationId,
      tenantId,
      body?.count,
    );
  }

  @Get('suggestions/:conversationId')
  async listSuggestions(
    @Request() req,
    @Param('conversationId') conversationId: string,
  ) {
    const tenantId = req.user?.tenantId;
    return this.suggestedResponses.listSuggestions(tenantId, conversationId);
  }

  @Post('suggestions/:conversationId/generate')
  async generateStoredSuggestions(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() body?: GenerateStoredSuggestionsDto,
  ) {
    const tenantId = req.user?.tenantId;
    const suggestions = await this.responseGeneration.generateResponseSuggestions(
      conversationId,
      tenantId,
      body?.count,
    );

    return this.suggestedResponses.replaceSuggestions(
      tenantId,
      conversationId,
      body?.messageId ?? null,
      suggestions,
    );
  }

  @Post('suggestions/:id/accept')
  async acceptSuggestion(
    @Request() req,
    @Param('id') id: string,
    @Body() body?: AcceptSuggestionDto,
  ) {
    const tenantId = req.user?.tenantId;
    return this.suggestedResponses.acceptSuggestion(
      tenantId,
      id,
      body?.editedText,
    );
  }

  @Post('suggestions/:id/dismiss')
  async dismissSuggestion(@Request() req, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    return this.suggestedResponses.dismissSuggestion(tenantId, id);
  }

  @Post('auto-respond/:messageId')
  async triggerAutoResponder(
    @Request() req,
    @Param('messageId') messageId: string,
    @Query('conversationId') conversationId: string,
    @Body() body: ClassifyMessageDto,
  ) {
    const tenantId = req.user?.tenantId;

    // First classify the message
    const classification = await this.classification.classifyMessage(
      messageId,
      body.content,
      tenantId,
      conversationId,
      body.customerContext,
    );

    // Then find matching auto-responder
    const autoResponse = await this.responseGeneration.findMatchingAutoResponder(
      classification,
      tenantId,
    );

    return {
      classification,
      autoResponse,
    };
  }

  // ============================================
  // Conversation Summary
  // ============================================

  @Post('summarize/:conversationId')
  async summarizeConversation(
    @Request() req,
    @Param('conversationId') conversationId: string,
  ) {
    const tenantId = req.user?.tenantId;
    return this.conversationSummary.summarizeConversation(conversationId, tenantId);
  }

  @Post('summarize-handoff/:conversationId')
  async summarizeForHandoff(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() body?: SummarizeHandoffDto,
  ) {
    const tenantId = req.user?.tenantId;
    return this.conversationSummary.summarizeForHandoff(
      conversationId,
      tenantId,
      body?.nextAgentContext,
    );
  }

  // ============================================
  // Auto-Responder Rules Management
  // ============================================

  @Get('auto-responder-rules')
  async getAutoResponderRules(@Request() req) {
    const tenantId = req.user?.tenantId;
    return this.responseGeneration.getAutoResponderRules(tenantId);
  }

  @Post('auto-responder-rules')
  async createAutoResponderRule(
    @Request() req,
    @Body() body: CreateAutoResponderRuleDto,
  ) {
    const tenantId = req.user?.tenantId;
    return this.responseGeneration.createAutoResponderRule(body, tenantId);
  }

  @Put('auto-responder-rules/:id')
  async updateAutoResponderRule(
    @Request() req,
    @Param('id') id: string,
    @Body() body: UpdateAutoResponderRuleDto,
  ) {
    const tenantId = req.user?.tenantId;
    return this.responseGeneration.updateAutoResponderRule(id, body, tenantId);
  }

  @Delete('auto-responder-rules/:id')
  async deleteAutoResponderRule(@Request() req, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    await this.responseGeneration.deleteAutoResponderRule(id, tenantId);
    return { success: true };
  }
}

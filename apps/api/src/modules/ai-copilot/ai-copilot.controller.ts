import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiCopilotService } from './ai-copilot.service';
import { WeeklyReportService } from './weekly-report.service';
import { ChatMessageDto } from './dto/ai-copilot.dto';

@Controller('ai-copilot')
@UseGuards(JwtAuthGuard)
export class AiCopilotController {
  constructor(
    private readonly copilotService: AiCopilotService,
    private readonly reportService: WeeklyReportService,
  ) {}

  // ============================================
  // Chat Interface
  // ============================================

  @Post('chat')
  async chat(@Request() req, @Body() body: ChatMessageDto) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    return this.copilotService.chat(
      tenantId,
      userId,
      body.message,
      body.conversationId,
    );
  }

  /**
   * Stream chat responses using Server-Sent Events (SSE).
   * Returns real-time chunks as the AI generates the response.
   */
  @Post('chat/stream')
  async chatStream(
    @Request() req,
    @Body() body: ChatMessageDto,
    @Res() res: Response,
  ) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    try {
      const stream = this.copilotService.chatStream(
        tenantId,
        userId,
        body.message,
        body.conversationId,
      );

      for await (const event of stream) {
        const data = JSON.stringify(event);
        res.write(`data: ${data}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      const errorEvent = JSON.stringify({
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
      res.write(`data: ${errorEvent}\n\n`);
      res.end();
    }
  }

  // ============================================
  // Conversation Management
  // ============================================

  @Get('conversations')
  async listConversations(
    @Request() req,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    return this.copilotService.listConversations(
      tenantId,
      userId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('conversations/:id')
  async getConversation(@Request() req, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    return this.copilotService.getConversation(id, tenantId);
  }

  @Delete('conversations/:id')
  async deleteConversation(@Request() req, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    await this.copilotService.deleteConversation(id, tenantId);
    return { success: true };
  }

  // ============================================
  // Weekly Reports
  // ============================================

  @Get('reports')
  async listReports(@Request() req, @Query('limit') limit?: string) {
    const tenantId = req.user?.tenantId;
    return this.reportService.listReports(
      tenantId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('reports/latest')
  async getLatestReport(@Request() req) {
    const tenantId = req.user?.tenantId;
    return this.reportService.getLatestReport(tenantId);
  }

  @Post('reports/generate')
  async generateReport(@Request() req) {
    const tenantId = req.user?.tenantId;
    return this.reportService.generateReportForTenant(tenantId);
  }
}

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
} from '@nestjs/common';
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

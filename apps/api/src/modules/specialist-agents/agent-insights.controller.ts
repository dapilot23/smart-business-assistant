import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AgentInsightsService } from './agent-insights.service';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import {
  ListInsightsDto,
  UpdateInsightStatusDto,
  TriggerAgentDto,
  UpdateAgentSettingsDto,
} from './dto/insights.dto';
import { AgentType } from '@prisma/client';

@Controller('insights')
@UseGuards(JwtAuthGuard)
export class AgentInsightsController {
  constructor(
    private readonly insightsService: AgentInsightsService,
    private readonly orchestratorService: AgentOrchestratorService,
  ) {}

  @Get()
  async listInsights(@Request() req, @Query() query: ListInsightsDto) {
    const tenantId = req.user?.tenantId;
    return this.insightsService.listInsights(tenantId, {
      agentType: query.agentType,
      priority: query.priority,
      status: query.status,
      entityType: query.entityType,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get('summary')
  async getSummary(@Request() req) {
    const tenantId = req.user?.tenantId;
    return this.insightsService.getSummary(tenantId);
  }

  @Get(':id')
  async getInsight(@Request() req, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    return this.insightsService.getInsight(tenantId, id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() body: UpdateInsightStatusDto,
  ) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    return this.insightsService.updateInsightStatus(
      tenantId,
      id,
      body.status,
      userId,
      body.rejectionReason,
    );
  }

  @Delete(':id')
  async deleteInsight(@Request() req, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    await this.insightsService.deleteInsight(tenantId, id);
    return { success: true };
  }
}

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(
    private readonly orchestratorService: AgentOrchestratorService,
  ) {}

  @Get('settings')
  async getSettings(@Request() req) {
    const tenantId = req.user?.tenantId;
    return this.orchestratorService.getSettings(tenantId);
  }

  @Patch('settings')
  async updateSettings(@Request() req, @Body() body: UpdateAgentSettingsDto) {
    const tenantId = req.user?.tenantId;
    return this.orchestratorService.updateSettings(tenantId, body);
  }

  @Post(':type/run')
  async runAgent(
    @Request() req,
    @Param('type') type: string,
    @Body() body: TriggerAgentDto,
  ) {
    const tenantId = req.user?.tenantId;
    const agentType = type.toUpperCase() as AgentType;

    if (!Object.values(AgentType).includes(agentType)) {
      return { error: `Unknown agent type: ${type}` };
    }

    const runId = await this.orchestratorService.runAgent(
      tenantId,
      agentType,
      'manual',
      body.triggerEvent,
    );

    return { runId, status: runId === 'disabled' ? 'disabled' : 'started' };
  }

  @Post('run-all')
  async runAllAgents(@Request() req) {
    const tenantId = req.user?.tenantId;
    const results = await this.orchestratorService.runAllAgents(tenantId);
    return { results };
  }
}

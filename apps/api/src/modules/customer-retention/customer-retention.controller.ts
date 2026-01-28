import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { RetentionAnalyticsService } from './retention-analytics.service';
import { RetentionSequenceService } from './retention-sequence.service';
import { RetentionIntelligenceService } from './retention-intelligence.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateServiceIntervalDto } from './dto/create-service-interval.dto';

@Controller('customer-retention')
export class CustomerRetentionController {
  constructor(
    private readonly analyticsService: RetentionAnalyticsService,
    private readonly sequenceService: RetentionSequenceService,
    private readonly intelligenceService: RetentionIntelligenceService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    return this.analyticsService.getDashboardMetrics(req.tenantId);
  }

  @Get('dormant')
  async getDormantCustomers(@Req() req: any) {
    return this.prisma.customer.findMany({
      where: { tenantId: req.tenantId, lifecycleStage: 'DORMANT' },
      orderBy: { updatedAt: 'desc' },
    });
  }

  @Get('campaigns')
  async getActiveCampaigns(@Req() req: any) {
    return this.sequenceService.getActiveCampaigns(req.tenantId);
  }

  @Get('at-risk')
  async getAtRiskCustomers(@Req() req: any) {
    return this.prisma.customer.findMany({
      where: { tenantId: req.tenantId, lifecycleStage: 'AT_RISK' },
      orderBy: { churnRisk: 'desc' },
    });
  }

  @Post('service-intervals')
  async createServiceInterval(
    @Body() dto: CreateServiceIntervalDto,
    @Req() req: any,
  ) {
    return this.prisma.serviceInterval.upsert({
      where: {
        tenantId_serviceId: {
          tenantId: req.tenantId,
          serviceId: dto.serviceId,
        },
      },
      update: {
        intervalDays: dto.intervalDays,
        reminderDays: dto.reminderDays ?? 14,
      },
      create: {
        tenantId: req.tenantId,
        serviceId: dto.serviceId,
        intervalDays: dto.intervalDays,
        reminderDays: dto.reminderDays ?? 14,
      },
    });
  }

  @Post('winback/:customerId')
  async triggerWinback(
    @Param('customerId') customerId: string,
    @Req() req: any,
  ) {
    await this.sequenceService.createSequence(
      req.tenantId,
      customerId,
      'DORMANT_WINBACK',
    );
    return { success: true, message: 'Win-back sequence started' };
  }

  @Get('health/:customerId')
  async getHealthScore(
    @Param('customerId') customerId: string,
    @Req() req: any,
  ) {
    const score = await this.intelligenceService.computeHealthScore(
      customerId,
      req.tenantId,
    );
    return { customerId, healthScore: score };
  }

  @Get('top-customers')
  async getTopCustomers(@Query('limit') limit: string, @Req() req: any) {
    return this.analyticsService.getTopCustomers(
      req.tenantId,
      parseInt(limit, 10) || 10,
    );
  }
}

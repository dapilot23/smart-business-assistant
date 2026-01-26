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
import { DynamicPricingService, PriceCalculationInput } from './dynamic-pricing.service';
import { PricingRulesService, CreatePricingRuleDto, UpdatePricingRuleDto, CreateServicePricingDto } from './pricing-rules.service';
import { UrgencyLevel, PricingRuleType } from '@prisma/client';

interface AuthenticatedRequest {
  auth: { tenantId: string; userId: string };
}

@Controller('pricing')
@UseGuards(ClerkAuthGuard)
export class DynamicPricingController {
  constructor(
    private readonly pricingService: DynamicPricingService,
    private readonly rulesService: PricingRulesService,
  ) {}

  // ==================== Price Calculation ====================

  @Post('calculate')
  async calculatePrice(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      serviceId: string;
      customerId?: string;
      scheduledAt: string;
      urgency?: UrgencyLevel;
    },
  ) {
    const input: PriceCalculationInput = {
      tenantId: req.auth.tenantId,
      serviceId: body.serviceId,
      customerId: body.customerId,
      scheduledAt: new Date(body.scheduledAt),
      urgency: body.urgency || 'STANDARD',
    };

    return this.pricingService.calculatePrice(input);
  }

  @Get('demand-factor')
  async getDemandFactor(
    @Req() req: AuthenticatedRequest,
    @Query('date') dateStr?: string,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const demandFactor = await this.pricingService.calculateDemandFactor(
      req.auth.tenantId,
      date,
    );

    return { date: date.toISOString(), demandFactor };
  }

  // ==================== Pricing Rules ====================

  @Post('rules')
  async createRule(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePricingRuleDto,
  ) {
    return this.rulesService.createRule(req.auth.tenantId, dto);
  }

  @Get('rules')
  async listRules(
    @Req() req: AuthenticatedRequest,
    @Query('type') ruleType?: PricingRuleType,
    @Query('active') isActive?: string,
  ) {
    return this.rulesService.listRules(req.auth.tenantId, {
      ruleType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('rules/templates')
  async getRuleTemplates() {
    return this.rulesService.getAvailableRuleTemplates();
  }

  @Get('rules/stats')
  async getRuleStats(@Req() req: AuthenticatedRequest) {
    return this.rulesService.getRuleStats(req.auth.tenantId);
  }

  @Get('rules/:id')
  async getRule(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.rulesService.getRule(req.auth.tenantId, id);
  }

  @Put('rules/:id')
  async updateRule(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePricingRuleDto,
  ) {
    return this.rulesService.updateRule(req.auth.tenantId, id, dto);
  }

  @Delete('rules/:id')
  async deleteRule(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.rulesService.deleteRule(req.auth.tenantId, id);
    return { success: true };
  }

  @Post('rules/:id/toggle')
  async toggleRule(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.rulesService.toggleRule(req.auth.tenantId, id, body.isActive);
  }

  @Post('rules/from-template')
  async createFromTemplate(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      templateType: PricingRuleType;
      customizations?: Partial<CreatePricingRuleDto>;
    },
  ) {
    return this.rulesService.createFromTemplate(
      req.auth.tenantId,
      body.templateType,
      body.customizations,
    );
  }

  // ==================== Service Pricing ====================

  @Post('services')
  async createServicePricing(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateServicePricingDto,
  ) {
    return this.rulesService.createServicePricing(req.auth.tenantId, dto);
  }

  @Get('services')
  async listServicePricing(@Req() req: AuthenticatedRequest) {
    return this.rulesService.listServicePricing(req.auth.tenantId);
  }

  @Get('services/:serviceId')
  async getServicePricing(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId') serviceId: string,
  ) {
    return this.rulesService.getServicePricing(req.auth.tenantId, serviceId);
  }

  @Put('services/:serviceId')
  async updateServicePricing(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId') serviceId: string,
    @Body() dto: Partial<CreateServicePricingDto>,
  ) {
    return this.rulesService.updateServicePricing(
      req.auth.tenantId,
      serviceId,
      dto,
    );
  }
}

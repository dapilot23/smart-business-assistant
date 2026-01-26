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
import { EquipmentService, CreateEquipmentDto, UpdateEquipmentDto, AddServiceHistoryDto } from './equipment.service';
import { PredictionService } from './prediction.service';
import { AlertService, AlertFilters } from './alert.service';
import { MaintenanceAlertStatus, AlertPriority, EquipmentCondition } from '@prisma/client';

interface AuthenticatedRequest {
  auth: { tenantId: string; userId: string };
}

@Controller('predictive-maintenance')
@UseGuards(ClerkAuthGuard)
export class PredictiveMaintenanceController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly predictionService: PredictionService,
    private readonly alertService: AlertService,
  ) {}

  // ==================== Equipment Endpoints ====================

  @Post('equipment')
  async createEquipment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateEquipmentDto,
  ) {
    return this.equipmentService.create(req.auth.tenantId, dto);
  }

  @Get('equipment')
  async listEquipment(
    @Req() req: AuthenticatedRequest,
    @Query('customerId') customerId?: string,
    @Query('type') equipmentType?: string,
    @Query('condition') condition?: EquipmentCondition,
    @Query('needsService') needsService?: string,
    @Query('limit') limit?: string,
  ) {
    return this.equipmentService.findAll(req.auth.tenantId, {
      customerId,
      equipmentType,
      condition,
      needsService: needsService === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('equipment/types')
  async getEquipmentTypes(@Req() req: AuthenticatedRequest) {
    return this.equipmentService.getEquipmentTypes(req.auth.tenantId);
  }

  @Get('equipment/condition-summary')
  async getConditionSummary(@Req() req: AuthenticatedRequest) {
    return this.equipmentService.getConditionSummary(req.auth.tenantId);
  }

  @Get('equipment/customer/:customerId')
  async getCustomerEquipment(
    @Req() req: AuthenticatedRequest,
    @Param('customerId') customerId: string,
  ) {
    return this.equipmentService.findByCustomer(req.auth.tenantId, customerId);
  }

  @Get('equipment/:id')
  async getEquipment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.equipmentService.findById(req.auth.tenantId, id);
  }

  @Put('equipment/:id')
  async updateEquipment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentDto,
  ) {
    return this.equipmentService.update(req.auth.tenantId, id, dto);
  }

  @Delete('equipment/:id')
  async deactivateEquipment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.equipmentService.deactivate(req.auth.tenantId, id);
    return { success: true };
  }

  @Post('equipment/:id/service-history')
  async addServiceHistory(
    @Req() req: AuthenticatedRequest,
    @Param('id') equipmentId: string,
    @Body() dto: AddServiceHistoryDto,
  ) {
    return this.equipmentService.addServiceHistory(req.auth.tenantId, equipmentId, dto);
  }

  @Get('equipment/:id/service-history')
  async getServiceHistory(
    @Req() req: AuthenticatedRequest,
    @Param('id') equipmentId: string,
    @Query('limit') limit?: string,
  ) {
    return this.equipmentService.getServiceHistory(
      req.auth.tenantId,
      equipmentId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  // ==================== Prediction Endpoints ====================

  @Post('predictions/run')
  async runPredictions(@Req() req: AuthenticatedRequest) {
    const predictions = await this.predictionService.runPredictions(req.auth.tenantId);
    return {
      success: true,
      count: predictions.length,
      predictions,
    };
  }

  @Post('predictions/analyze/:equipmentId')
  async analyzeEquipment(
    @Req() req: AuthenticatedRequest,
    @Param('equipmentId') equipmentId: string,
  ) {
    const prediction = await this.predictionService.analyzeWithAI(
      req.auth.tenantId,
      equipmentId,
    );
    return {
      success: true,
      prediction,
    };
  }

  // ==================== Alert Endpoints ====================

  @Get('alerts')
  async listAlerts(
    @Req() req: AuthenticatedRequest,
    @Query('customerId') customerId?: string,
    @Query('equipmentId') equipmentId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('dueBefore') dueBefore?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: AlertFilters = {
      customerId,
      equipmentId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    if (status) {
      filters.status = status.includes(',')
        ? status.split(',') as MaintenanceAlertStatus[]
        : status as MaintenanceAlertStatus;
    }
    if (priority) {
      filters.priority = priority.includes(',')
        ? priority.split(',') as AlertPriority[]
        : priority as AlertPriority;
    }
    if (dueBefore) {
      filters.dueBefore = new Date(dueBefore);
    }

    return this.alertService.findAll(req.auth.tenantId, filters);
  }

  @Get('alerts/summary')
  async getAlertSummary(@Req() req: AuthenticatedRequest) {
    return this.alertService.getSummary(req.auth.tenantId);
  }

  @Get('alerts/upcoming')
  async getUpcomingAlerts(
    @Req() req: AuthenticatedRequest,
    @Query('days') days?: string,
  ) {
    return this.alertService.getUpcomingAlerts(
      req.auth.tenantId,
      days ? parseInt(days, 10) : undefined,
    );
  }

  @Get('alerts/customer/:customerId')
  async getCustomerAlerts(
    @Req() req: AuthenticatedRequest,
    @Param('customerId') customerId: string,
  ) {
    return this.alertService.getAlertsByCustomer(req.auth.tenantId, customerId);
  }

  @Get('alerts/:id')
  async getAlert(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.alertService.findById(req.auth.tenantId, id);
  }

  @Put('alerts/:id/status')
  async updateAlertStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { status: MaintenanceAlertStatus },
  ) {
    return this.alertService.updateStatus(req.auth.tenantId, id, body.status);
  }

  @Post('alerts/:id/dismiss')
  async dismissAlert(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.alertService.dismiss(req.auth.tenantId, id, body.reason);
  }

  @Post('alerts/:id/schedule')
  async scheduleAlert(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.alertService.markScheduled(req.auth.tenantId, id);
  }

  @Post('alerts/:id/complete')
  async completeAlert(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.alertService.markCompleted(req.auth.tenantId, id);
  }

  @Post('alerts/bulk-update')
  async bulkUpdateAlerts(
    @Req() req: AuthenticatedRequest,
    @Body() body: { alertIds: string[]; status: MaintenanceAlertStatus },
  ) {
    return this.alertService.bulkUpdateStatus(
      req.auth.tenantId,
      body.alertIds,
      body.status,
    );
  }

  @Post('alerts/create-campaign')
  async createCampaignFromAlerts(
    @Req() req: AuthenticatedRequest,
    @Body() body: { alertIds: string[] },
  ) {
    return this.alertService.convertToCampaign(req.auth.tenantId, body.alertIds);
  }
}

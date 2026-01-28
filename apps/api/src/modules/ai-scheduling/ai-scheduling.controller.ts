import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PreferenceLearningService } from './preference-learning.service';
import { RouteOptimizationService } from './route-optimization.service';
import { SmartDispatchService } from './smart-dispatch.service';
import { DispatchIntelligenceService } from './dispatch-intelligence.service';
import { FindBestTechnicianDto, FillGapDto } from './dto/dispatch.dto';

@Controller('ai-scheduling')
@UseGuards(JwtAuthGuard)
export class AiSchedulingController {
  constructor(
    private readonly preferenceLearning: PreferenceLearningService,
    private readonly routeOptimization: RouteOptimizationService,
    private readonly smartDispatch: SmartDispatchService,
    private readonly dispatchIntelligence: DispatchIntelligenceService,
  ) {}

  // ============================================
  // Customer Preferences
  // ============================================

  @Get('preferences/:customerId')
  async getCustomerPreferences(@Param('customerId') customerId: string) {
    return this.preferenceLearning.getSchedulingRecommendations(customerId);
  }

  @Post('preferences/:customerId/analyze')
  async analyzeCustomerPreferences(@Param('customerId') customerId: string) {
    return this.preferenceLearning.analyzeAndUpdatePreferences(customerId);
  }

  @Post('preferences/sort-slots')
  async sortSlotsByPreference(
    @Body() body: { customerId: string; slots: Array<{ datetime: string; [key: string]: any }> },
  ) {
    const slots = body.slots.map((s) => ({ ...s, datetime: new Date(s.datetime) }));
    return this.preferenceLearning.sortSlotsByPreference(body.customerId, slots);
  }

  // ============================================
  // Route Optimization
  // ============================================

  @Get('routes/:technicianId')
  async getOptimizedRoute(
    @Request() req,
    @Param('technicianId') technicianId: string,
    @Query('date') dateStr?: string,
  ) {
    const tenantId = req.user?.tenantId;
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.routeOptimization.getOptimizedRoute(tenantId, technicianId, date);
  }

  @Post('routes/:technicianId/optimize')
  async optimizeRoute(
    @Request() req,
    @Param('technicianId') technicianId: string,
    @Body() body?: { date?: string },
  ) {
    const tenantId = req.user?.tenantId;
    const date = body?.date ? new Date(body.date) : new Date();
    return this.routeOptimization.optimizeRoute(tenantId, technicianId, date);
  }

  @Post('routes/:routeId/apply')
  async applyRoute(@Param('routeId') routeId: string) {
    await this.routeOptimization.applyRoute(routeId);
    return { success: true };
  }

  // ============================================
  // Technician Location
  // ============================================

  @Post('location')
  async updateTechnicianLocation(
    @Request() req,
    @Body()
    body: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      heading?: number;
      speed?: number;
      status?: 'IDLE' | 'EN_ROUTE' | 'ON_SITE' | 'BREAK' | 'OFFLINE';
    },
  ) {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    await this.routeOptimization.updateTechnicianLocation(userId, tenantId, body, body.status);
    return { success: true };
  }

  @Get('location/:technicianId')
  async getTechnicianLocation(@Param('technicianId') technicianId: string) {
    return this.routeOptimization.getTechnicianLocation(technicianId);
  }

  @Get('eta/:technicianId')
  async getETA(
    @Param('technicianId') technicianId: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.routeOptimization.calculateETA(technicianId, parseFloat(lat), parseFloat(lng));
  }

  // ============================================
  // Customer Location
  // ============================================

  @Post('geocode/:customerId')
  async geocodeCustomer(@Param('customerId') customerId: string) {
    const result = await this.routeOptimization.geocodeCustomerAddress(customerId);
    return { success: !!result, coordinates: result };
  }

  // ============================================
  // Smart Dispatch (Sprint 7.6)
  // ============================================

  @Post('dispatch/best-technician')
  async findBestTechnician(@Request() req, @Body() body: FindBestTechnicianDto) {
    const tenantId = req.user?.tenantId;
    const location = body.lat && body.lng ? { lat: body.lat, lng: body.lng } : undefined;
    return this.smartDispatch.findBestTechnician({
      tenantId,
      serviceId: body.serviceId,
      date: new Date(body.date),
      location,
    });
  }

  @Post('dispatch/suggest-reassignment/:jobId')
  async suggestReassignment(@Request() req, @Param('jobId') jobId: string) {
    const tenantId = req.user?.tenantId;
    return this.smartDispatch.suggestReassignment(jobId, tenantId);
  }

  @Post('dispatch/fill-gap')
  async fillCancellationGap(@Request() req, @Body() body: FillGapDto) {
    const tenantId = req.user?.tenantId;
    return this.smartDispatch.fillCancellationGap(
      body.technicianId,
      new Date(body.date),
      new Date(body.startTime),
      new Date(body.endTime),
      tenantId,
    );
  }

  @Post('dispatch/estimate-duration/:jobId')
  async estimateDuration(@Request() req, @Param('jobId') jobId: string) {
    const tenantId = req.user?.tenantId;
    return this.dispatchIntelligence.estimateDuration(jobId, tenantId);
  }

  @Post('dispatch/suggest-upsells/:jobId')
  async suggestUpsells(@Request() req, @Param('jobId') jobId: string) {
    const tenantId = req.user?.tenantId;
    return this.dispatchIntelligence.suggestUpsells(jobId, tenantId);
  }
}

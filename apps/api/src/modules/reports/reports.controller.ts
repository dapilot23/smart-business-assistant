import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';

@Controller('reports')
@UseGuards(ClerkAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  async getDashboardStats(@Req() req: any) {
    const tenantId = req.tenantId;
    return this.reportsService.getDashboardStats(tenantId);
  }

  @Get('revenue')
  async getRevenueChart(@Req() req: any, @Query() filters: ReportFilterDto) {
    const tenantId = req.tenantId;
    return this.reportsService.getRevenueChart(tenantId, filters.period);
  }

  @Get('appointments')
  async getAppointmentStats(@Req() req: any, @Query() filters: ReportFilterDto) {
    const tenantId = req.tenantId;
    return this.reportsService.getAppointmentStats(tenantId, filters.period);
  }

  @Get('services')
  async getTopServices(@Req() req: any) {
    const tenantId = req.tenantId;
    return this.reportsService.getTopServices(tenantId, 10);
  }

  @Get('team')
  async getTeamPerformance(@Req() req: any) {
    const tenantId = req.tenantId;
    return this.reportsService.getTeamPerformance(tenantId);
  }
}

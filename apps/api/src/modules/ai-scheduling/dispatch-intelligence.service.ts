import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';

export interface DurationEstimate {
  estimatedMinutes: number;
  confidenceRange: { min: number; max: number };
  complexityFactors: string[];
  bufferRecommendation: number;
}

export interface UpsellSuggestion {
  service: string;
  confidence: number;
  reason: string;
  suggestedPitch: string;
  estimatedRevenue: number;
}

export interface UpsellResult {
  opportunities: UpsellSuggestion[];
  totalPotential: number;
}

@Injectable()
export class DispatchIntelligenceService {
  private readonly logger = new Logger(DispatchIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineService,
  ) {}

  async estimateDuration(jobId: string, tenantId: string): Promise<DurationEstimate> {
    const job = await this.getJobWithDetails(jobId, tenantId);

    if (!job) {
      return this.getDefaultEstimate(60);
    }

    // Fallback if AI is not configured
    if (!this.aiEngine.isReady()) {
      const defaultDuration = job.appointment?.duration || job.appointment?.service?.durationMinutes || 60;
      return {
        estimatedMinutes: defaultDuration,
        confidenceRange: { min: defaultDuration - 15, max: defaultDuration + 30 },
        complexityFactors: ['AI unavailable - using service default'],
        bufferRecommendation: 15,
      };
    }

    const equipment = job.appointment?.customer?.equipment?.[0];
    const equipmentAge = equipment?.installDate
      ? this.calculateAge(equipment.installDate)
      : 'unknown';

    try {
      const response = await this.aiEngine.analyze<DurationEstimate>({
        template: 'dispatch.estimate-duration',
        variables: {
          serviceType: job.appointment?.service?.name || 'General Service',
          serviceDescription: job.appointment?.service?.description || '',
          equipmentType: equipment?.equipmentType || 'unknown',
          equipmentAge,
          equipmentCondition: equipment?.condition || 'unknown',
          customerHistory: this.summarizeCustomerHistory(job.appointment?.customer),
          technicianExperience: job.technician?.name || 'unknown',
          jobType: job.appointment?.service?.name || 'General',
        },
        tenantId,
        feature: 'dispatch',
      });

      return response.data;
    } catch (error) {
      this.logger.error(`AI duration estimation failed: ${error.message}`);
      return this.getDefaultEstimate(job.appointment?.duration || 60);
    }
  }

  async suggestUpsells(jobId: string, tenantId: string): Promise<UpsellResult> {
    const job = await this.getJobWithDetails(jobId, tenantId);

    if (!job || !this.aiEngine.isReady()) {
      return { opportunities: [], totalPotential: 0 };
    }

    try {
      const customerId = job.appointment?.customer?.id;

      // Get customer spend history
      const spendHistory = customerId
        ? await this.prisma.invoice.aggregate({
            where: { customerId, status: 'PAID' },
            _sum: { amount: true },
          })
        : { _sum: { amount: null } };

      // Get maintenance alerts
      const maintenanceAlerts = customerId
        ? await this.prisma.maintenanceAlert.findMany({
            where: { customerId, status: { in: ['PENDING', 'NOTIFIED'] } },
            select: { title: true, priority: true },
            take: 5,
          })
        : [];

      const response = await this.aiEngine.analyze<{
        upsellOpportunities: UpsellSuggestion[];
        totalUpsellPotential: number;
      }>({
        template: 'dispatch.suggest-upsell',
        variables: {
          currentService: job.appointment?.service?.name || 'General Service',
          customerEquipment: this.formatEquipment(job.appointment?.customer?.equipment || []),
          spendHistory: `$${spendHistory._sum?.amount?.toString() || '0'} total spent`,
          maintenanceAlerts: maintenanceAlerts.map((a) => a.title).join(', ') || 'None',
          currentSeason: this.getCurrentSeason(),
        },
        tenantId,
        feature: 'dispatch',
      });

      return {
        opportunities: response.data.upsellOpportunities,
        totalPotential: response.data.totalUpsellPotential,
      };
    } catch (error) {
      this.logger.error(`AI upsell suggestion failed: ${error.message}`);
      return { opportunities: [], totalPotential: 0 };
    }
  }

  private async getJobWithDetails(jobId: string, tenantId: string) {
    return this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        technician: { select: { id: true, name: true } },
        appointment: {
          include: {
            service: true,
            customer: {
              include: { equipment: true },
            },
          },
        },
      },
    });
  }

  private getDefaultEstimate(duration: number): DurationEstimate {
    return {
      estimatedMinutes: duration,
      confidenceRange: { min: duration - 15, max: duration + 30 },
      complexityFactors: ['Default estimate'],
      bufferRecommendation: 15,
    };
  }

  private calculateAge(installDate: Date): string {
    const years = Math.floor(
      (Date.now() - new Date(installDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
    return `${years} years`;
  }

  private summarizeCustomerHistory(customer: any): string {
    if (!customer) return 'New customer';
    const equipmentCount = customer.equipment?.length || 0;
    return `${equipmentCount} equipment on record`;
  }

  private formatEquipment(equipment: any[]): string {
    if (!equipment || equipment.length === 0) return 'No equipment on file';
    return equipment
      .map((e) => `${e.equipmentType} (${e.brand || 'unknown brand'}, condition: ${e.condition})`)
      .join('; ');
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EventsService } from '../../config/events/events.service';
import {
  MaintenanceAlertType,
  AlertPriority,
  EquipmentCondition,
} from '@prisma/client';

export interface PredictionResult {
  equipmentId: string;
  alertType: MaintenanceAlertType;
  priority: AlertPriority;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  dueDate?: Date;
}

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Run predictions for all equipment in a tenant
   */
  async runPredictions(tenantId: string): Promise<PredictionResult[]> {
    this.logger.log(`Running predictions for tenant ${tenantId}`);

    const equipment = await this.prisma.customerEquipment.findMany({
      where: { tenantId, isActive: true },
      include: {
        customer: { select: { name: true } },
        serviceHistory: {
          orderBy: { serviceDate: 'desc' },
          take: 5,
        },
      },
    });

    const predictions: PredictionResult[] = [];

    for (const eq of equipment) {
      const equipmentPredictions = await this.predictForEquipment(eq);
      predictions.push(...equipmentPredictions);
    }

    // Create alerts for predictions
    await this.createAlertsFromPredictions(tenantId, predictions);

    this.logger.log(`Generated ${predictions.length} predictions for tenant ${tenantId}`);
    return predictions;
  }

  /**
   * Predict maintenance needs for a single piece of equipment
   */
  private async predictForEquipment(equipment: {
    id: string;
    tenantId: string;
    customerId: string;
    equipmentType: string;
    brand?: string | null;
    model?: string | null;
    installDate?: Date | null;
    lastServiceDate?: Date | null;
    nextServiceDue?: Date | null;
    condition: EquipmentCondition;
    warrantyExpiry?: Date | null;
    customer: { name: string };
    serviceHistory: Array<{
      serviceDate: Date;
      serviceType: string;
      description?: string | null;
    }>;
  }): Promise<PredictionResult[]> {
    const predictions: PredictionResult[] = [];
    const now = new Date();

    // Age-based prediction
    if (equipment.installDate) {
      const ageYears = this.calculateAge(equipment.installDate);
      const lifespanYears = this.getExpectedLifespan(equipment.equipmentType);

      if (ageYears >= lifespanYears * 0.8) {
        predictions.push({
          equipmentId: equipment.id,
          alertType: 'AGE_BASED',
          priority: ageYears >= lifespanYears ? 'HIGH' : 'MEDIUM',
          title: `${equipment.equipmentType} approaching end of lifespan`,
          description: `The ${equipment.equipmentType} installed in ${equipment.installDate.getFullYear()} ` +
            `is ${ageYears.toFixed(1)} years old. Typical lifespan is ${lifespanYears} years.`,
          reasoning: `Equipment age (${ageYears.toFixed(1)} years) exceeds 80% of expected lifespan (${lifespanYears} years)`,
          confidence: 0.85,
          dueDate: this.addMonths(now, ageYears >= lifespanYears ? 1 : 6),
        });
      }
    }

    // Overdue service prediction
    if (equipment.nextServiceDue && equipment.nextServiceDue < now) {
      const overdueDays = Math.floor((now.getTime() - equipment.nextServiceDue.getTime()) / 86400000);
      predictions.push({
        equipmentId: equipment.id,
        alertType: 'OVERDUE_SERVICE',
        priority: overdueDays > 90 ? 'HIGH' : 'MEDIUM',
        title: `Overdue maintenance for ${equipment.equipmentType}`,
        description: `Service was due ${overdueDays} days ago on ${equipment.nextServiceDue.toLocaleDateString()}.`,
        reasoning: `Next service date has passed by ${overdueDays} days`,
        confidence: 0.95,
        dueDate: now,
      });
    }

    // Warranty expiring prediction
    if (equipment.warrantyExpiry) {
      const daysUntilExpiry = Math.floor(
        (equipment.warrantyExpiry.getTime() - now.getTime()) / 86400000
      );
      if (daysUntilExpiry > 0 && daysUntilExpiry <= 90) {
        predictions.push({
          equipmentId: equipment.id,
          alertType: 'WARRANTY_EXPIRING',
          priority: daysUntilExpiry <= 30 ? 'HIGH' : 'LOW',
          title: `Warranty expiring soon for ${equipment.equipmentType}`,
          description: `Warranty expires in ${daysUntilExpiry} days on ${equipment.warrantyExpiry.toLocaleDateString()}. ` +
            `Consider scheduling inspection before warranty ends.`,
          reasoning: `Warranty expires within ${daysUntilExpiry} days`,
          confidence: 1.0,
          dueDate: this.addDays(equipment.warrantyExpiry, -14),
        });
      }
    }

    // Seasonal prediction
    const seasonalPrediction = this.checkSeasonalMaintenance(equipment);
    if (seasonalPrediction) {
      predictions.push(seasonalPrediction);
    }

    // Condition-based prediction
    if (equipment.condition === 'FAIR' || equipment.condition === 'POOR') {
      predictions.push({
        equipmentId: equipment.id,
        alertType: 'AI_PREDICTED',
        priority: equipment.condition === 'POOR' ? 'HIGH' : 'MEDIUM',
        title: `${equipment.equipmentType} needs attention`,
        description: `Equipment is in ${equipment.condition} condition and may require service soon.`,
        reasoning: `Current condition is ${equipment.condition}`,
        confidence: 0.8,
        dueDate: this.addMonths(now, equipment.condition === 'POOR' ? 0 : 1),
      });
    }

    return predictions;
  }

  /**
   * Use AI to analyze equipment and predict issues
   */
  async analyzeWithAI(
    tenantId: string,
    equipmentId: string
  ): Promise<PredictionResult | null> {
    const equipment = await this.prisma.customerEquipment.findFirst({
      where: { id: equipmentId, tenantId },
      include: {
        customer: { select: { name: true } },
        serviceHistory: {
          orderBy: { serviceDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!equipment) return null;

    try {
      const prompt = this.buildAnalysisPrompt(equipment);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return null;

      const analysis = JSON.parse(content.text);

      if (analysis.needsMaintenance) {
        return {
          equipmentId,
          alertType: 'AI_PREDICTED',
          priority: analysis.priority || 'MEDIUM',
          title: analysis.title,
          description: analysis.description,
          reasoning: analysis.reasoning,
          confidence: analysis.confidence || 0.7,
          dueDate: analysis.urgentDays
            ? this.addDays(new Date(), analysis.urgentDays)
            : undefined,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`AI analysis failed for equipment ${equipmentId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Create maintenance alerts from predictions
   */
  private async createAlertsFromPredictions(
    tenantId: string,
    predictions: PredictionResult[]
  ) {
    for (const pred of predictions) {
      // Check if similar alert already exists
      const existingAlert = await this.prisma.maintenanceAlert.findFirst({
        where: {
          equipmentId: pred.equipmentId,
          alertType: pred.alertType,
          status: { in: ['PENDING', 'NOTIFIED'] },
        },
      });

      if (existingAlert) continue;

      const equipment = await this.prisma.customerEquipment.findUnique({
        where: { id: pred.equipmentId },
        select: { customerId: true },
      });

      if (!equipment) continue;

      await this.prisma.maintenanceAlert.create({
        data: {
          tenantId,
          customerId: equipment.customerId,
          equipmentId: pred.equipmentId,
          alertType: pred.alertType,
          priority: pred.priority,
          title: pred.title,
          description: pred.description,
          reasoning: pred.reasoning,
          confidence: pred.confidence,
          dueDate: pred.dueDate,
          status: 'PENDING',
        },
      });
    }
  }

  private buildAnalysisPrompt(equipment: {
    equipmentType: string;
    brand?: string | null;
    model?: string | null;
    installDate?: Date | null;
    condition: EquipmentCondition;
    serviceHistory: Array<{
      serviceDate: Date;
      serviceType: string;
      description?: string | null;
    }>;
  }): string {
    const historyText = equipment.serviceHistory
      .map(h => `- ${h.serviceDate.toLocaleDateString()}: ${h.serviceType}${h.description ? ` - ${h.description}` : ''}`)
      .join('\n');

    return `Analyze this equipment and predict if maintenance is needed.

Equipment: ${equipment.equipmentType}
Brand: ${equipment.brand || 'Unknown'}
Model: ${equipment.model || 'Unknown'}
Install Date: ${equipment.installDate?.toLocaleDateString() || 'Unknown'}
Current Condition: ${equipment.condition}

Service History:
${historyText || 'No service history available'}

Respond in JSON format:
{
  "needsMaintenance": boolean,
  "title": "Brief title if maintenance needed",
  "description": "Detailed description",
  "reasoning": "Why you predict this",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "confidence": 0.0-1.0,
  "urgentDays": number or null
}`;
  }

  private checkSeasonalMaintenance(equipment: {
    id: string;
    equipmentType: string;
    lastServiceDate?: Date | null;
  }): PredictionResult | null {
    const now = new Date();
    const month = now.getMonth();

    // HVAC: Service before summer (cooling) and winter (heating)
    if (equipment.equipmentType.toLowerCase().includes('hvac') ||
        equipment.equipmentType.toLowerCase().includes('air conditioner') ||
        equipment.equipmentType.toLowerCase().includes('furnace')) {

      const isPreSummer = month >= 3 && month <= 4;  // April-May
      const isPreWinter = month >= 9 && month <= 10;  // October-November

      if (isPreSummer || isPreWinter) {
        const season = isPreSummer ? 'summer' : 'winter';
        const lastService = equipment.lastServiceDate;

        // Only alert if not serviced in the last 4 months
        if (!lastService || this.monthsSince(lastService) >= 4) {
          return {
            equipmentId: equipment.id,
            alertType: 'SEASONAL',
            priority: 'MEDIUM',
            title: `Pre-${season} ${equipment.equipmentType} maintenance`,
            description: `Schedule ${equipment.equipmentType} maintenance before ${season} to ensure optimal performance.`,
            reasoning: `Seasonal maintenance recommended before ${season} season`,
            confidence: 0.9,
            dueDate: this.addMonths(now, 1),
          };
        }
      }
    }

    return null;
  }

  private calculateAge(installDate: Date): number {
    const now = new Date();
    return (now.getTime() - installDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  }

  private monthsSince(date: Date): number {
    const now = new Date();
    return (now.getTime() - date.getTime()) / (30 * 24 * 60 * 60 * 1000);
  }

  private getExpectedLifespan(equipmentType: string): number {
    const lifespans: Record<string, number> = {
      'HVAC': 15,
      'Air Conditioner': 15,
      'Furnace': 20,
      'Water Heater': 10,
      'Tankless Water Heater': 20,
      'Plumbing': 50,
      'Garbage Disposal': 10,
      'Dishwasher': 10,
      'Refrigerator': 15,
      'Washer': 12,
      'Dryer': 12,
    };
    return lifespans[equipmentType] || 15;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Daily cron job to run predictions for all tenants
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runDailyPredictions() {
    this.logger.log('Running daily maintenance predictions');

    const tenants = await this.prisma.tenant.findMany({
      select: { id: true },
    });

    for (const tenant of tenants) {
      try {
        await this.runPredictions(tenant.id);
      } catch (error) {
        this.logger.error(`Prediction failed for tenant ${tenant.id}: ${error.message}`);
      }
    }
  }
}

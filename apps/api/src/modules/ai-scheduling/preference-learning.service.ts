import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma/prisma.service';

export interface PreferenceAnalysis {
  preferredDays: number[];
  preferredTimeStart: string | null;
  preferredTimeEnd: string | null;
  preferredTechnician: string | null;
  confidence: number;
  dataPoints: number;
}

@Injectable()
export class PreferenceLearningService {
  private readonly logger = new Logger(PreferenceLearningService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyze customer's booking history and update preferences
   */
  async analyzeAndUpdatePreferences(customerId: string): Promise<PreferenceAnalysis> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        appointments: {
          where: { status: { in: ['COMPLETED', 'CONFIRMED'] } },
          orderBy: { scheduledAt: 'desc' },
          take: 20, // Last 20 appointments for analysis
          include: { assignedUser: true },
        },
      },
    });

    if (!customer || customer.appointments.length < 2) {
      return {
        preferredDays: [],
        preferredTimeStart: null,
        preferredTimeEnd: null,
        preferredTechnician: null,
        confidence: 0,
        dataPoints: customer?.appointments.length || 0,
      };
    }

    const appointments = customer.appointments;
    const analysis = this.analyzeAppointments(appointments);

    // Update or create customer preferences
    await this.prisma.customerPreference.upsert({
      where: { customerId },
      create: {
        customerId,
        tenantId: customer.tenantId,
        ...analysis,
      },
      update: {
        ...analysis,
        lastUpdated: new Date(),
      },
    });

    this.logger.log(
      `Updated preferences for customer ${customerId}: confidence=${analysis.confidence.toFixed(2)}`,
    );

    return { ...analysis, dataPoints: appointments.length };
  }

  /**
   * Get scheduling recommendations for a customer
   */
  async getSchedulingRecommendations(
    customerId: string,
    serviceId?: string,
  ): Promise<{
    preferredSlots: Array<{ day: number; time: string; score: number }>;
    preferredTechnician?: string;
    notes: string[];
  }> {
    const preferences = await this.prisma.customerPreference.findUnique({
      where: { customerId },
    });

    if (!preferences || preferences.learningConfidence < 0.3) {
      return {
        preferredSlots: [],
        notes: ['Not enough booking history for recommendations'],
      };
    }

    const slots: Array<{ day: number; time: string; score: number }> = [];
    const notes: string[] = [];

    // Generate recommended slots based on preferences
    for (const day of preferences.preferredDays) {
      if (preferences.preferredTimeStart && preferences.preferredTimeEnd) {
        slots.push({
          day,
          time: preferences.preferredTimeStart,
          score: preferences.learningConfidence,
        });
      }
    }

    if (preferences.preferredTechnician) {
      notes.push(`Customer has worked with same technician ${preferences.dataPoints} times`);
    }

    if (preferences.learningConfidence > 0.7) {
      notes.push('High confidence in preferences based on consistent booking patterns');
    }

    return {
      preferredSlots: slots.sort((a, b) => b.score - a.score),
      preferredTechnician: preferences.preferredTechnician || undefined,
      notes,
    };
  }

  /**
   * Sort available slots by customer preference match
   */
  async sortSlotsByPreference(
    customerId: string,
    slots: Array<{ datetime: Date; [key: string]: any }>,
  ): Promise<Array<{ datetime: Date; preferenceScore: number; [key: string]: any }>> {
    const preferences = await this.prisma.customerPreference.findUnique({
      where: { customerId },
    });

    if (!preferences) {
      return slots.map((slot) => ({ ...slot, preferenceScore: 0.5 }));
    }

    return slots
      .map((slot) => {
        const date = new Date(slot.datetime);
        let score = 0.5; // Base score

        // Day of week preference
        if (preferences.preferredDays.includes(date.getDay())) {
          score += 0.2 * preferences.learningConfidence;
        }

        // Avoid days
        if (preferences.avoidDays.includes(date.getDay())) {
          score -= 0.3;
        }

        // Time preference
        const timeStr = date.toTimeString().slice(0, 5);
        if (preferences.preferredTimeStart && preferences.preferredTimeEnd) {
          if (timeStr >= preferences.preferredTimeStart && timeStr <= preferences.preferredTimeEnd) {
            score += 0.3 * preferences.learningConfidence;
          }
        }

        return { ...slot, preferenceScore: Math.max(0, Math.min(1, score)) };
      })
      .sort((a, b) => b.preferenceScore - a.preferenceScore);
  }

  /**
   * Analyze appointment history to extract patterns
   */
  private analyzeAppointments(
    appointments: Array<{
      scheduledAt: Date;
      assignedTo: string | null;
      assignedUser?: { id: string } | null;
    }>,
  ): Omit<PreferenceAnalysis, 'dataPoints'> {
    const dayCount: Record<number, number> = {};
    const hourCount: Record<number, number> = {};
    const technicianCount: Record<string, number> = {};

    for (const appt of appointments) {
      const date = new Date(appt.scheduledAt);
      const day = date.getDay();
      const hour = date.getHours();

      dayCount[day] = (dayCount[day] || 0) + 1;
      hourCount[hour] = (hourCount[hour] || 0) + 1;

      if (appt.assignedTo) {
        technicianCount[appt.assignedTo] = (technicianCount[appt.assignedTo] || 0) + 1;
      }
    }

    const totalAppointments = appointments.length;

    // Find preferred days (>30% of appointments)
    const preferredDays = Object.entries(dayCount)
      .filter(([, count]) => count / totalAppointments >= 0.3)
      .map(([day]) => parseInt(day, 10));

    // Find preferred time range
    const sortedHours = Object.entries(hourCount).sort(([, a], [, b]) => b - a);
    let preferredTimeStart: string | null = null;
    let preferredTimeEnd: string | null = null;

    if (sortedHours.length > 0) {
      const topHours = sortedHours.slice(0, 3).map(([h]) => parseInt(h, 10));
      const minHour = Math.min(...topHours);
      const maxHour = Math.max(...topHours);
      preferredTimeStart = `${minHour.toString().padStart(2, '0')}:00`;
      preferredTimeEnd = `${(maxHour + 1).toString().padStart(2, '0')}:00`;
    }

    // Find preferred technician (>50% of appointments)
    const preferredTechnician =
      Object.entries(technicianCount).find(([, count]) => count / totalAppointments >= 0.5)?.[0] ||
      null;

    // Calculate confidence based on data consistency
    const dayConsistency = preferredDays.length > 0 ? preferredDays.length / 7 : 0;
    const timeConsistency = sortedHours.length > 0 ? sortedHours[0][1] / totalAppointments : 0;
    const dataAmount = Math.min(1, totalAppointments / 10);

    const confidence = (dayConsistency * 0.3 + timeConsistency * 0.4 + dataAmount * 0.3);

    return {
      preferredDays,
      preferredTimeStart,
      preferredTimeEnd,
      preferredTechnician,
      confidence,
    };
  }

  /**
   * Record booking event to improve future predictions
   */
  async recordBookingEvent(
    customerId: string,
    scheduledAt: Date,
    technicianId?: string,
  ): Promise<void> {
    // Get current preferences
    const existing = await this.prisma.customerPreference.findUnique({
      where: { customerId },
    });

    if (existing) {
      // Increment data points and trigger re-analysis if enough new data
      await this.prisma.customerPreference.update({
        where: { customerId },
        data: { dataPoints: { increment: 1 } },
      });

      if (existing.dataPoints % 5 === 0) {
        // Re-analyze every 5 bookings
        await this.analyzeAndUpdatePreferences(customerId);
      }
    } else {
      // First booking, just create a basic record
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (customer) {
        await this.prisma.customerPreference.create({
          data: {
            customerId,
            tenantId: customer.tenantId,
            preferredDays: [scheduledAt.getDay()],
            preferredTimeStart: `${scheduledAt.getHours().toString().padStart(2, '0')}:00`,
            preferredTimeEnd: `${(scheduledAt.getHours() + 1).toString().padStart(2, '0')}:00`,
            preferredTechnician: technicianId,
            learningConfidence: 0.1,
            dataPoints: 1,
          },
        });
      }
    }
  }

  /**
   * Cron job to periodically update preferences for active customers
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async updateAllPreferences(): Promise<void> {
    await this.prisma.withSystemContext(async () => {
      this.logger.log('Starting batch preference analysis');

      // Find customers with recent appointments who need preference updates
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const customers = await this.prisma.customer.findMany({
        where: {
          appointments: {
            some: {
              scheduledAt: { gte: thirtyDaysAgo },
              status: 'COMPLETED',
            },
          },
        },
        select: { id: true },
        take: 100, // Batch size
      });

      let updated = 0;
      for (const customer of customers) {
        try {
          await this.analyzeAndUpdatePreferences(customer.id);
          updated++;
        } catch (error) {
          this.logger.error(`Failed to update preferences for ${customer.id}: ${error.message}`);
        }
      }

      this.logger.log(`Batch preference update complete: ${updated}/${customers.length} customers`);
    });
  }
}

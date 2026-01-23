import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    let settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      settings = await this.createDefaultSettings(tenantId);
    }

    return settings;
  }

  async updateSettings(tenantId: string, dto: UpdateSettingsDto) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      return this.prisma.tenantSettings.create({
        data: {
          tenantId,
          ...dto,
        },
      });
    }

    return this.prisma.tenantSettings.update({
      where: { tenantId },
      data: dto,
    });
  }

  private async createDefaultSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.prisma.tenantSettings.create({
      data: {
        tenantId,
        businessHours: this.getDefaultBusinessHours(),
      },
    });
  }

  private getDefaultBusinessHours() {
    return {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' },
      saturday: { start: '09:00', end: '13:00' },
      sunday: { start: '', end: '' },
    };
  }
}

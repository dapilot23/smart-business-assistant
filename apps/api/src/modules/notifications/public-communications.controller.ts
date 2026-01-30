import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CommunicationChannel } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('public/communications')
export class PublicCommunicationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('unsubscribe')
  async unsubscribe(
    @Body()
    body: {
      tenantId?: string;
      tenantSlug?: string;
      email?: string;
      phone?: string;
      channel?: CommunicationChannel;
    },
  ) {
    const tenantId = await this.resolveTenantId(body.tenantId, body.tenantSlug);
    if (!tenantId) {
      throw new BadRequestException('Tenant not found');
    }

    const channel = body.channel || (body.email ? CommunicationChannel.EMAIL : CommunicationChannel.SMS);
    const value = channel === CommunicationChannel.EMAIL
      ? this.normalizeEmail(body.email)
      : this.normalizePhone(body.phone);

    if (!value) {
      throw new BadRequestException('Missing unsubscribe value');
    }

    await this.prisma.withTenantContext(tenantId, async () => {
      await this.prisma.communicationOptOut.upsert({
        where: {
          tenantId_channel_value: {
            tenantId,
            channel,
            value,
          },
        },
        update: { source: 'PUBLIC_UNSUBSCRIBE' },
        create: {
          tenantId,
          channel,
          value,
          source: 'PUBLIC_UNSUBSCRIBE',
        },
      });
    });

    return { success: true };
  }

  private async resolveTenantId(tenantId?: string, tenantSlug?: string) {
    if (tenantId) return tenantId;
    if (!tenantSlug) return null;

    const tenant = await this.prisma.withSystemContext(() =>
      this.prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true },
      }),
    );
    return tenant?.id || null;
  }

  private normalizeEmail(email?: string): string | null {
    if (!email) return null;
    return email.trim().toLowerCase();
  }

  private normalizePhone(phone?: string): string | null {
    if (!phone) return null;
    return phone.replace(/[^\d+]/g, '');
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { ConversationPriority, UserRole, UserStatus } from '@prisma/client';
import { ClassificationResult } from './message-classification.service';

@Injectable()
export class AiResponderRoutingService {
  constructor(private readonly prisma: PrismaService) {}

  async applyRouting(
    conversationId: string,
    tenantId: string,
    classification: ClassificationResult,
  ): Promise<void> {
    const thread = await this.prisma.conversationThread.findUnique({
      where: { id: conversationId },
      select: { assignedTo: true, tags: true },
    });

    if (!thread) return;

    const priority = this.getPriority(classification);
    const tags = this.buildTags(thread.tags || [], classification);

    await this.prisma.conversationThread.update({
      where: { id: conversationId },
      data: { priority, tags },
    });

    if (!thread.assignedTo) {
      const assignee = await this.findAssignee(tenantId, classification);
      if (assignee) {
        await this.prisma.conversationThread.update({
          where: { id: conversationId },
          data: { assignedTo: assignee },
        });
      }
    }
  }

  private getPriority(classification: ClassificationResult): ConversationPriority {
    if (classification.urgencyScore >= 70) {
      return ConversationPriority.URGENT;
    }
    if (classification.sentiment === 'URGENT' || classification.intent === 'EMERGENCY') {
      return ConversationPriority.URGENT;
    }
    if (classification.sentiment === 'NEGATIVE' || classification.intent === 'COMPLAINT') {
      return ConversationPriority.HIGH;
    }
    return ConversationPriority.NORMAL;
  }

  private buildTags(existing: string[], classification: ClassificationResult) {
    const tags = new Set(existing);
    tags.add(classification.intent.toLowerCase());
    if (classification.sentiment === 'NEGATIVE') tags.add('needs_attention');
    if (classification.sentiment === 'URGENT' || classification.intent === 'EMERGENCY') {
      tags.add('urgent');
    }
    return Array.from(tags);
  }

  private async findAssignee(
    tenantId: string,
    classification: ClassificationResult,
  ): Promise<string | null> {
    const roleOrder = this.getRolePriority(classification);
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: UserStatus.ACTIVE,
        role: { in: roleOrder },
      },
      select: { id: true, role: true },
    });

    for (const role of roleOrder) {
      const match = users.find((u) => u.role === role);
      if (match) return match.id;
    }

    return null;
  }

  private getRolePriority(classification: ClassificationResult) {
    if (classification.intent === 'COMPLAINT' || classification.sentiment === 'NEGATIVE') {
      return [UserRole.OWNER, UserRole.ADMIN];
    }
    if (
      classification.intent === 'BOOKING_REQUEST' ||
      classification.intent === 'RESCHEDULE_REQUEST' ||
      classification.intent === 'CANCELLATION_REQUEST'
    ) {
      return [UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER];
    }
    return [UserRole.ADMIN, UserRole.OWNER, UserRole.DISPATCHER];
  }
}

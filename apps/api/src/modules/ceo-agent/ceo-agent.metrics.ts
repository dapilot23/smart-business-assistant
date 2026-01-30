import {
  ActionStatus,
  AppointmentStatus,
  ReviewRequestStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CeoMetrics } from './ceo-agent.types';

export async function collectMetrics(
  prisma: PrismaService,
  tenantId: string,
): Promise<CeoMetrics> {
  const [
    pendingQuotes,
    overdueInvoices,
    unconfirmedAppointments,
    unassignedAppointments,
    pendingReviewRequests,
    pendingActions,
    activeTechnicians,
  ] = await Promise.all([
    countPendingQuotes(prisma, tenantId),
    countOverdueInvoices(prisma, tenantId),
    countUnconfirmedAppointments(prisma, tenantId),
    countUnassignedAppointments(prisma, tenantId),
    countPendingReviewRequests(prisma, tenantId),
    countPendingActions(prisma, tenantId),
    countActiveTechnicians(prisma, tenantId),
  ]);

  return {
    pendingQuotes,
    overdueInvoices,
    unconfirmedAppointments,
    unassignedAppointments,
    pendingReviewRequests,
    pendingActions,
    activeTechnicians,
  };
}

export async function findOwnerUserId(
  prisma: PrismaService,
  tenantId: string,
) {
  const owner = await prisma.user.findFirst({
    where: { tenantId, role: UserRole.OWNER, status: UserStatus.ACTIVE },
    select: { id: true },
  });
  return owner?.id;
}

export async function findFallbackUserId(
  prisma: PrismaService,
  tenantId: string,
) {
  const user = await prisma.user.findFirst({
    where: {
      tenantId,
      status: UserStatus.ACTIVE,
      role: { in: [UserRole.ADMIN, UserRole.DISPATCHER, UserRole.OWNER] },
    },
    select: { id: true },
  });
  return user?.id;
}

async function countPendingQuotes(prisma: PrismaService, tenantId: string) {
  return prisma.quote.count({
    where: { tenantId, status: { in: ['DRAFT', 'SENT'] } },
  });
}

async function countOverdueInvoices(prisma: PrismaService, tenantId: string) {
  return prisma.invoice.count({
    where: { tenantId, status: 'OVERDUE' },
  });
}

async function countUnconfirmedAppointments(prisma: PrismaService, tenantId: string) {
  const now = new Date();
  const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return prisma.appointment.count({
    where: {
      tenantId,
      status: AppointmentStatus.SCHEDULED,
      confirmedAt: null,
      scheduledAt: { gte: now, lte: nextDay },
    },
  });
}

async function countUnassignedAppointments(prisma: PrismaService, tenantId: string) {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return prisma.appointment.count({
    where: {
      tenantId,
      assignedTo: null,
      status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
      scheduledAt: { gte: now, lte: nextWeek },
    },
  });
}

async function countPendingReviewRequests(prisma: PrismaService, tenantId: string) {
  return prisma.reviewRequest.count({
    where: { tenantId, status: ReviewRequestStatus.PENDING },
  });
}

async function countPendingActions(prisma: PrismaService, tenantId: string) {
  return prisma.aIAction.count({
    where: { tenantId, status: ActionStatus.PENDING },
  });
}

async function countActiveTechnicians(prisma: PrismaService, tenantId: string) {
  return prisma.user.count({
    where: {
      tenantId,
      role: UserRole.TECHNICIAN,
      status: UserStatus.ACTIVE,
    },
  });
}

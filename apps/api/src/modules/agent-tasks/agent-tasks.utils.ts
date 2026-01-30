import { BadRequestException } from '@nestjs/common';
import { AgentType, Prisma, TaskOwnerType, TaskPriority, TaskStatus } from '@prisma/client';
import { CreateAgentTaskDto } from './dto/create-agent-task.dto';
import { UpdateAgentTaskDto } from './dto/update-agent-task.dto';

export function buildCreateInput(
  tenantId: string,
  dto: CreateAgentTaskDto,
  userId: string,
): Prisma.AgentTaskUncheckedCreateInput {
  const ownerType = dto.ownerType ?? TaskOwnerType.HUMAN;
  const ownerUserId =
    ownerType === TaskOwnerType.HUMAN ? dto.ownerUserId ?? userId : undefined;
  const createdByType = dto.createdByType ?? TaskOwnerType.HUMAN;
  const createdByUserId =
    createdByType === TaskOwnerType.HUMAN ? dto.createdByUserId ?? userId : undefined;

  return {
    tenantId,
    title: dto.title,
    description: dto.description,
    status: dto.status ?? TaskStatus.PENDING,
    priority: dto.priority ?? TaskPriority.MEDIUM,
    ownerType,
    ownerUserId: ownerType === TaskOwnerType.HUMAN ? ownerUserId : null,
    ownerAgentType: ownerType === TaskOwnerType.AI_AGENT ? dto.ownerAgentType ?? null : null,
    createdByType,
    createdByUserId: createdByType === TaskOwnerType.HUMAN ? createdByUserId : null,
    createdByAgentType: createdByType === TaskOwnerType.AI_AGENT ? dto.createdByAgentType ?? null : null,
    dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
    blockedReason: dto.blockedReason,
    sourceType: dto.sourceType,
    sourceId: dto.sourceId,
    metadata: dto.metadata as Prisma.InputJsonValue | undefined,
  };
}

export function buildUpdateInput(
  existing: { startedAt: Date | null },
  dto: UpdateAgentTaskDto,
  ownerType: TaskOwnerType,
  ownerUserId?: string | null,
  ownerAgentType?: AgentType | null,
): Prisma.AgentTaskUncheckedUpdateInput {
  const data: Prisma.AgentTaskUncheckedUpdateInput = {
    ...(dto.title && { title: dto.title }),
    ...(dto.description !== undefined && { description: dto.description }),
    ...(dto.priority && { priority: dto.priority }),
    ...(dto.dueAt && { dueAt: new Date(dto.dueAt) }),
    ...(dto.metadata && { metadata: dto.metadata as Prisma.InputJsonValue }),
    ownerType,
    ownerUserId: ownerType === TaskOwnerType.HUMAN ? ownerUserId ?? null : null,
    ownerAgentType: ownerType === TaskOwnerType.AI_AGENT ? ownerAgentType ?? null : null,
  };

  if (dto.status) {
    Object.assign(data, statusTimestampsForUpdate(dto.status, existing.startedAt));
  }

  if (dto.blockedReason !== undefined) {
    data.blockedReason = dto.blockedReason;
  } else if (dto.status && dto.status !== TaskStatus.BLOCKED) {
    data.blockedReason = null;
  }

  return data;
}

export function statusTimestampsForCreate(status: TaskStatus) {
  const now = new Date();
  if (status === TaskStatus.IN_PROGRESS) return { startedAt: now };
  if (status === TaskStatus.COMPLETED) return { startedAt: now, completedAt: now };
  return {};
}

export function statusTimestampsForUpdate(status: TaskStatus, startedAt: Date | null) {
  const now = new Date();
  if (status === TaskStatus.IN_PROGRESS) return { status, startedAt: startedAt ?? now };
  if (status === TaskStatus.COMPLETED) {
    return { status, startedAt: startedAt ?? now, completedAt: now };
  }
  return { status };
}

export function ensureBlockedReason(
  status: TaskStatus | undefined,
  blockedReason: string | undefined,
  existingReason: string | null,
) {
  if (status !== TaskStatus.BLOCKED) return;
  if (blockedReason) return;
  if (existingReason) return;
  throw new BadRequestException('blockedReason is required when status is BLOCKED');
}

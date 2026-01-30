import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgentType, Prisma, TaskOwnerType, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateAgentTaskDto } from './dto/create-agent-task.dto';
import { UpdateAgentTaskDto } from './dto/update-agent-task.dto';
import { ListAgentTasksDto } from './dto/list-agent-tasks.dto';
import {
  buildCreateInput,
  buildUpdateInput,
  ensureBlockedReason,
  statusTimestampsForCreate,
} from './agent-tasks.utils';

@Injectable()
export class AgentTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async createTask(
    tenantId: string,
    dto: CreateAgentTaskDto,
    userId: string,
  ) {
    const data = buildCreateInput(tenantId, dto, userId);
    await this.validateOwner(tenantId, data.ownerType, data.ownerUserId, data.ownerAgentType);
    const createdByType = data.createdByType ?? TaskOwnerType.HUMAN;
    await this.validateCreator(
      tenantId,
      createdByType,
      data.createdByUserId ?? null,
      data.createdByAgentType ?? null,
    );
    ensureBlockedReason(dto.status, dto.blockedReason, null);

    return this.prisma.agentTask.create({
      data: {
        ...data,
        ...statusTimestampsForCreate(dto.status ?? TaskStatus.PENDING),
      },
    });
  }

  async listTasks(tenantId: string, filters: ListAgentTasksDto) {
    const where: Prisma.AgentTaskWhereInput = {
      tenantId,
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.ownerType && { ownerType: filters.ownerType }),
      ...(filters.ownerAgentType && { ownerAgentType: filters.ownerAgentType }),
      ...(filters.ownerUserId && { ownerUserId: filters.ownerUserId }),
    };

    if (filters.dueBefore || filters.dueAfter) {
      where.dueAt = {
        ...(filters.dueAfter && { gte: new Date(filters.dueAfter) }),
        ...(filters.dueBefore && { lte: new Date(filters.dueBefore) }),
      };
    }

    return this.prisma.agentTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 50,
    });
  }

  async getTask(tenantId: string, taskId: string) {
    const task = await this.prisma.agentTask.findFirst({
      where: { id: taskId, tenantId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async updateTask(
    tenantId: string,
    taskId: string,
    dto: UpdateAgentTaskDto,
  ) {
    const existing = await this.getTask(tenantId, taskId);
    const ownerType = dto.ownerType ?? existing.ownerType;
    const ownerUserId = dto.ownerUserId ?? existing.ownerUserId;
    const ownerAgentType = dto.ownerAgentType ?? existing.ownerAgentType;

    await this.validateOwner(tenantId, ownerType, ownerUserId, ownerAgentType);
    ensureBlockedReason(dto.status, dto.blockedReason, existing.blockedReason);

    const updateData = buildUpdateInput(existing, dto, ownerType, ownerUserId, ownerAgentType);

    return this.prisma.agentTask.update({
      where: { id: taskId },
      data: updateData,
    });
  }


  private async validateOwner(
    tenantId: string,
    ownerType: TaskOwnerType,
    ownerUserId?: string | null,
    ownerAgentType?: AgentType | null,
  ) {
    if (ownerType === TaskOwnerType.AI_AGENT) {
      if (!ownerAgentType) {
        throw new BadRequestException('ownerAgentType is required for AI agent owner');
      }
      return;
    }

    if (!ownerUserId) {
      throw new BadRequestException('ownerUserId is required for human owner');
    }
    await this.ensureUser(tenantId, ownerUserId, 'Owner');
  }

  private async validateCreator(
    tenantId: string,
    createdByType: TaskOwnerType,
    createdByUserId?: string | null,
    createdByAgentType?: AgentType | null,
  ) {
    if (createdByType === TaskOwnerType.AI_AGENT) {
      if (!createdByAgentType) {
        throw new BadRequestException('createdByAgentType is required for AI creator');
      }
      return;
    }

    if (!createdByUserId) {
      throw new BadRequestException('createdByUserId is required for human creator');
    }
    await this.ensureUser(tenantId, createdByUserId, 'Creator');
  }

  private async ensureUser(tenantId: string, userId: string, label: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`${label} user not found`);
    }
  }

}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { TaskLedgerService } from './task-ledger.service';
import { CreateTaskDto, DeclineTaskDto, GetTasksQueryDto } from './dto/create-task.dto';

@Controller('task-ledger')
@UseGuards(ClerkAuthGuard)
export class TaskLedgerController {
  constructor(private readonly taskLedgerService: TaskLedgerService) {}

  /**
   * Get task statistics for dashboard
   */
  @Get('stats')
  async getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.taskLedgerService.getTaskStats(user.tenantId);
  }

  /**
   * Get pending tasks (excludes approvals)
   */
  @Get('pending')
  async getPendingTasks(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetTasksQueryDto,
  ) {
    return this.taskLedgerService.getPendingTasks(user.tenantId, {
      types: query.types,
      categories: query.categories,
      limit: query.limit,
      priorityMin: query.priorityMin,
    });
  }

  /**
   * Get pending approvals
   */
  @Get('approvals')
  async getPendingApprovals(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: string,
  ) {
    const safeLimit = this.parseLimit(limit, 10);
    return this.taskLedgerService.getPendingApprovals(
      user.tenantId,
      safeLimit,
    );
  }

  /**
   * Get today's tasks
   */
  @Get('today')
  async getTodaysTasks(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: string,
  ) {
    const safeLimit = this.parseLimit(limit, 20);
    return this.taskLedgerService.getTodaysTasks(
      user.tenantId,
      safeLimit,
    );
  }

  /**
   * Get tasks for a specific entity
   */
  @Get('entity/:entityType/:entityId')
  async getEntityTasks(
    @CurrentUser() user: CurrentUserPayload,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit?: string,
  ) {
    const safeLimit = this.parseLimit(limit, 10);
    return this.taskLedgerService.getEntityTasks(
      user.tenantId,
      entityType,
      entityId,
      safeLimit,
    );
  }

  /**
   * Get a single task by ID
   */
  @Get(':id')
  async getTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.taskLedgerService.getTask(id, user.tenantId);
  }

  /**
   * Create a new task (for manual/human tasks)
   */
  @Post()
  async createTask(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTaskDto,
  ) {
    return this.taskLedgerService.createTask({
      tenantId: user.tenantId,
      ...dto,
    });
  }

  /**
   * Approve a task (queue for execution)
   */
  @Post(':id/approve')
  async approveTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.taskLedgerService.approveTask(id, user.tenantId, user.userId);
  }

  /**
   * Decline/cancel a task
   */
  @Post(':id/decline')
  async declineTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: DeclineTaskDto,
  ) {
    return this.taskLedgerService.declineTask(
      id,
      user.tenantId,
      user.userId,
      dto.reason,
    );
  }

  /**
   * Complete a task manually (for human tasks)
   */
  @Post(':id/complete')
  async completeTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.taskLedgerService.completeTask(id, user.tenantId, user.userId);
  }

  /**
   * Undo a completed task (within undo window)
   */
  @Post(':id/undo')
  async undoTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.taskLedgerService.undoTask(id, user.tenantId, user.userId);
  }

  /**
   * Cancel all pending tasks for an entity
   */
  @Post('entity/:entityType/:entityId/cancel')
  async cancelEntityTasks(
    @CurrentUser() user: CurrentUserPayload,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body('reason') reason?: string,
  ) {
    const count = await this.taskLedgerService.cancelEntityTasks(
      user.tenantId,
      entityType,
      entityId,
      reason || 'Cancelled by user',
    );
    return { cancelled: count };
  }

  private parseLimit(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}

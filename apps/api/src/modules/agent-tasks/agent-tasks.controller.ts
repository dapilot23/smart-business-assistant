import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AgentTasksService } from './agent-tasks.service';
import { CreateAgentTaskDto } from './dto/create-agent-task.dto';
import { UpdateAgentTaskDto } from './dto/update-agent-task.dto';
import { ListAgentTasksDto } from './dto/list-agent-tasks.dto';

@Controller('agent-tasks')
export class AgentTasksController {
  constructor(private readonly agentTasksService: AgentTasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER)
  async createTask(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAgentTaskDto,
  ) {
    return this.agentTasksService.createTask(user.tenantId, dto, user.userId);
  }

  @Get()
  async listTasks(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListAgentTasksDto,
  ) {
    const limit = query.limit ? Number(query.limit) : undefined;
    return this.agentTasksService.listTasks(user.tenantId, {
      ...query,
      limit,
    });
  }

  @Get(':id')
  async getTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') taskId: string,
  ) {
    return this.agentTasksService.getTask(user.tenantId, taskId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER, UserRole.TECHNICIAN)
  async updateTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') taskId: string,
    @Body() dto: UpdateAgentTaskDto,
  ) {
    return this.agentTasksService.updateTask(user.tenantId, taskId, dto);
  }
}

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ActionExecutorService, CreateActionDto } from './action-executor.service';
import { ActionStatus } from '@prisma/client';

class ListActionsQueryDto {
  status?: ActionStatus;
  limit?: number;
}

class CreateActionBodyDto {
  actionType!: 'CREATE_CAMPAIGN' | 'SEND_SMS' | 'SEND_EMAIL' | 'SCHEDULE_APPOINTMENT' | 'CREATE_QUOTE' | 'APPLY_DISCOUNT' | 'SCHEDULE_FOLLOW_UP' | 'CREATE_SEGMENT';
  title!: string;
  description!: string;
  params!: Record<string, unknown>;
  insightId?: string;
  copilotSessionId?: string;
  estimatedImpact?: string;
  riskLevel?: string;
  requiresApproval?: boolean;
  expiresAt?: string;
}

@Controller('ai/actions')
export class AiActionsController {
  constructor(private readonly actionExecutor: ActionExecutorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAction(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: CreateActionBodyDto,
  ) {
    const dto: CreateActionDto = {
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    };

    return this.actionExecutor.createAction(user.tenantId, dto);
  }

  @Get()
  async listActions(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListActionsQueryDto,
  ) {
    return this.actionExecutor.listActions(user.tenantId, {
      status: query.status,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('pending-count')
  async getPendingCount(@CurrentUser() user: CurrentUserPayload) {
    const count = await this.actionExecutor.getPendingCount(user.tenantId);
    return { count };
  }

  @Get(':id')
  async getAction(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') actionId: string,
  ) {
    return this.actionExecutor.getAction(user.tenantId, actionId);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveAction(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') actionId: string,
  ) {
    return this.actionExecutor.approveAction(user.tenantId, actionId, user.userId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelAction(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') actionId: string,
  ) {
    return this.actionExecutor.cancelAction(user.tenantId, actionId, user.userId);
  }

  @Post('from-insight/:insightId')
  @HttpCode(HttpStatus.CREATED)
  async createFromInsight(
    @CurrentUser() user: CurrentUserPayload,
    @Param('insightId') insightId: string,
  ) {
    return this.actionExecutor.createFromInsight(
      user.tenantId,
      insightId,
      user.userId,
    );
  }
}

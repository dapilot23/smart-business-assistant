import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CeoAgentService } from './ceo-agent.service';

class RunCeoAgentDto {
  @IsOptional()
  @IsString()
  triggerEvent?: string;
}

@Controller('ai/ceo')
export class CeoAgentController {
  constructor(private readonly ceoAgentService: CeoAgentService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER)
  async run(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RunCeoAgentDto,
  ) {
    return this.ceoAgentService.run(
      user.tenantId,
      'manual',
      dto.triggerEvent,
    );
  }
}

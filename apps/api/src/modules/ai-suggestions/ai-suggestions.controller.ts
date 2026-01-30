import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AiSuggestionsService } from './ai-suggestions.service';

@Controller('ai/suggestions')
export class AiSuggestionsController {
  constructor(private readonly suggestionsService: AiSuggestionsService) {}

  @Get(':context')
  async getSuggestions(
    @CurrentUser() user: CurrentUserPayload,
    @Param('context') context: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.suggestionsService.getSuggestions(
      user.tenantId,
      context,
      entityId,
    );
  }

  @Post(':context/refresh')
  @HttpCode(HttpStatus.OK)
  async refreshSuggestions(
    @CurrentUser() user: CurrentUserPayload,
    @Param('context') context: string,
  ) {
    await this.suggestionsService.invalidateCache(user.tenantId, context);
    return this.suggestionsService.getSuggestions(user.tenantId, context);
  }

  @Post('invalidate')
  @HttpCode(HttpStatus.OK)
  async invalidateAllCache(@CurrentUser() user: CurrentUserPayload) {
    await this.suggestionsService.invalidateCache(user.tenantId);
    return { success: true };
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SegmentsService } from './segments.service';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { SegmentRules } from './segment-rules.engine';

class CreateSegmentDto {
  name: string;
  description?: string;
  rules: SegmentRules;
}

class UpdateSegmentDto {
  name?: string;
  description?: string;
  rules?: SegmentRules;
}

class PreviewSegmentDto {
  rules: SegmentRules;
}

@Controller('marketing/segments')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateSegmentDto) {
    return this.segmentsService.create(user.tenantId, {
      ...dto,
      createdBy: user.userId,
    });
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.segmentsService.findAll(user.tenantId);
  }

  @Get('fields')
  getSupportedFields() {
    return { fields: this.segmentsService.getSupportedFields() };
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.segmentsService.findOne(user.tenantId, id);
  }

  @Get(':id/members')
  getMembers(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.segmentsService.getSegmentMembers(user.tenantId, id);
  }

  @Post('preview')
  previewMembers(@CurrentUser() user: CurrentUserPayload, @Body() dto: PreviewSegmentDto) {
    return this.segmentsService.previewMembers(user.tenantId, dto.rules);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSegmentDto,
  ) {
    return this.segmentsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.segmentsService.delete(user.tenantId, id);
  }

  @Post('refresh-counts')
  refreshCounts(@CurrentUser() user: CurrentUserPayload) {
    return this.segmentsService.refreshAllSegmentCounts(user.tenantId);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { CompleteJobDto } from './dto/complete-job.dto';
import { AddJobNotesDto } from './dto/add-job-notes.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { JobFilterDto } from './dto/job-filter.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';

@Controller('jobs')
@UseGuards(ClerkAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async getJobs(@Req() req: any, @Query() filters: JobFilterDto) {
    const tenantId = req.tenantId;
    return this.jobsService.getJobs(tenantId, filters);
  }

  @Get(':id')
  async getJob(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.jobsService.getJob(tenantId, id);
  }

  @Post()
  async createJob(@Req() req: any, @Body() dto: CreateJobDto) {
    const tenantId = req.tenantId;
    return this.jobsService.createJobFromAppointment(tenantId, dto);
  }

  @Patch(':id/status')
  async updateJobStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    const tenantId = req.tenantId;
    return this.jobsService.updateJobStatus(tenantId, id, dto);
  }

  @Post(':id/start')
  async startJob(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.jobsService.startJob(tenantId, id);
  }

  @Post(':id/complete')
  async completeJob(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CompleteJobDto,
  ) {
    const tenantId = req.tenantId;
    return this.jobsService.completeJob(tenantId, id, dto);
  }

  @Patch(':id/notes')
  async addJobNotes(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AddJobNotesDto,
  ) {
    const tenantId = req.tenantId;
    return this.jobsService.addJobNotes(tenantId, id, dto.notes);
  }

  @Get(':id/photos')
  async getJobPhotos(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.jobsService.getJobPhotos(tenantId, id);
  }

  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UploadPhotoDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const tenantId = req.tenantId;
    return this.jobsService.uploadPhoto(
      tenantId,
      id,
      file,
      dto.type,
      dto.caption,
    );
  }

  @Delete(':id/photos/:photoId')
  async deletePhoto(
    @Req() req: any,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    const tenantId = req.tenantId;
    return this.jobsService.deletePhoto(tenantId, id, photoId);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { PhotoQuotesService, CreatePhotoQuoteDto } from './photo-quotes.service';
import { PhotoQuoteStatus } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';

@Controller('photo-quotes')
export class PhotoQuotesController {
  constructor(
    private readonly photoQuotesService: PhotoQuotesService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Upload a photo for quote analysis (authenticated)
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Only image files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async createPhotoQuote(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreatePhotoQuoteDto,
  ) {
    if (!file) {
      throw new BadRequestException('Photo is required');
    }

    const tenantId = req.user?.tenantId;
    return this.photoQuotesService.createPhotoQuoteRequest(tenantId, file, dto);
  }

  /**
   * Public endpoint for customers to submit photo quotes
   */
  @Public()
  @Post('public/:tenantSlug')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Only image files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async createPublicPhotoQuote(
    @Param('tenantSlug') tenantSlug: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreatePhotoQuoteDto,
  ) {
    if (!file) {
      throw new BadRequestException('Photo is required');
    }

    if (!dto.customerPhone && !dto.customerEmail) {
      throw new BadRequestException('Phone or email is required');
    }

    const tenant = await this.prisma.withSystemContext(() =>
      this.prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true },
      }),
    );

    if (!tenant) {
      throw new NotFoundException('Business not found');
    }

    return this.prisma.withTenantContext(tenant.id, () =>
      this.photoQuotesService.createPhotoQuoteRequest(tenant.id, file, dto),
    );
  }

  /**
   * List photo quote requests (authenticated)
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async listPhotoQuotes(
    @Request() req,
    @Query('status') status?: PhotoQuoteStatus,
    @Query('limit') limit?: number,
  ) {
    const tenantId = req.user?.tenantId;
    return this.photoQuotesService.listPhotoQuotes(tenantId, {
      status,
      limit: limit ? +limit : undefined,
    });
  }

  /**
   * Get a single photo quote
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getPhotoQuote(@Param('id') id: string) {
    return this.photoQuotesService.getPhotoQuote(id);
  }

  /**
   * Public endpoint to view a photo quote result
   */
  @Public()
  @Get('view/:id')
  async viewPhotoQuote(@Param('id') id: string) {
    return this.prisma.withSystemContext(() =>
      this.photoQuotesService.getPhotoQuote(id),
    );
  }

  /**
   * Customer responds to a quote
   */
  @Public()
  @Post(':id/respond')
  async respondToQuote(
    @Param('id') id: string,
    @Body() body: { accepted: boolean; notes?: string },
  ) {
    return this.prisma.withSystemContext(() =>
      this.photoQuotesService.respondToQuote(id, body.accepted, body.notes),
    );
  }

  /**
   * Add staff notes
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/notes')
  async addStaffNotes(@Param('id') id: string, @Body() body: { notes: string }) {
    return this.photoQuotesService.addStaffNotes(id, body.notes);
  }

  /**
   * Convert to formal quote
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/convert')
  async convertToQuote(@Param('id') id: string, @Body() body: { quoteId: string }) {
    return this.photoQuotesService.convertToQuote(id, body.quoteId);
  }

  /**
   * Get historical pricing data
   */
  @UseGuards(JwtAuthGuard)
  @Get('pricing/historical')
  async getHistoricalPricing(@Request() req, @Query('serviceType') serviceType?: string) {
    const tenantId = req.user?.tenantId;
    return this.photoQuotesService.getHistoricalPricing(tenantId, serviceType);
  }
}

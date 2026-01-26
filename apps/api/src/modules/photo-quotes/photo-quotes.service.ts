import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../config/prisma/prisma.service';
import { StorageService } from '../../config/storage/storage.service';
import { PhotoComplexity, PhotoQuoteStatus } from '@prisma/client';

export const PHOTO_QUOTE_QUEUE = 'photo-quotes';

export interface PhotoAnalysisResult {
  issueDescription: string;
  suggestedService: string;
  complexity: PhotoComplexity;
  confidence: number;
  estimatedPriceMin: number;
  estimatedPriceMax: number;
  details: {
    identifiedIssues: string[];
    recommendedActions: string[];
    urgency: 'low' | 'medium' | 'high' | 'emergency';
    additionalNotes?: string;
  };
}

export interface CreatePhotoQuoteDto {
  customerPhone?: string;
  customerEmail?: string;
  customerId?: string;
  customerNotes?: string;
}

@Injectable()
export class PhotoQuotesService {
  private readonly logger = new Logger(PhotoQuotesService.name);
  private anthropic: Anthropic | null = null;
  private readonly isConfigured: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    @InjectQueue(PHOTO_QUOTE_QUEUE) private readonly photoQuoteQueue: Queue,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.isConfigured = !!apiKey && apiKey.length > 0;

    if (this.isConfigured && apiKey) {
      this.anthropic = new Anthropic({ apiKey });
      this.logger.log('Anthropic Claude Vision initialized');
    } else {
      this.logger.warn('Anthropic not configured - ANTHROPIC_API_KEY missing');
    }
  }

  /**
   * Upload a photo and create a quote request
   */
  async createPhotoQuoteRequest(
    tenantId: string,
    file: Express.Multer.File,
    dto: CreatePhotoQuoteDto,
  ) {
    // Upload photo to storage
    const uploadResult = await this.storageService.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      `photo-quotes/${tenantId}`,
    );

    // Create the quote request
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    const photoQuote = await this.prisma.photoQuoteRequest.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        customerNotes: dto.customerNotes,
        photoUrl: uploadResult.url,
        photoKey: uploadResult.key,
        status: 'PENDING',
        expiresAt,
      },
    });

    // Queue analysis job
    await this.photoQuoteQueue.add(
      'analyze-photo',
      {
        photoQuoteId: photoQuote.id,
        photoUrl: uploadResult.url,
        tenantId,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(`Created photo quote request: ${photoQuote.id}`);
    return photoQuote;
  }

  /**
   * Analyze a photo using Claude Vision
   */
  async analyzePhoto(photoQuoteId: string, photoUrl: string): Promise<PhotoAnalysisResult> {
    if (!this.anthropic) {
      throw new BadRequestException('AI analysis is not configured');
    }

    // Update status to analyzing
    await this.prisma.photoQuoteRequest.update({
      where: { id: photoQuoteId },
      data: { status: 'ANALYZING' },
    });

    try {
      // Get the photo data
      const imageData = await this.fetchImageAsBase64(photoUrl);

      // Call Claude Vision API
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageData.mediaType as any,
                  data: imageData.data,
                },
              },
              {
                type: 'text',
                text: this.getAnalysisPrompt(),
              },
            ],
          },
        ],
      });

      // Parse the response
      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from AI');
      }

      const analysis = this.parseAnalysisResponse(textContent.text);

      // Update the quote request with analysis results
      await this.prisma.photoQuoteRequest.update({
        where: { id: photoQuoteId },
        data: {
          status: 'READY',
          aiAnalysis: analysis as any,
          issueDescription: analysis.issueDescription,
          suggestedService: analysis.suggestedService,
          complexity: analysis.complexity,
          confidence: analysis.confidence,
          estimatedPriceMin: analysis.estimatedPriceMin,
          estimatedPriceMax: analysis.estimatedPriceMax,
        },
      });

      this.logger.log(`Photo analysis complete: ${photoQuoteId}`);
      return analysis;
    } catch (error) {
      this.logger.error(`Photo analysis failed: ${error.message}`);

      await this.prisma.photoQuoteRequest.update({
        where: { id: photoQuoteId },
        data: {
          status: 'PENDING',
          aiAnalysis: { error: error.message },
        },
      });

      throw error;
    }
  }

  /**
   * Get a photo quote request by ID
   */
  async getPhotoQuote(id: string) {
    const quote = await this.prisma.photoQuoteRequest.findUnique({
      where: { id },
    });

    if (quote && !quote.viewedAt) {
      await this.prisma.photoQuoteRequest.update({
        where: { id },
        data: { viewedAt: new Date() },
      });
    }

    return quote;
  }

  /**
   * List photo quote requests for a tenant
   */
  async listPhotoQuotes(
    tenantId: string,
    options?: { status?: PhotoQuoteStatus; limit?: number },
  ) {
    return this.prisma.photoQuoteRequest.findMany({
      where: {
        tenantId,
        ...(options?.status && { status: options.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  /**
   * Customer responds to a quote
   */
  async respondToQuote(id: string, accepted: boolean, notes?: string) {
    return this.prisma.photoQuoteRequest.update({
      where: { id },
      data: {
        status: accepted ? 'ACCEPTED' : 'REJECTED',
        respondedAt: new Date(),
        ...(notes && { customerNotes: notes }),
      },
    });
  }

  /**
   * Convert photo quote to formal quote
   */
  async convertToQuote(photoQuoteId: string, quoteId: string) {
    return this.prisma.photoQuoteRequest.update({
      where: { id: photoQuoteId },
      data: {
        status: 'CONVERTED',
        convertedToQuote: quoteId,
      },
    });
  }

  /**
   * Add staff notes to a photo quote
   */
  async addStaffNotes(id: string, notes: string) {
    return this.prisma.photoQuoteRequest.update({
      where: { id },
      data: { staffNotes: notes },
    });
  }

  /**
   * Get pricing data from historical quotes for estimation
   */
  async getHistoricalPricing(tenantId: string, serviceType?: string) {
    const quotes = await this.prisma.quote.findMany({
      where: {
        tenantId,
        status: 'ACCEPTED',
        ...(serviceType && {
          description: { contains: serviceType, mode: 'insensitive' },
        }),
      },
      select: { amount: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (quotes.length === 0) {
      return { avg: 150, min: 75, max: 300 }; // Default fallback
    }

    const amounts = quotes.map((q) => q.amount);
    return {
      avg: amounts.reduce((a, b) => a + b, 0) / amounts.length,
      min: Math.min(...amounts),
      max: Math.max(...amounts),
    };
  }

  private async fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: string }> {
    // For S3/external URLs, fetch the image
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return {
      data: buffer.toString('base64'),
      mediaType: contentType,
    };
  }

  private getAnalysisPrompt(): string {
    return `You are an expert service technician analyzing a photo for a quote request.

Analyze this image and provide a detailed assessment in the following JSON format:

{
  "issueDescription": "Brief description of the visible issue or problem",
  "suggestedService": "Type of service needed (e.g., 'HVAC Repair', 'Plumbing Fix', 'Electrical Work')",
  "complexity": "SIMPLE | MEDIUM | COMPLEX | REQUIRES_INSPECTION",
  "confidence": 0.0-1.0 (how confident you are in this assessment),
  "estimatedPriceMin": minimum price estimate in USD,
  "estimatedPriceMax": maximum price estimate in USD,
  "identifiedIssues": ["list", "of", "specific", "issues", "visible"],
  "recommendedActions": ["list", "of", "recommended", "repair", "steps"],
  "urgency": "low | medium | high | emergency",
  "additionalNotes": "Any other relevant observations"
}

Guidelines:
- If you cannot clearly identify the issue, set complexity to "REQUIRES_INSPECTION" and confidence below 0.5
- Price estimates should be realistic for the US market
- For SIMPLE issues: $50-$150, MEDIUM: $100-$400, COMPLEX: $300-$1500+
- Be conservative with estimates - it's better to under-promise
- If the image is unclear or not related to home services, indicate this in additionalNotes

Respond ONLY with valid JSON, no additional text.`;
  }

  private parseAnalysisResponse(text: string): PhotoAnalysisResult {
    try {
      // Extract JSON from the response (in case there's any wrapper text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize the response
      return {
        issueDescription: parsed.issueDescription || 'Unable to determine issue',
        suggestedService: parsed.suggestedService || 'General Inspection',
        complexity: this.normalizeComplexity(parsed.complexity),
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        estimatedPriceMin: parsed.estimatedPriceMin || 100,
        estimatedPriceMax: parsed.estimatedPriceMax || 300,
        details: {
          identifiedIssues: parsed.identifiedIssues || [],
          recommendedActions: parsed.recommendedActions || [],
          urgency: parsed.urgency || 'medium',
          additionalNotes: parsed.additionalNotes,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${error.message}`);
      // Return a default response
      return {
        issueDescription: 'Analysis could not be completed',
        suggestedService: 'General Inspection',
        complexity: 'REQUIRES_INSPECTION',
        confidence: 0,
        estimatedPriceMin: 75,
        estimatedPriceMax: 200,
        details: {
          identifiedIssues: [],
          recommendedActions: ['Schedule an in-person inspection'],
          urgency: 'medium',
          additionalNotes: 'AI analysis was unable to process the image properly',
        },
      };
    }
  }

  private normalizeComplexity(complexity: string): PhotoComplexity {
    const normalized = (complexity || '').toUpperCase().replace(/[^A-Z_]/g, '');
    const validValues: PhotoComplexity[] = ['SIMPLE', 'MEDIUM', 'COMPLEX', 'REQUIRES_INSPECTION'];

    if (validValues.includes(normalized as PhotoComplexity)) {
      return normalized as PhotoComplexity;
    }
    return 'MEDIUM';
  }
}

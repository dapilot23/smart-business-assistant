import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../config/prisma/prisma.service';
import { InferenceEngineService, InferenceResult } from './inference-engine.service';
import { InterviewFlowService } from './interview-flow.service';
import { Prisma } from '@prisma/client';

export const EXTRACTION_QUEUE = 'onboarding-extraction';

export interface ExtractionJobData {
  conversationId: string;
  questionId: string;
  userResponse: string;
  tenantId: string;
}

export interface ExtractionJobResult {
  success: boolean;
  extractions: InferenceResult[];
  profileUpdated: boolean;
}

@Processor(EXTRACTION_QUEUE)
export class ExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExtractionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inferenceEngine: InferenceEngineService,
    private readonly flowService: InterviewFlowService,
  ) {
    super();
  }

  async process(job: Job<ExtractionJobData>): Promise<ExtractionJobResult> {
    const { conversationId, questionId, userResponse, tenantId } = job.data;

    this.logger.debug(`Processing extraction job for conversation ${conversationId}`);

    try {
      return await this.prisma.withTenantContext(tenantId, async () => {
        // Get conversation and existing data
        const conversation = await this.prisma.onboardingConversation.findUnique({
          where: { id: conversationId },
          include: { businessProfile: true },
        });

        if (!conversation) {
          throw new Error('Conversation not found');
        }

        const existingData = (conversation.extractedData as Record<string, unknown>) || {};

        // Get target fields for this question
        const targetFields = this.inferenceEngine.getTargetFields(questionId);

        // Run extraction with inference
        const extractions = await this.inferenceEngine.extractWithInference({
          questionId,
          userResponse,
          targetFields,
          existingData,
          industry: existingData.industry as string | undefined,
        });

        // Filter high-confidence extractions
        const validExtractions = extractions.filter((e) => e.confidence >= 0.6);

        if (validExtractions.length === 0) {
          return {
            success: true,
            extractions: [],
            profileUpdated: false,
          };
        }

        // Merge into existing data
        const updatedData = { ...existingData };
        for (const extraction of validExtractions) {
          updatedData[extraction.field] = extraction.value;
        }

        // Update conversation with extracted data
        await this.prisma.onboardingConversation.update({
          where: { id: conversationId },
          data: {
            extractedData: updatedData as unknown as Prisma.JsonObject,
          },
        });

        // Update business profile with mapped fields
        const profileUpdate = this.mapExtractionsToProfile(validExtractions);
        if (Object.keys(profileUpdate).length > 0) {
          await this.prisma.businessProfile.update({
            where: { id: conversation.businessProfileId },
            data: profileUpdate,
          });
        }

        this.logger.debug(
          `Extracted ${validExtractions.length} fields for conversation ${conversationId}`,
        );

        return {
          success: true,
          extractions: validExtractions,
          profileUpdated: Object.keys(profileUpdate).length > 0,
        };
      });
    } catch (error) {
      this.logger.error(`Extraction job failed for conversation ${conversationId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Map extraction results to BusinessProfile fields
   */
  private mapExtractionsToProfile(
    extractions: InferenceResult[],
  ): Partial<Prisma.BusinessProfileUpdateInput> {
    const update: Partial<Prisma.BusinessProfileUpdateInput> = {};

    for (const extraction of extractions) {
      const { field, value } = extraction;

      // String fields
      const stringFields = [
        'industry',
        'businessDescription',
        'targetMarket',
        'serviceArea',
        'revenueRange',
        'pricingModel',
        'pricingPosition',
        'ownerRole',
        'topLeadSource',
        'communicationStyle',
        'growthStage',
        'revenueGoal',
        'competitiveAdvantage',
        'marketPosition',
        'timezone',
      ];

      if (stringFields.includes(field)) {
        (update as Record<string, unknown>)[field] = String(value);
        continue;
      }

      // Number fields
      const numberFields = [
        'yearsInBusiness',
        'serviceAreaRadius',
        'repeatCustomerPercent',
        'teamSize',
        'jobsPerWeek',
      ];

      if (numberFields.includes(field)) {
        (update as Record<string, unknown>)[field] = Number(value);
        continue;
      }

      // Boolean fields
      const booleanFields = ['hasFieldTechnicians', 'hasOfficeStaff'];

      if (booleanFields.includes(field)) {
        (update as Record<string, unknown>)[field] = Boolean(value);
        continue;
      }

      // Decimal fields
      if (field === 'averageJobValue') {
        update.averageJobValue = Number(value);
        continue;
      }

      // JSON/Array fields
      const jsonFields = [
        'leadSources',
        'preferredChannels',
        'primaryGoals',
        'currentChallenges',
        'peakSeasons',
        'busyDays',
        'uniqueSellingPoints',
        'knownCompetitors',
        'winReasons',
        'loseReasons',
        'slowSeasons',
        'currentTools',
      ];

      if (jsonFields.includes(field)) {
        (update as Record<string, unknown>)[field] = value;
        continue;
      }
    }

    return update;
  }
}

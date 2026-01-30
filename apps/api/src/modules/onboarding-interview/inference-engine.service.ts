import { Injectable, Logger } from '@nestjs/common';
import { AiEngineService } from '../ai-engine/ai-engine.service';

export interface InferenceResult {
  field: string;
  value: unknown;
  confidence: number;
  source: 'explicit' | 'inferred';
  reasoning?: string;
}

export interface ExtractWithInferenceOptions {
  questionId: string;
  userResponse: string;
  targetFields: string[];
  existingData: Record<string, unknown>;
  industry?: string;
}

// Industry-specific inference rules
const INDUSTRY_DEFAULTS: Record<string, Record<string, unknown>> = {
  plumbing: {
    hasFieldTechnicians: true,
    emergencyMix: 0.3,
    typicalPeakMonths: [5, 6, 7, 8],
  },
  hvac: {
    hasFieldTechnicians: true,
    emergencyMix: 0.25,
    typicalPeakMonths: [6, 7, 8, 12, 1],
  },
  landscaping: {
    hasFieldTechnicians: true,
    emergencyMix: 0.05,
    typicalPeakMonths: [4, 5, 6, 9, 10],
  },
  electrical: {
    hasFieldTechnicians: true,
    emergencyMix: 0.2,
    typicalPeakMonths: [6, 7, 8],
  },
};

// Keywords that indicate specific values
const KEYWORD_MAPPINGS: Record<string, Record<string, unknown>> = {
  // Team size indicators
  'just me': { teamSize: 1, hasOfficeStaff: false },
  solo: { teamSize: 1, hasOfficeStaff: false },
  'one man': { teamSize: 1, hasOfficeStaff: false },
  'small team': { teamSize: 3 },
  'growing team': { teamSize: 5, growthStage: 'growth' },

  // Target market indicators
  residential: { targetMarket: 'residential' },
  commercial: { targetMarket: 'commercial' },
  homeowners: { targetMarket: 'residential' },
  businesses: { targetMarket: 'commercial' },
  'both residential and commercial': { targetMarket: 'both' },

  // Pricing indicators
  'flat rate': { pricingModel: 'flat_rate' },
  hourly: { pricingModel: 'hourly' },
  'by the job': { pricingModel: 'flat_rate' },
  'time and materials': { pricingModel: 'hourly' },

  // Growth stage indicators
  'just started': { growthStage: 'startup', yearsInBusiness: 1 },
  established: { growthStage: 'established' },
  'been doing this for years': { growthStage: 'established' },
  expanding: { growthStage: 'growth' },
  scaling: { growthStage: 'growth' },
};

@Injectable()
export class InferenceEngineService {
  private readonly logger = new Logger(InferenceEngineService.name);

  constructor(private readonly aiEngine: AiEngineService) {}

  /**
   * Extract explicit fields and infer additional fields from user response
   */
  async extractWithInference(
    opts: ExtractWithInferenceOptions,
  ): Promise<InferenceResult[]> {
    const results: InferenceResult[] = [];
    const normalizedResponse = opts.userResponse.toLowerCase();

    // 1. Apply keyword-based extraction (fast, no API call)
    const keywordResults = this.applyKeywordMappings(
      normalizedResponse,
      opts.targetFields,
    );
    results.push(...keywordResults);

    // 2. Apply industry defaults for inferred fields
    if (opts.industry) {
      const industryResults = this.applyIndustryDefaults(
        opts.industry,
        opts.targetFields,
        opts.existingData,
      );
      results.push(...industryResults);
    }

    // 3. Use AI for complex extraction if needed
    const remainingFields = opts.targetFields.filter(
      (f) => !results.some((r) => r.field === f),
    );

    if (remainingFields.length > 0 && this.aiEngine.isReady()) {
      try {
        const aiResults = await this.extractWithAi(
          opts.userResponse,
          remainingFields,
          opts.existingData,
        );
        results.push(...aiResults);
      } catch (error) {
        this.logger.warn('AI extraction failed, using fallbacks', {
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    // 4. Apply cross-field inference
    const inferredResults = this.applyCrossFieldInference(
      results,
      opts.existingData,
    );
    results.push(...inferredResults);

    return results;
  }

  /**
   * Get target fields for a question (explicit + infer fields)
   */
  getTargetFields(questionId: string): string[] {
    // This would be called from the flow service
    // For now, return common fields based on question patterns
    const questionFieldMap: Record<string, string[]> = {
      business_intro: [
        'industry',
        'businessDescription',
        'targetMarket',
        'yearsInBusiness',
        'teamSize',
      ],
      location: ['serviceArea', 'serviceAreaRadius', 'timezone'],
      operations: [
        'jobsPerWeek',
        'teamSize',
        'averageJobValue',
        'hasFieldTechnicians',
      ],
      customers: [
        'leadSources',
        'topLeadSource',
        'preferredChannels',
        'communicationStyle',
      ],
      business_health: [
        'primaryGoals',
        'currentChallenges',
        'growthStage',
        'revenueRange',
      ],
      competition: [
        'knownCompetitors',
        'winReasons',
        'uniqueSellingPoints',
        'competitiveAdvantage',
      ],
      pricing: [
        'averageJobValue',
        'pricingModel',
        'pricingPosition',
        'revenueRange',
      ],
      vision: ['revenueGoal', 'primaryGoals', 'growthStage'],
    };

    return questionFieldMap[questionId] || [];
  }

  private applyKeywordMappings(
    response: string,
    targetFields: string[],
  ): InferenceResult[] {
    const results: InferenceResult[] = [];

    for (const [keyword, values] of Object.entries(KEYWORD_MAPPINGS)) {
      if (response.includes(keyword)) {
        for (const [field, value] of Object.entries(values)) {
          if (targetFields.includes(field)) {
            results.push({
              field,
              value,
              confidence: 0.85,
              source: 'explicit',
              reasoning: `Keyword match: "${keyword}"`,
            });
          }
        }
      }
    }

    // Extract numbers for specific fields
    const numberMatch = response.match(/(\d+)\s*(jobs?|projects?)\s*(per|a)\s*week/i);
    if (numberMatch && targetFields.includes('jobsPerWeek')) {
      results.push({
        field: 'jobsPerWeek',
        value: parseInt(numberMatch[1], 10),
        confidence: 0.9,
        source: 'explicit',
        reasoning: 'Numeric extraction from response',
      });
    }

    // Extract dollar amounts
    const moneyMatch = response.match(/\$?([\d,]+)\s*(average|per job|typically)/i);
    if (moneyMatch && targetFields.includes('averageJobValue')) {
      const value = parseInt(moneyMatch[1].replace(/,/g, ''), 10);
      if (value > 0 && value < 100000) {
        results.push({
          field: 'averageJobValue',
          value,
          confidence: 0.9,
          source: 'explicit',
          reasoning: 'Dollar amount extraction',
        });
      }
    }

    // Extract radius/distance
    const radiusMatch = response.match(/(\d+)\s*(mile|km)/i);
    if (radiusMatch && targetFields.includes('serviceAreaRadius')) {
      results.push({
        field: 'serviceAreaRadius',
        value: parseInt(radiusMatch[1], 10),
        confidence: 0.85,
        source: 'explicit',
        reasoning: 'Distance extraction',
      });
    }

    return results;
  }

  private applyIndustryDefaults(
    industry: string,
    targetFields: string[],
    existingData: Record<string, unknown>,
  ): InferenceResult[] {
    const results: InferenceResult[] = [];
    const defaults = INDUSTRY_DEFAULTS[industry.toLowerCase()];

    if (!defaults) return results;

    for (const [field, value] of Object.entries(defaults)) {
      if (targetFields.includes(field) && existingData[field] === undefined) {
        results.push({
          field,
          value,
          confidence: 0.6,
          source: 'inferred',
          reasoning: `Industry default for ${industry}`,
        });
      }
    }

    return results;
  }

  private async extractWithAi(
    response: string,
    fields: string[],
    existingData: Record<string, unknown>,
  ): Promise<InferenceResult[]> {
    const result = await this.aiEngine.analyze<{
      extractions: Array<{
        field: string;
        value: unknown;
        confidence: number;
        reasoning: string;
      }>;
    }>({
      template: 'onboarding.extract-fields',
      variables: {
        userResponse: response,
        fieldsToExtract: fields.join(', '),
        existingProfile: JSON.stringify(existingData),
      },
      tenantId: 'system',
      feature: 'onboarding-inference',
    });

    return (result.data.extractions || []).map((e) => ({
      field: e.field,
      value: e.value,
      confidence: e.confidence,
      source: 'explicit' as const,
      reasoning: e.reasoning,
    }));
  }

  private applyCrossFieldInference(
    results: InferenceResult[],
    existingData: Record<string, unknown>,
  ): InferenceResult[] {
    const inferred: InferenceResult[] = [];
    const allData = { ...existingData };

    // Merge results into allData for inference
    for (const r of results) {
      allData[r.field] = r.value;
    }

    // Infer hasFieldTechnicians from teamSize
    if (
      allData.teamSize &&
      typeof allData.teamSize === 'number' &&
      allData.hasFieldTechnicians === undefined
    ) {
      inferred.push({
        field: 'hasFieldTechnicians',
        value: allData.teamSize > 1,
        confidence: 0.7,
        source: 'inferred',
        reasoning: `Inferred from team size of ${allData.teamSize}`,
      });
    }

    // Infer growthStage from revenue goal
    if (allData.revenueGoal && allData.growthStage === undefined) {
      const goal = String(allData.revenueGoal).toLowerCase();
      let stage = 'established';
      if (goal.includes('double') || goal.includes('2x') || goal.includes('grow')) {
        stage = 'growth';
      } else if (goal.includes('maintain') || goal.includes('stable')) {
        stage = 'established';
      }
      inferred.push({
        field: 'growthStage',
        value: stage,
        confidence: 0.65,
        source: 'inferred',
        reasoning: 'Inferred from revenue goal',
      });
    }

    // Infer revenueRange from averageJobValue and jobsPerWeek
    if (
      allData.averageJobValue &&
      allData.jobsPerWeek &&
      allData.revenueRange === undefined
    ) {
      const avgJob = Number(allData.averageJobValue);
      const jobsWeek = Number(allData.jobsPerWeek);
      const annualEstimate = avgJob * jobsWeek * 50; // 50 working weeks

      let range = 'under_100k';
      if (annualEstimate >= 1000000) range = 'over_1m';
      else if (annualEstimate >= 500000) range = '500k_1m';
      else if (annualEstimate >= 250000) range = '250k_500k';
      else if (annualEstimate >= 100000) range = '100k_250k';

      inferred.push({
        field: 'revenueRange',
        value: range,
        confidence: 0.6,
        source: 'inferred',
        reasoning: `Estimated from $${avgJob}/job x ${jobsWeek} jobs/week`,
      });
    }

    return inferred;
  }
}

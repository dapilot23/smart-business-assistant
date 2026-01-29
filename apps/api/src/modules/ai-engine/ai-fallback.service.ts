import { Injectable, Logger } from '@nestjs/common';

/**
 * Defines fallback behavior when AI calls fail.
 * Ensures features degrade gracefully instead of breaking entirely.
 */

export type FallbackBehavior =
  | 'USE_DEFAULT' // Use default/neutral value
  | 'USE_TEMPLATE' // Fall back to static template
  | 'USE_RULES' // Use rule-based logic instead of AI
  | 'HOLD_FOR_HUMAN' // Queue for human review, don't auto-respond
  | 'SHOW_RAW_DATA' // Show data without AI interpretation
  | 'FAIL_GRACEFULLY'; // Log and return error message

export interface FallbackConfig {
  behavior: FallbackBehavior;
  defaultData?: unknown;
  templateKey?: string;
  ruleLogic?: string;
  message?: string;
  impact?: string;
}

export interface FallbackResult<T = unknown> {
  fallback: true;
  behavior: FallbackBehavior;
  data: T | null;
  message?: string;
}

const FALLBACK_CONFIG: Record<string, FallbackConfig> = {
  // Sprint 7.1: Quote follow-up
  'quote.score-conversion': {
    behavior: 'USE_DEFAULT',
    defaultData: { conversionProbability: 0.5, riskLevel: 'MEDIUM' },
    impact: 'Uses standard 4-step sequence instead of AI-optimized',
  },
  'quote.generate-followup': {
    behavior: 'USE_TEMPLATE',
    templateKey: 'QUOTE_FOLLOWUP_STEP_{step}',
    impact: 'Generic message instead of personalized',
  },
  'quote.predict-objections': {
    behavior: 'USE_DEFAULT',
    defaultData: { likelyObjections: [] },
    impact: 'No objection prediction, standard follow-up',
  },

  // Sprint 7.2: Payment
  'payment.predict-behavior': {
    behavior: 'USE_DEFAULT',
    defaultData: {
      onTimePaymentProbability: 0.7,
      riskLevel: 'MEDIUM',
      recommendedTerms: 'net-30',
    },
    impact: 'Standard payment terms, no deposit recommendation',
  },
  'payment.calibrate-tone': {
    behavior: 'USE_DEFAULT',
    defaultData: { tone: 'professional' },
    impact: 'Standard professional tone for all reminders',
  },
  'payment.forecast-cashflow': {
    behavior: 'SHOW_RAW_DATA',
    message: 'Cash flow forecast temporarily unavailable. Showing raw invoice data.',
    impact: 'User sees invoice list instead of forecast',
  },

  // Sprint 7.3: No-show
  'noshow.score-risk': {
    behavior: 'USE_RULES',
    ruleLogic: 'noShowCount >= 2 ? HIGH : noShowCount >= 1 ? MEDIUM : LOW',
    defaultData: { noShowProbability: 0.2, riskLevel: 'LOW' },
    impact: 'Rule-based scoring instead of AI prediction',
  },
  'noshow.craft-reminder': {
    behavior: 'USE_TEMPLATE',
    templateKey: 'APPOINTMENT_REMINDER_DEFAULT',
    impact: 'Generic reminder instead of personalized',
  },

  // Sprint 7.4: Reviews
  'review.generate-request': {
    behavior: 'USE_TEMPLATE',
    templateKey: 'REVIEW_REQUEST_DEFAULT',
    impact: 'Generic review request',
  },
  'review.draft-response': {
    behavior: 'HOLD_FOR_HUMAN',
    message: 'AI review response unavailable. Queued for manual review.',
    impact: 'Review response delayed until human writes it',
  },
  'review.analyze-themes': {
    behavior: 'SHOW_RAW_DATA',
    message: 'Theme analysis unavailable. Showing raw reviews.',
    impact: 'No AI insights, just review list',
  },

  // Sprint 7.5: Retention
  'retention.predict-churn': {
    behavior: 'USE_RULES',
    ruleLogic: 'daysSinceLastVisit > 90 ? HIGH : daysSinceLastVisit > 60 ? MEDIUM : LOW',
    defaultData: { churnProbability: 0.3, riskLevel: 'MEDIUM' },
    impact: 'Simple time-based churn detection',
  },
  'retention.generate-winback': {
    behavior: 'USE_TEMPLATE',
    templateKey: 'WINBACK_MESSAGE_DEFAULT',
    impact: 'Generic win-back message',
  },

  // Sprint 7.6: Dispatch
  'dispatch.estimate-duration': {
    behavior: 'USE_DEFAULT',
    defaultData: { estimatedMinutes: 60, confidenceRange: { min: 45, max: 90 } },
    impact: 'Uses average job duration instead of AI prediction',
  },
  'dispatch.suggest-upsell': {
    behavior: 'USE_DEFAULT',
    defaultData: { upsellOpportunities: [] },
    impact: 'No upsell suggestions',
  },
  'dispatch.predict-parts': {
    behavior: 'USE_DEFAULT',
    defaultData: { recommendedParts: [], loadingList: [] },
    impact: 'No parts prediction, technician uses standard loadout',
  },

  // Sprint 7.7: Communication
  'comms.classify-intent': {
    behavior: 'USE_DEFAULT',
    defaultData: { intent: 'OTHER', sentiment: 'NEUTRAL' },
    impact: 'Message queued for human classification',
  },
  'comms.generate-response': {
    behavior: 'HOLD_FOR_HUMAN',
    message: 'Auto-response unavailable. Message queued for human reply.',
    impact: 'No auto-response, delayed human response',
  },
  'comms.summarize-conversation': {
    behavior: 'USE_DEFAULT',
    defaultData: { summary: 'Conversation summary unavailable' },
    impact: 'No AI summary',
  },

  // Sprint 7.8: Copilot
  'copilot.answer-question': {
    behavior: 'SHOW_RAW_DATA',
    message: 'AI analysis temporarily unavailable. Here is the raw data:',
    impact: 'User sees data tables instead of natural language summary',
  },
  'copilot.weekly-report': {
    behavior: 'SHOW_RAW_DATA',
    message: 'AI report generation unavailable. Showing raw metrics.',
    impact: 'Raw metrics instead of narrative report',
  },
  'copilot.anomaly-detection': {
    behavior: 'USE_DEFAULT',
    defaultData: { anomalies: [] },
    impact: 'No anomaly detection this cycle',
  },

  // Visual AI (Sprint 7.6 enhancement)
  'job-vision.quality-check': {
    behavior: 'USE_DEFAULT',
    defaultData: { qualityScore: 80, passesInspection: true, issuesDetected: [] },
    impact: 'No AI quality check, assumes pass',
  },
  'job-vision.generate-report': {
    behavior: 'USE_TEMPLATE',
    templateKey: 'JOB_REPORT_DEFAULT',
    impact: 'Generic job report without AI insights',
  },
};

@Injectable()
export class AiFallbackService {
  private readonly logger = new Logger(AiFallbackService.name);

  /**
   * Get fallback configuration for a template
   */
  getFallback(template: string): FallbackConfig {
    return (
      FALLBACK_CONFIG[template] || {
        behavior: 'FAIL_GRACEFULLY',
        message: 'AI service temporarily unavailable',
      }
    );
  }

  /**
   * Execute fallback and return result
   */
  executeFallback<T>(
    template: string,
    context?: Record<string, unknown>,
  ): FallbackResult<T> {
    const config = this.getFallback(template);

    this.logger.warn(
      `AI fallback activated for ${template}: ${config.behavior}`,
      { impact: config.impact },
    );

    switch (config.behavior) {
      case 'USE_DEFAULT':
        return {
          fallback: true,
          behavior: config.behavior,
          data: config.defaultData as T,
        };

      case 'USE_TEMPLATE':
        return {
          fallback: true,
          behavior: config.behavior,
          data: null,
          message: `Using template: ${config.templateKey}`,
        };

      case 'USE_RULES':
        // Rule-based fallback could be expanded with actual logic
        return {
          fallback: true,
          behavior: config.behavior,
          data: config.defaultData as T,
          message: `Using rule: ${config.ruleLogic}`,
        };

      case 'HOLD_FOR_HUMAN':
        return {
          fallback: true,
          behavior: config.behavior,
          data: null,
          message: config.message || 'Queued for human review',
        };

      case 'SHOW_RAW_DATA':
        return {
          fallback: true,
          behavior: config.behavior,
          data: (context?.rawData as T) || null,
          message: config.message,
        };

      case 'FAIL_GRACEFULLY':
      default:
        return {
          fallback: true,
          behavior: 'FAIL_GRACEFULLY',
          data: null,
          message: config.message || 'AI service temporarily unavailable',
        };
    }
  }

  /**
   * Check if a template has fallback configured
   */
  hasFallback(template: string): boolean {
    return template in FALLBACK_CONFIG;
  }

  /**
   * Get all configured fallbacks (for monitoring/debugging)
   */
  listFallbacks(): Record<string, FallbackConfig> {
    return { ...FALLBACK_CONFIG };
  }
}

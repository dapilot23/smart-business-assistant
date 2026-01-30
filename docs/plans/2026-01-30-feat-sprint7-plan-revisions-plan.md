# Sprint 7 Plan: Comprehensive Revisions & Groundbreaking Enhancements

> **Author:** Claude Opus 4.5 | **Date:** 2026-01-30
> **Purpose:** Transform the Sprint 7 plan from a solid automation system to a market-leading, AI-native platform that fundamentally differentiates from competitors.

---

## Executive Summary

After thorough analysis of the Sprint 7 plan against current AI-native SaaS best practices (2025-2026) and the existing codebase patterns, I've identified **14 architectural improvements**, **8 groundbreaking new features**, and **3 items to remove or significantly modify**. The core insight: the current plan builds excellent automation, but misses opportunities to create truly differentiated AI experiences.

### Key Themes

1. **Multi-Model Intelligence** - Current plan uses only Claude; modern architecture routes tasks to optimal models for cost/performance
2. **Proactive Before Reactive** - The platform should anticipate needs, not just respond to events
3. **Cross-Tenant Learning** - Anonymized patterns across all tenants make every business smarter
4. **Natural Language as Primary Interface** - Everything queryable in plain English
5. **Agentic Workflows** - AI that orchestrates multi-step processes autonomously

---

## Part 1: Architecture Improvements

### 1.1 Multi-Model Cascade Architecture

**Problem:** The plan uses Claude for everything, which is expensive and slow for simple tasks.

**Solution:** Intelligent model routing based on task complexity.

**Rationale:** Research shows model cascading reduces costs by 26-70% while maintaining accuracy. Your codebase already has `CLAUDE_MODELS` constants - extend this to actual routing logic.

```diff
## Sprint 7.0: AI Engine Foundation

-**Files to create:**
+**Files to create/modify:**
 - `apps/api/src/modules/ai-engine/ai-engine.module.ts` - Module definition
 - `apps/api/src/modules/ai-engine/ai-engine.service.ts` - Central Claude API wrapper
+- `apps/api/src/modules/ai-engine/model-router.service.ts` - Intelligent model selection
 - `apps/api/src/modules/ai-engine/prompt-templates.ts` - All AI prompt templates
 - `apps/api/src/modules/ai-engine/ai-cost-tracker.service.ts` - Token usage tracking
 - `apps/api/src/modules/ai-engine/ai-feedback.service.ts` - Track accept/edit/reject of AI outputs
+- `apps/api/src/modules/ai-engine/ai-cache.service.ts` - Multi-layer semantic caching
+- `apps/api/src/modules/ai-engine/ai-stream.gateway.ts` - WebSocket gateway for streaming

+### Model Routing Strategy
+
+```typescript
+// Template-to-model mapping (extend existing CLAUDE_MODELS)
+const MODEL_ROUTING = {
+  // Fast/Cheap (Claude Haiku, GPT-4o-mini)
+  simple: [
+    'comms.classify-intent',
+    'comms.classify-sentiment',
+    'noshow.score-risk',        // Numerical scoring
+    'payment.predict-behavior', // Pattern matching
+  ],
+
+  // Balanced (Claude Sonnet)
+  standard: [
+    'quote.score-conversion',
+    'review.analyze-themes',
+    'retention.predict-churn',
+    'dispatch.estimate-duration',
+  ],
+
+  // Premium (Claude Opus) - Customer-facing text generation
+  premium: [
+    'quote.generate-followup',
+    'comms.generate-response',
+    'review.generate-request',
+    'copilot.answer-question',
+  ],
+};
+
+// Cascade with confidence-based escalation
+class ModelRouter {
+  async route(template: string, input: any): Promise<ModelSelection> {
+    const tier = this.getTemplateTier(template);
+
+    if (tier === 'simple') {
+      const result = await this.tryModel('haiku', template, input);
+      if (result.confidence > 0.85) return result;
+      // Escalate to sonnet
+      return this.tryModel('sonnet', template, input);
+    }
+
+    return this.tryModel(tier === 'premium' ? 'opus' : 'sonnet', template, input);
+  }
+}
+```
+
+**Cost Impact Estimate:**
+| Scenario | Before (All Sonnet) | After (Cascaded) | Savings |
+|----------|---------------------|------------------|---------|
+| 10K daily classifications | $30/day | $2.50/day | 92% |
+| 2K daily messages | $6/day | $4/day | 33% |
+| Monthly total | ~$1,100 | ~$350 | 68% |
```

---

### 1.2 Multi-Layer Semantic Caching

**Problem:** The plan mentions caching but doesn't specify architecture. Simple key-based caching misses semantically similar queries.

**Solution:** Three-layer caching: exact match → semantic similarity → provider prefix cache.

**Rationale:** Research shows combined caching strategies reduce costs by 50-90%.

```diff
-### 3. `AiCostTrackerService` — Usage & Cost Monitoring
+### 3. `AiCacheService` — Multi-Layer Intelligent Caching
+
+```typescript
+class AiCacheService {
+  // Layer 1: Exact match (existing Redis)
+  private exactCache: Redis;
+
+  // Layer 2: Semantic similarity (new)
+  private vectorStore: PgVector; // Use existing PostgreSQL with pgvector
+  private embeddings: OpenAIEmbeddings; // Cheap embeddings model
+
+  async getCached(template: string, variables: object): Promise<CacheResult | null> {
+    const exactKey = this.buildExactKey(template, variables);
+
+    // Layer 1: Exact match
+    const exact = await this.exactCache.get(exactKey);
+    if (exact) return { source: 'exact', data: exact };
+
+    // Layer 2: Semantic similarity (for text-heavy inputs)
+    if (this.isSemanticCandidate(template)) {
+      const embedding = await this.embed(JSON.stringify(variables));
+      const similar = await this.vectorStore.findSimilar(embedding, 0.92);
+      if (similar) return { source: 'semantic', data: similar };
+    }
+
+    return null; // Layer 3 (provider prefix) handled by Anthropic SDK
+  }
+
+  private isSemanticCandidate(template: string): boolean {
+    // Templates where semantic similarity makes sense
+    return ['quote.generate-followup', 'comms.generate-response',
+            'review.generate-request'].includes(template);
+  }
+}
+```
+
+**Schema Addition:**
+```prisma
+model AiSemanticCache {
+  id         String   @id @default(uuid())
+  tenantId   String?  // null for cross-tenant cache
+  template   String
+  inputHash  String
+  embedding  Unsupported("vector(1536)")
+  response   String   @db.Text
+  hitCount   Int      @default(0)
+  createdAt  DateTime @default(now())
+  expiresAt  DateTime
+  @@index([template])
+}
+```

+### 4. `AiCostTrackerService` — Usage & Cost Monitoring
```

---

### 1.3 Streaming AI Responses (SSE-First)

**Problem:** The plan's Copilot section doesn't address real-time streaming, which is critical for chat UX.

**Solution:** Add SSE streaming with WebSocket fallback for complex agent workflows.

**Rationale:** Research shows SSE is the recommended default for AI chat in 2025 - simpler, more scalable, native browser support.

```diff
 ## Sprint 7.8: AI Business Copilot (NEW — The Crown Jewel)

-**Files to create:**
+**Files to create:**
 - `apps/api/src/modules/ai-copilot/ai-copilot.module.ts`
 - `apps/api/src/modules/ai-copilot/ai-copilot.service.ts` - Query orchestrator
+- `apps/api/src/modules/ai-copilot/ai-copilot.controller.ts` - REST + SSE endpoints
+- `apps/api/src/modules/ai-copilot/copilot-stream.gateway.ts` - WebSocket for cancellation
 - `apps/api/src/modules/ai-copilot/copilot-tools.ts` - Database query functions for Claude tool use
-- `apps/api/src/modules/ai-copilot/ai-copilot.controller.ts`
 - `apps/api/src/modules/ai-copilot/weekly-report.service.ts` - Auto-generated reports
 - `apps/web/app/(dashboard)/copilot/page.tsx` - Copilot chat interface
 - `apps/web/components/copilot/copilot-chat.tsx` - Chat UI component
+- `apps/web/lib/hooks/use-copilot-stream.ts` - SSE streaming hook

+### Streaming Architecture
+
+**SSE Endpoint (Primary):**
+```typescript
+// apps/api/src/modules/ai-copilot/ai-copilot.controller.ts
+@Get('stream')
+@Sse()
+async streamQuery(
+  @Query('query') query: string,
+  @CurrentUser() user: CurrentUserPayload,
+): Observable<MessageEvent> {
+  return new Observable(subscriber => {
+    this.copilotService.streamResponse(query, user.tenantId, {
+      onToken: (token) => subscriber.next({ data: { token } }),
+      onToolCall: (tool) => subscriber.next({ data: { tool } }),
+      onComplete: () => {
+        subscriber.next({ data: { done: true } });
+        subscriber.complete();
+      },
+    });
+  });
+}
+```
+
+**Frontend Hook:**
+```typescript
+// apps/web/lib/hooks/use-copilot-stream.ts
+function useCopilotStream() {
+  const [tokens, setTokens] = useState<string[]>([]);
+  const [isStreaming, setIsStreaming] = useState(false);
+  const abortRef = useRef<AbortController | null>(null);
+
+  const query = useCallback(async (question: string) => {
+    abortRef.current = new AbortController();
+    setIsStreaming(true);
+    setTokens([]);
+
+    const response = await fetch(`/api/v1/copilot/stream?query=${encodeURIComponent(question)}`, {
+      signal: abortRef.current.signal,
+    });
+
+    const reader = response.body?.getReader();
+    const decoder = new TextDecoder();
+
+    while (true) {
+      const { done, value } = await reader!.read();
+      if (done) break;
+
+      const text = decoder.decode(value);
+      const events = text.split('\n\n').filter(Boolean);
+
+      for (const event of events) {
+        if (event.startsWith('data: ')) {
+          const data = JSON.parse(event.slice(6));
+          if (data.token) setTokens(prev => [...prev, data.token]);
+          if (data.done) setIsStreaming(false);
+        }
+      }
+    }
+  }, []);
+
+  const cancel = useCallback(() => {
+    abortRef.current?.abort();
+    setIsStreaming(false);
+  }, []);
+
+  return { tokens, isStreaming, query, cancel };
+}
+```
```

---

### 1.4 AI Feedback Loop with Auto-Improvement

**Problem:** The plan tracks feedback but doesn't explain how it improves the AI.

**Solution:** Implement Online Iterative RLHF pattern with targeted human feedback.

**Rationale:** Research shows achieving human-level alignment with only 6-7% of annotation effort using hybrid approach.

```diff
 ### 4. `AiFeedbackService` — Learn From Human Corrections
-```typescript
-// When AI generates a message/suggestion, track if human accepted, edited, or rejected
-model AiFeedback {
-  id          String   @id @default(uuid())
-  tenantId    String
-  feature     String
-  template    String
-  aiOutput    String   // What AI generated
-  action      String   // ACCEPTED, EDITED, REJECTED
-  humanEdit   String?  // What the human changed it to (if edited)
-  createdAt   DateTime @default(now())
-  @@index([tenantId, feature])
-}
-// This data enables: prompt refinement, per-tenant style learning, quality tracking
-```
+
+**Enhanced Schema:**
+```prisma
+model AiFeedback {
+  id            String   @id @default(uuid())
+  tenantId      String
+  feature       String
+  template      String
+  templateVersion String  // e.g., "quote.generate-followup:v2.3.1"
+  inputVariables Json    // The input that produced the output
+  aiOutput      String   @db.Text
+  action        String   // ACCEPTED, EDITED, REJECTED, REGENERATED
+  humanEdit     String?  @db.Text
+  confidenceScore Float? // Model's self-assessed confidence
+  qualityScore  Int?     // 1-5 rating if collected
+  responseTime  Int?     // Time to user action (ms) - implicit signal
+  createdAt     DateTime @default(now())
+  @@index([tenantId, feature])
+  @@index([template, action])
+  @@index([templateVersion])
+}
+```
+
+**Auto-Improvement Pipeline:**
+```typescript
+class AiFeedbackService {
+  // Run daily at 2am
+  @Cron('0 2 * * *')
+  async analyzeAndImprove() {
+    const templates = await this.getUnderperformingTemplates();
+
+    for (const template of templates) {
+      // Get rejected/edited examples
+      const failures = await this.getRecentFailures(template.name, 100);
+
+      if (failures.length > 10) {
+        // Use AI to analyze patterns in failures
+        const analysis = await this.aiEngine.analyze({
+          template: 'meta.analyze-prompt-failures',
+          variables: {
+            currentPrompt: template.content,
+            failures: failures.map(f => ({
+              input: f.inputVariables,
+              aiOutput: f.aiOutput,
+              humanEdit: f.humanEdit,
+              action: f.action,
+            })),
+          },
+        });
+
+        // Suggest prompt improvements
+        await this.createPromptSuggestion({
+          template: template.name,
+          currentVersion: template.version,
+          suggestedChanges: analysis.improvements,
+          reasoning: analysis.reasoning,
+          expectedImpact: analysis.estimatedImprovement,
+        });
+
+        // Notify admin for review
+        await this.notifyAdmin(template, analysis);
+      }
+    }
+  }
+
+  private async getUnderperformingTemplates() {
+    // Templates where reject+edit rate > 30%
+    return this.prisma.$queryRaw`
+      SELECT template,
+        COUNT(*) as total,
+        SUM(CASE WHEN action IN ('EDITED', 'REJECTED') THEN 1 ELSE 0 END) as failures,
+        (SUM(CASE WHEN action IN ('EDITED', 'REJECTED') THEN 1 ELSE 0 END)::float / COUNT(*)) as failure_rate
+      FROM "AiFeedback"
+      WHERE "createdAt" > NOW() - INTERVAL '7 days'
+      GROUP BY template
+      HAVING (SUM(CASE WHEN action IN ('EDITED', 'REJECTED') THEN 1 ELSE 0 END)::float / COUNT(*)) > 0.3
+    `;
+  }
+}
+```
+
+**Per-Tenant Style Learning:**
+The feedback data also enables learning each business's communication style:
+- Track how they edit AI-generated messages
+- Build a style profile (formal/casual, emoji usage, signature patterns)
+- Inject style preferences into future prompts
```

---

### 1.5 Prompt Versioning & A/B Testing

**Problem:** The plan stores prompts in `PROMPT_TEMPLATES` object but doesn't address versioning, deployment, or testing.

**Solution:** Treat prompts as code with semantic versioning, A/B testing, and gradual rollout.

```diff
 ### 2. `PromptTemplates` — Managed Prompt Library
-All AI prompts live in one place for easy iteration:
-```typescript
-export const PROMPT_TEMPLATES = {
-  // Quote Intelligence
-  'quote.score-conversion': `Analyze this quote and predict conversion likelihood...`,
-  'quote.generate-followup': `Write a personalized follow-up message...`,
-  ...
-};
-```
+
+**Enhanced Architecture:**
+```typescript
+// Prompts as versioned, testable configurations
+interface PromptVersion {
+  id: string;           // "quote.generate-followup:v2.3.1"
+  template: string;     // The prompt text with {variable} placeholders
+  model: string;        // Model override or "auto"
+  temperature: number;
+  maxTokens: number;
+  version: string;      // SemVer
+  isActive: boolean;
+  trafficPercent: number; // For A/B testing (0-100)
+  createdAt: Date;
+  performance: {
+    acceptRate: number;
+    avgLatency: number;
+    avgCost: number;
+  };
+}
+
+// Database-backed prompt registry with A/B testing
+class PromptRegistry {
+  async getPrompt(name: string, tenantId?: string): Promise<PromptVersion> {
+    // Check for tenant-specific override first
+    if (tenantId) {
+      const override = await this.getTenantOverride(name, tenantId);
+      if (override) return override;
+    }
+
+    // Get all active versions for this prompt
+    const versions = await this.getActiveVersions(name);
+
+    // A/B test: randomly select based on traffic percentages
+    return this.selectVersion(versions);
+  }
+
+  async promoteVersion(name: string, version: string): Promise<void> {
+    // Blue/green deployment: set new version to 100%, old to 0%
+    await this.setTrafficPercent(name, version, 100);
+  }
+
+  async rollback(name: string): Promise<void> {
+    // Instantly revert to previous version
+    const previous = await this.getPreviousVersion(name);
+    await this.promoteVersion(name, previous.version);
+  }
+}
+```
+
+**Schema Addition:**
+```prisma
+model PromptVersion {
+  id             String   @id @default(uuid())
+  name           String   // "quote.generate-followup"
+  version        String   // "2.3.1"
+  template       String   @db.Text
+  model          String   @default("auto")
+  temperature    Float    @default(0.7)
+  maxTokens      Int      @default(1024)
+  isActive       Boolean  @default(false)
+  trafficPercent Int      @default(0)
+  createdAt      DateTime @default(now())
+  createdBy      String?
+  changelog      String?
+  @@unique([name, version])
+  @@index([name, isActive])
+}
+
+model PromptTenantOverride {
+  id         String @id @default(uuid())
+  tenantId   String
+  promptName String
+  customTemplate String @db.Text
+  @@unique([tenantId, promptName])
+}
+```
+
+**A/B Testing Example:**
+```typescript
+// Test two versions of follow-up message
+await promptRegistry.createVersion({
+  name: 'quote.generate-followup',
+  version: '2.4.0-beta',
+  template: `...new approach...`,
+  trafficPercent: 20, // 20% of traffic to new version
+});
+
+// Monitor performance
+const metrics = await promptRegistry.compareVersions(
+  'quote.generate-followup',
+  ['2.3.1', '2.4.0-beta'],
+  { period: '7d' }
+);
+// {
+//   '2.3.1': { acceptRate: 0.72, conversionRate: 0.34 },
+//   '2.4.0-beta': { acceptRate: 0.81, conversionRate: 0.42 }
+// }
+
+// Promote winner
+await promptRegistry.promoteVersion('quote.generate-followup', '2.4.0-beta');
+```
```

---

## Part 2: Groundbreaking New Features

### 2.1 Cross-Tenant Benchmarking Intelligence

**Problem:** Each tenant operates in isolation; they don't know if they're underperforming.

**Solution:** Anonymous cross-tenant analytics that shows how each business compares to peers.

**Rationale:** "Your quote conversion is 34%. Top performers in your industry are at 52%." This single insight could transform behavior.

```diff
+## Sprint 7.9: Cross-Tenant Intelligence (NEW)
+
+**Pain point:** Business owners operate in a vacuum. They don't know what "good" looks like for their industry.
+
+**Scope:** Anonymized benchmarking + industry best practices derived from aggregate data.
+
+**Files to create:**
+- `apps/api/src/modules/benchmarking/benchmarking.module.ts`
+- `apps/api/src/modules/benchmarking/benchmarking.service.ts` - Anonymized aggregation
+- `apps/api/src/modules/benchmarking/industry-insights.service.ts` - Pattern extraction
+- `apps/web/components/dashboard/benchmark-widget.tsx` - Dashboard comparison widget
+
+**Implementation:**
+
+```typescript
+interface BenchmarkData {
+  metric: string;
+  yourValue: number;
+  industryAvg: number;
+  top25Percent: number;
+  top10Percent: number;
+  trend: 'improving' | 'stable' | 'declining';
+  actionableInsight?: string;
+}
+
+class BenchmarkingService {
+  // Calculate anonymized benchmarks nightly
+  @Cron('0 3 * * *')
+  async calculateBenchmarks() {
+    const industries = await this.getActiveIndustries();
+
+    for (const industry of industries) {
+      const tenants = await this.getTenantsByIndustry(industry);
+
+      const metrics = {
+        quoteConversionRate: await this.aggregateMetric(tenants, 'quote_conversion'),
+        avgResponseTime: await this.aggregateMetric(tenants, 'response_time'),
+        noShowRate: await this.aggregateMetric(tenants, 'no_show_rate'),
+        reviewScore: await this.aggregateMetric(tenants, 'avg_review'),
+        customerRetention: await this.aggregateMetric(tenants, 'retention_rate'),
+        revenuePerTech: await this.aggregateMetric(tenants, 'revenue_per_technician'),
+      };
+
+      await this.storeBenchmarks(industry, metrics);
+    }
+  }
+
+  async getTenantBenchmarks(tenantId: string): Promise<BenchmarkData[]> {
+    const tenant = await this.getTenantWithMetrics(tenantId);
+    const benchmarks = await this.getBenchmarksForIndustry(tenant.industry);
+
+    return [
+      {
+        metric: 'Quote Conversion Rate',
+        yourValue: tenant.quoteConversionRate,
+        industryAvg: benchmarks.quoteConversionRate.avg,
+        top25Percent: benchmarks.quoteConversionRate.p75,
+        top10Percent: benchmarks.quoteConversionRate.p90,
+        trend: this.calculateTrend(tenant.id, 'quote_conversion'),
+        actionableInsight: tenant.quoteConversionRate < benchmarks.quoteConversionRate.avg
+          ? 'Your follow-up timing may be too slow. Top performers follow up within 2 hours.'
+          : undefined,
+      },
+      // ... other metrics
+    ];
+  }
+}
+```
+
+**Privacy Controls:**
+- Minimum 20 tenants per industry segment before showing benchmarks
+- Never show individual tenant data
+- Opt-out available in tenant settings
+- Differential privacy techniques for edge cases
+
+**Dashboard Widget:**
+Shows at-a-glance comparison with industry, highlighting:
+- Metrics where tenant is below average (red)
+- Metrics where tenant is above top 25% (green)
+- AI-generated actionable suggestions based on gaps
```

---

### 2.2 Predictive Lead Scoring (Before First Contact)

**Problem:** All incoming leads are treated equally until the business qualifies them manually.

**Solution:** AI scores every lead immediately upon arrival, predicting conversion likelihood and lifetime value.

```diff
+## Sprint 7.10: Predictive Lead Intelligence (NEW)
+
+**Pain point:** Businesses spend equal time on leads that convert at 5% vs 50%. They don't know which to prioritize.
+
+**Scope:** AI lead scoring on arrival + priority routing + predicted LTV.
+
+**Files to create:**
+- `apps/api/src/modules/lead-intelligence/lead-intelligence.module.ts`
+- `apps/api/src/modules/lead-intelligence/lead-scoring.service.ts`
+- `apps/api/src/modules/lead-intelligence/lead-enrichment.service.ts`
+- `apps/web/components/leads/lead-score-badge.tsx`
+
+**Implementation:**
+
+```typescript
+interface LeadScore {
+  conversionProbability: number; // 0-1
+  predictedLTV: number;          // Dollars
+  urgency: 'immediate' | 'today' | 'this_week' | 'low';
+  priorityRank: number;          // 1-10
+  signals: LeadSignal[];
+  recommendedAction: string;
+}
+
+interface LeadSignal {
+  factor: string;
+  impact: 'positive' | 'negative';
+  weight: number;
+  detail: string;
+}
+
+class LeadScoringService {
+  async scoreIncomingLead(lead: IncomingLead): Promise<LeadScore> {
+    // Gather signals
+    const signals: LeadSignal[] = [];
+
+    // Time-based signals
+    const hour = new Date().getHours();
+    if (hour >= 9 && hour <= 17) {
+      signals.push({
+        factor: 'business_hours',
+        impact: 'positive',
+        weight: 0.1,
+        detail: 'Contacted during business hours'
+      });
+    }
+
+    // Geographic signals
+    const zipData = await this.enrichZipCode(lead.zipCode);
+    if (zipData.medianIncome > 80000) {
+      signals.push({
+        factor: 'income_area',
+        impact: 'positive',
+        weight: 0.15,
+        detail: 'High-income area (likely higher ticket)'
+      });
+    }
+
+    // Service-based signals
+    const serviceStats = await this.getServiceConversionStats(lead.requestedService);
+    if (serviceStats.conversionRate > 0.4) {
+      signals.push({
+        factor: 'high_converting_service',
+        impact: 'positive',
+        weight: 0.2,
+        detail: `${lead.requestedService} has ${(serviceStats.conversionRate * 100).toFixed(0)}% conversion rate`
+      });
+    }
+
+    // Referral signals
+    if (lead.source === 'referral') {
+      signals.push({
+        factor: 'referral',
+        impact: 'positive',
+        weight: 0.25,
+        detail: 'Referred leads convert 3x higher'
+      });
+    }
+
+    // AI-powered message analysis
+    if (lead.message) {
+      const messageAnalysis = await this.aiEngine.analyze({
+        template: 'lead.analyze-message',
+        variables: { message: lead.message },
+      });
+
+      if (messageAnalysis.urgency === 'high') {
+        signals.push({
+          factor: 'urgent_language',
+          impact: 'positive',
+          weight: 0.2,
+          detail: 'Message indicates urgency ("emergency", "ASAP", "broken")'
+        });
+      }
+    }
+
+    // Calculate composite score
+    const baseScore = 0.5;
+    const adjustedScore = signals.reduce((score, signal) => {
+      return score + (signal.impact === 'positive' ? signal.weight : -signal.weight);
+    }, baseScore);
+
+    const conversionProbability = Math.min(1, Math.max(0, adjustedScore));
+
+    // Predict LTV based on service and area
+    const predictedLTV = await this.predictLTV(lead);
+
+    return {
+      conversionProbability,
+      predictedLTV,
+      urgency: this.determineUrgency(conversionProbability, predictedLTV),
+      priorityRank: Math.ceil(conversionProbability * 10),
+      signals,
+      recommendedAction: await this.getRecommendedAction(conversionProbability, predictedLTV),
+    };
+  }
+}
+```
+
+**Event Integration:**
+```typescript
+// When any lead arrives (booking request, SMS, call, web form)
+@OnEvent(EVENTS.LEAD_RECEIVED)
+async handleNewLead(payload: LeadEventPayload) {
+  const score = await this.leadScoring.scoreIncomingLead(payload);
+
+  // Store score
+  await this.prisma.lead.update({
+    where: { id: payload.leadId },
+    data: { score: score.conversionProbability, priority: score.priorityRank }
+  });
+
+  // Priority routing
+  if (score.urgency === 'immediate') {
+    await this.pushNotification.sendToOwner(
+      payload.tenantId,
+      `🔥 High-priority lead: ${payload.customerName} - ${score.recommendedAction}`
+    );
+  }
+}
+```
```

---

### 2.3 Weather-Triggered Smart Marketing

**Problem:** Service businesses are heavily weather-dependent but react to weather rather than anticipating it.

**Solution:** AI monitors weather forecasts and automatically triggers relevant campaigns.

```diff
+## Sprint 7.11: Weather Intelligence Marketing (NEW)
+
+**Pain point:** HVAC companies scramble during heat waves, plumbers during freezes. By then, schedules are full and customers go elsewhere.
+
+**Scope:** Weather forecast integration + auto-triggered campaigns + capacity pre-planning.
+
+**Implementation:**
+
+```typescript
+interface WeatherTrigger {
+  condition: 'heat_wave' | 'cold_snap' | 'storm' | 'rain_week' | 'first_freeze';
+  thresholds: {
+    temperature?: { above?: number; below?: number };
+    precipitation?: { above?: number };
+    duration?: number; // consecutive days
+  };
+  services: string[];        // Services to promote
+  campaignTemplate: string;  // Pre-built campaign template
+  leadTimeDays: number;      // Days before event to trigger
+}
+
+const WEATHER_TRIGGERS: WeatherTrigger[] = [
+  {
+    condition: 'heat_wave',
+    thresholds: { temperature: { above: 95 }, duration: 3 },
+    services: ['AC Repair', 'AC Tune-Up', 'AC Installation'],
+    campaignTemplate: 'weather.heat-wave',
+    leadTimeDays: 3,
+  },
+  {
+    condition: 'first_freeze',
+    thresholds: { temperature: { below: 32 } },
+    services: ['Furnace Tune-Up', 'Pipe Insulation', 'Winterization'],
+    campaignTemplate: 'weather.first-freeze',
+    leadTimeDays: 5,
+  },
+];
+
+class WeatherIntelligenceService {
+  // Check weather forecasts daily
+  @Cron('0 6 * * *')
+  async monitorWeather() {
+    const tenants = await this.getActiveTenantsWithWeather();
+
+    for (const tenant of tenants) {
+      const forecast = await this.weatherApi.getForecast(tenant.zipCode, 10); // 10 days
+
+      for (const trigger of WEATHER_TRIGGERS) {
+        if (this.matchesTrigger(forecast, trigger)) {
+          // Check if campaign already sent for this trigger
+          const existing = await this.getRecentCampaign(tenant.id, trigger.condition);
+          if (existing) continue;
+
+          // Generate personalized campaign
+          const campaign = await this.createWeatherCampaign(tenant, trigger, forecast);
+
+          // Queue for tenant approval or auto-send based on settings
+          if (tenant.settings.autoSendWeatherCampaigns) {
+            await this.sendCampaign(campaign);
+          } else {
+            await this.queueForApproval(campaign);
+            await this.notify(tenant.ownerId, `Weather campaign ready: ${trigger.condition}`);
+          }
+        }
+      }
+    }
+  }
+
+  // AI-generated campaign content
+  private async createWeatherCampaign(
+    tenant: Tenant,
+    trigger: WeatherTrigger,
+    forecast: Forecast
+  ): Promise<Campaign> {
+    const message = await this.aiEngine.generateText({
+      template: trigger.campaignTemplate,
+      variables: {
+        businessName: tenant.businessName,
+        condition: trigger.condition,
+        temperature: forecast.maxTemp,
+        date: forecast.triggerDate,
+        services: trigger.services,
+      },
+      tone: 'helpful', // Not salesy - weather warnings feel helpful
+    });
+
+    // Target customers likely to need this service
+    const segment = await this.createWeatherSegment(tenant.id, trigger);
+
+    return {
+      tenantId: tenant.id,
+      name: `Weather Alert: ${trigger.condition}`,
+      message,
+      segment,
+      scheduledAt: new Date(), // Send immediately
+      type: 'sms',
+    };
+  }
+}
+```
+
+**Example Campaign:**
+> "Hi Sarah, the Weather Service is predicting 100°F+ temps starting Thursday.
+> We're booking AC tune-ups now to help customers beat the heat.
+> Your system was last checked 14 months ago — want us to take a look before it gets crazy?
+> Reply YES to book your spot."
+
+**Capacity Pre-Planning:**
+When weather triggers fire, also:
+- Suggest scheduling extra technicians
+- Pre-order common parts (filters, capacitors)
+- Adjust dynamic pricing for surge
```

---

### 2.4 Customer Journey Orchestration

**Problem:** The plan treats each automation (follow-up, reminders, reviews) as independent. Customer experience is fragmented.

**Solution:** A unified journey engine that orchestrates all touchpoints as a coherent experience.

```diff
+## Sprint 7.12: Customer Journey Orchestration (NEW)
+
+**Pain point:** Customers receive disconnected messages. They might get a review request while they have an unpaid invoice. The experience feels robotic.
+
+**Scope:** Unified journey state machine + cross-automation coordination + personalized cadence.
+
+**Implementation:**
+
+```typescript
+type JourneyStage =
+  | 'new_lead'
+  | 'quote_sent'
+  | 'quote_following_up'
+  | 'booked'
+  | 'pre_appointment'
+  | 'appointment_today'
+  | 'job_in_progress'
+  | 'job_complete'
+  | 'awaiting_payment'
+  | 'paid'
+  | 'review_eligible'
+  | 'reviewed'
+  | 'dormant'
+  | 'churned';
+
+interface JourneyState {
+  customerId: string;
+  stage: JourneyStage;
+  stageEnteredAt: Date;
+  blockedActions: string[];  // e.g., ['review_request'] if invoice unpaid
+  pendingActions: JourneyAction[];
+  preferences: {
+    preferredChannel: 'sms' | 'email' | 'whatsapp';
+    quietHours: { start: string; end: string };
+    frequency: 'minimal' | 'normal' | 'engaged';
+  };
+}
+
+class JourneyOrchestrator {
+  // Centralized decision point for all outbound communication
+  async canSendMessage(
+    customerId: string,
+    messageType: string
+  ): Promise<{ allowed: boolean; reason?: string; suggestedDelay?: number }> {
+    const journey = await this.getJourneyState(customerId);
+
+    // Rule: Never request review if invoice unpaid
+    if (messageType === 'review_request' && journey.stage === 'awaiting_payment') {
+      return {
+        allowed: false,
+        reason: 'Customer has unpaid invoice',
+        suggestedDelay: null // Wait for payment event
+      };
+    }
+
+    // Rule: No marketing during active job
+    if (messageType.startsWith('marketing_') &&
+        ['booked', 'appointment_today', 'job_in_progress'].includes(journey.stage)) {
+      return { allowed: false, reason: 'Customer has active service' };
+    }
+
+    // Rule: Respect message frequency preferences
+    const recentMessages = await this.getRecentMessages(customerId, '24h');
+    const maxPerDay = journey.preferences.frequency === 'minimal' ? 1 : 3;
+    if (recentMessages.length >= maxPerDay) {
+      return {
+        allowed: false,
+        reason: 'Daily message limit reached',
+        suggestedDelay: this.getNextWindowMs()
+      };
+    }
+
+    // Rule: Respect quiet hours
+    if (this.isQuietHours(journey.preferences.quietHours)) {
+      return {
+        allowed: false,
+        reason: 'Quiet hours',
+        suggestedDelay: this.getMsUntilQuietEnd(journey.preferences.quietHours)
+      };
+    }
+
+    return { allowed: true };
+  }
+
+  // All automation services check with orchestrator before sending
+  @OnEvent(EVENTS.MESSAGE_QUEUED)
+  async interceptMessage(payload: MessageQueuedPayload) {
+    const decision = await this.canSendMessage(payload.customerId, payload.type);
+
+    if (!decision.allowed) {
+      if (decision.suggestedDelay) {
+        // Reschedule for later
+        await this.rescheduleMessage(payload.messageId, decision.suggestedDelay);
+      } else {
+        // Cancel and wait for trigger event
+        await this.holdMessage(payload.messageId, decision.reason);
+      }
+    }
+  }
+}
+```
+
+**Journey Visualization:**
+Add a customer timeline view showing:
+- All past interactions across channels
+- Current journey stage
+- Upcoming scheduled touchpoints
+- Blocked actions and reasons
```

---

### 2.5 Natural Language Configuration

**Problem:** Business owners must navigate complex settings UIs. They often miss important configurations.

**Solution:** Let owners configure the system via natural language in the Copilot.

```diff
 ## Sprint 7.8: AI Business Copilot

+### Copilot Write Capabilities (Configuration)
+
+In addition to querying data, the Copilot can modify settings:
+
+```typescript
+const COPILOT_WRITE_TOOLS = [
+  {
+    name: 'update_business_hours',
+    description: 'Update business operating hours',
+    parameters: { dayOfWeek: string, openTime: string, closeTime: string, closed: boolean }
+  },
+  {
+    name: 'set_deposit_requirement',
+    description: 'Configure deposit requirements for bookings',
+    parameters: { required: boolean, percentage: number, forServicesOver: number }
+  },
+  {
+    name: 'configure_reminders',
+    description: 'Set up appointment reminder schedule',
+    parameters: { hours: number[], channels: string[] }
+  },
+  {
+    name: 'create_service',
+    description: 'Add a new service offering',
+    parameters: { name: string, description: string, duration: number, price: number }
+  },
+  {
+    name: 'set_technician_skills',
+    description: 'Configure technician skill levels',
+    parameters: { technicianId: string, skills: { serviceId: string, level: string }[] }
+  },
+  {
+    name: 'update_pricing_rules',
+    description: 'Configure dynamic pricing rules',
+    parameters: { ruleType: string, conditions: object, multiplier: number }
+  },
+];
+```
+
+**Example Conversations:**
+
+**Owner:** "Make it so we're closed on Sundays"
+**Copilot:** *Calls update_business_hours for Sunday*
+→ "Done! I've marked Sunday as closed. Your booking page will no longer show Sunday slots. Want me to also update your Google Business hours?"
+
+**Owner:** "Start requiring 25% deposits for jobs over $500"
+**Copilot:** *Calls set_deposit_requirement*
+→ "I've enabled deposit requirements: 25% deposit for services over $500. This will apply to new bookings starting now. Existing bookings are unchanged."
+
+**Owner:** "Mike is now certified for AC installation"
+**Copilot:** *Calls set_technician_skills*
+→ "Updated! Mike is now marked as certified for AC Installation. He'll start appearing in the dispatch suggestions for those jobs."
+
+**Safety Controls:**
+- All write operations logged with before/after state
+- Confirmation required for high-impact changes (pricing, hours)
+- Instant rollback available: "Undo that last change"
```

---

### 2.6 Supplier/Inventory Intelligence

**Problem:** Technicians run out of common parts. Emergency supply runs waste time and money.

**Solution:** Track parts usage, predict needs, auto-generate purchase orders.

```diff
+## Sprint 7.13: Inventory Intelligence (NEW)
+
+**Pain point:** Technicians make 2-3 supply runs per week. Emergency parts orders cost 30% more. Inventory tracking is nonexistent.
+
+**Scope:** Parts usage tracking + predictive ordering + supplier integration.
+
+**Implementation:**
+
+```typescript
+class InventoryIntelligenceService {
+  // Track parts used on each job
+  async recordPartsUsage(jobId: string, parts: UsedPart[]) {
+    for (const part of parts) {
+      await this.prisma.partsUsage.create({
+        data: {
+          jobId,
+          partId: part.id,
+          quantity: part.quantity,
+          cost: part.cost,
+        }
+      });
+
+      // Update inventory
+      await this.updateInventory(part.id, -part.quantity);
+    }
+
+    // Check for low stock
+    await this.checkReorderPoints();
+  }
+
+  // Predict parts needed based on scheduled work
+  async predictPartsNeeded(tenantId: string, days: number): Promise<PredictedParts[]> {
+    const upcomingJobs = await this.getScheduledJobs(tenantId, days);
+    const predictions: Map<string, number> = new Map();
+
+    for (const job of upcomingJobs) {
+      // Get historical parts usage for this service type
+      const typicalParts = await this.getTypicalPartsForService(job.serviceId);
+
+      for (const part of typicalParts) {
+        const current = predictions.get(part.id) || 0;
+        predictions.set(part.id, current + part.avgQuantity);
+      }
+    }
+
+    return Array.from(predictions.entries()).map(([partId, quantity]) => ({
+      partId,
+      predictedQuantity: Math.ceil(quantity),
+      currentStock: this.getStock(partId),
+      needToOrder: Math.max(0, Math.ceil(quantity) - this.getStock(partId)),
+    }));
+  }
+
+  // Weekly purchase order suggestion
+  @Cron('0 8 * * 1') // Monday 8am
+  async generateWeeklyPO(tenantId: string) {
+    const predictions = await this.predictPartsNeeded(tenantId, 14); // 2 weeks ahead
+    const toOrder = predictions.filter(p => p.needToOrder > 0);
+
+    if (toOrder.length > 0) {
+      const po = await this.createPurchaseOrder(tenantId, toOrder);
+
+      await this.notify(tenantId, {
+        title: 'Weekly Parts Order Ready',
+        body: `${toOrder.length} items need reordering. Estimated cost: $${po.total}`,
+        action: { type: 'view_po', poId: po.id },
+      });
+    }
+  }
+}
+```
+
+**AI Enhancement:**
+```typescript
+// Analyze parts usage patterns
+async analyzePartsPatterns(tenantId: string) {
+  return this.aiEngine.analyze({
+    template: 'inventory.analyze-patterns',
+    variables: {
+      usage: await this.getLast90DaysUsage(tenantId),
+      costs: await this.getPartsCosts(tenantId),
+    },
+  });
+}
+// Output: "You're using 40% more capacitors than last year. Consider bulk ordering.
+// Filters are your highest-margin add-on (82% markup) - ensure techs always have stock."
+```
```

---

### 2.7 AI Training Mode (Explicit Preference Learning)

**Problem:** The AI learns from implicit signals (edits, rejections) but owners can't directly teach it.

**Solution:** A dedicated training mode where owners can explicitly show the AI their preferences.

```diff
+## AI Training Mode
+
+**Problem:** Business owners want to teach the AI their communication style without editing every message.
+
+**Solution:** Interactive training sessions where owners provide examples.
+
+```typescript
+class AiTrainingService {
+  async startTrainingSession(tenantId: string, topic: string): Promise<TrainingSession> {
+    return this.prisma.trainingSession.create({
+      data: {
+        tenantId,
+        topic, // 'communication_style', 'pricing_philosophy', 'customer_segments'
+        status: 'in_progress',
+      }
+    });
+  }
+
+  async collectExample(sessionId: string, example: TrainingExample) {
+    // Owner provides: bad example → good example
+    await this.prisma.trainingExample.create({
+      data: {
+        sessionId,
+        badExample: example.bad,
+        goodExample: example.good,
+        explanation: example.why,
+      }
+    });
+  }
+
+  async applyTraining(sessionId: string) {
+    const session = await this.getSessionWithExamples(sessionId);
+
+    // Generate style guide from examples
+    const styleGuide = await this.aiEngine.analyze({
+      template: 'training.extract-style',
+      variables: {
+        examples: session.examples,
+        topic: session.topic,
+      },
+    });
+
+    // Store as tenant preference
+    await this.prisma.tenantAiPreference.upsert({
+      where: { tenantId_topic: { tenantId: session.tenantId, topic: session.topic } },
+      update: { styleGuide, examples: session.examples },
+      create: { tenantId: session.tenantId, topic: session.topic, styleGuide, examples: session.examples },
+    });
+  }
+}
+```
+
+**Training Flow Example:**
+
+**Owner starts:** "I want to train the AI on how we talk to customers"
+
+**System:** "Great! I'll show you some AI-generated messages. For each one, tell me if it's good or show me how you'd write it instead."
+
+**System shows:** "Hi John, just a reminder about your appointment tomorrow at 2pm."
+
+**Owner:** "Too formal. We'd say: 'Hey John! See you tomorrow at 2 for your AC tune-up. Mike's excited to help!'"
+
+**System:** "Got it! I'm learning you prefer:
+- Casual greetings ('Hey' not 'Hi')
+- Specific service mentions
+- Technician name inclusion
+- Enthusiasm and exclamation points
+
+Let me try another one..."
+
+*After 5-10 examples:*
+
+**System:** "Training complete! I've learned your communication style. Here's a summary:
+- Tone: Friendly, casual, enthusiastic
+- Always: Include technician name, specific service
+- Never: Generic greetings, formal language
+- Signature style: Exclamation points, emoji occasionally
+
+Would you like me to apply this to all future messages?"
+```

---

### 2.8 Real-Time Competitor Intelligence

**Problem:** Businesses don't know how their pricing and reviews compare to local competitors.

**Solution:** Monitor competitor Google listings for pricing signals, review volume, and ratings.

```diff
+## Sprint 7.14: Competitive Intelligence (NEW)
+
+**Pain point:** Business owners make pricing decisions in a vacuum. They don't know if they're underpriced or overpriced vs. local competition.
+
+**Scope:** Competitor monitoring + pricing benchmarks + review comparison.
+
+**Implementation:**
+
+```typescript
+class CompetitorIntelligenceService {
+  // Weekly competitor scan
+  @Cron('0 5 * * 0') // Sunday 5am
+  async scanCompetitors() {
+    const tenants = await this.getTenantswithCompetitorTracking();
+
+    for (const tenant of tenants) {
+      const competitors = await this.findLocalCompetitors(
+        tenant.industry,
+        tenant.zipCode,
+        tenant.serviceRadius
+      );
+
+      for (const competitor of competitors) {
+        const data = await this.scrapeGoogleBusiness(competitor.placeId);
+
+        await this.prisma.competitorSnapshot.create({
+          data: {
+            tenantId: tenant.id,
+            competitorPlaceId: competitor.placeId,
+            name: data.name,
+            rating: data.rating,
+            reviewCount: data.reviewCount,
+            priceLevel: data.priceLevel,
+            recentReviewsPositive: data.recentPositive,
+            recentReviewsNegative: data.recentNegative,
+            scannedAt: new Date(),
+          }
+        });
+      }
+    }
+  }
+
+  async getCompetitiveInsights(tenantId: string): Promise<CompetitiveInsights> {
+    const tenant = await this.getTenantMetrics(tenantId);
+    const competitors = await this.getRecentSnapshots(tenantId);
+
+    return {
+      yourRating: tenant.avgRating,
+      competitorAvgRating: avg(competitors.map(c => c.rating)),
+      yourReviewCount: tenant.reviewCount,
+      competitorAvgReviewCount: avg(competitors.map(c => c.reviewCount)),
+      ratingRank: this.calculateRank(tenant.avgRating, competitors.map(c => c.rating)),
+      reviewCountRank: this.calculateRank(tenant.reviewCount, competitors.map(c => c.reviewCount)),
+      opportunities: await this.identifyOpportunities(tenant, competitors),
+    };
+  }
+
+  private async identifyOpportunities(tenant, competitors): Promise<string[]> {
+    const opportunities = [];
+
+    // Review gap
+    const topCompetitor = competitors.reduce((a, b) => a.reviewCount > b.reviewCount ? a : b);
+    if (tenant.reviewCount < topCompetitor.reviewCount * 0.5) {
+      opportunities.push(
+        `Top competitor has ${topCompetitor.reviewCount} reviews vs your ${tenant.reviewCount}. ` +
+        `Increasing review velocity could improve local search ranking.`
+      );
+    }
+
+    // Rating opportunity
+    if (tenant.avgRating >= Math.max(...competitors.map(c => c.rating))) {
+      opportunities.push(
+        `You have the highest rating in your area! Highlight this in marketing.`
+      );
+    }
+
+    return opportunities;
+  }
+}
+```
+
+**Dashboard Widget:**
+Shows side-by-side comparison:
+- Your rating vs. competitor average
+- Review count comparison
+- Trend arrows (improving/declining vs. competition)
+- AI-generated competitive positioning suggestions
```

---

## Part 3: Sprint-by-Sprint Enhancements

### Sprint 7.1 Enhancements: Quote Follow-Up

```diff
 ### Sprint 7.1: Automated Quote Follow-Up Pipeline

 **Steps:**
 1. Add `QuoteFollowUp` Prisma model:
-   - Fields: `id`, `tenantId`, `quoteId`, `step` (1-4), `channel` (SMS/EMAIL), `scheduledAt`, `sentAt`, `status` (PENDING/SENT/CANCELLED), `createdAt`
+   - Fields: `id`, `tenantId`, `quoteId`, `step` (1-4), `channel` (SMS/EMAIL/VOICE), `scheduledAt`, `sentAt`, `status` (PENDING/SENT/CANCELLED/SKIPPED), `createdAt`, `messageVariant` (for A/B testing), `conversionScore`
    - Run `prisma migrate dev`

+2. Add A/B testing for follow-up messages:
+   - Create 2-3 variants per step
+   - Track conversion by variant
+   - Auto-promote winning variants after statistical significance
+
+3. Add quote expiration handling:
+   - Configurable expiration days per service
+   - Auto-archive expired quotes
+   - "Requote" option that generates updated pricing
+
 4. Implement `QuoteFollowupService`:
    - `scheduleFollowUps(quoteId)` - Creates 4 delayed jobs when a quote is sent:
-     - Step 1 (Day 2): SMS - "Hi {name}, just checking if you had questions about your {service} quote for ${amount}"
+     - Step 1 (Day 1, 4pm): SMS - AI-generated personalized check-in
-     - Step 2 (Day 5): Email - Detailed follow-up with quote PDF attached
+     - Step 2 (Day 3): Email - Value-focused follow-up with PDF + competitor comparison
-     - Step 3 (Day 10): SMS - "Your quote for {service} expires in 5 days. Reply YES to book or STOP to opt out"
+     - Step 3 (Day 7): SMS - Scarcity/urgency (limited availability this week)
-     - Step 4 (Day 14): Final email - "We'd hate to lose you" with small discount offer
+     - Step 4 (Day 10): Phone call via Vapi (not email) - personal touch for high-value quotes
+     - Step 5 (Day 14): Final SMS with one-click accept + small discount

+5. Add "smart pause" feature:
+   - If customer opens quote PDF, pause sequence for 24h (let them think)
+   - If customer visits pricing page again, accelerate sequence
+   - If customer calls/texts, pause and let human handle

+6. Add competitor comparison feature:
+   - "Your quote is 15% below market average for this service in your area"
+   - Powered by cross-tenant benchmarking (anonymized)
```

---

### Sprint 7.2 Enhancements: Payment Automation

```diff
 ### Sprint 7.2: Payment Automation & Cash Flow Protection

+**New Feature: Payment Plans**
+```typescript
+// AI-suggested payment plan for large invoices
+class PaymentPlanService {
+  async suggestPaymentPlan(invoiceId: string): Promise<PaymentPlan> {
+    const invoice = await this.getInvoice(invoiceId);
+    const customer = await this.getCustomerPaymentHistory(invoice.customerId);
+
+    // AI determines best plan based on amount + customer history
+    const plan = await this.aiEngine.analyze({
+      template: 'payment.suggest-plan',
+      variables: {
+        amount: invoice.amount,
+        customerPaymentHistory: customer.history,
+        customerCLV: customer.clv,
+      },
+    });
+
+    return plan; // { installments: 3, amounts: [400, 400, 400], dates: [...] }
+  }
+
+  async createPaymentPlan(invoiceId: string, plan: PaymentPlan) {
+    // Create Stripe subscription for installments
+    // or schedule individual payment intents
+  }
+}
+```

+**New Feature: Financing Partner Integration**
+- Integrate with Wisetack, GreenSky, or similar
+- For invoices > $2,000, offer "0% financing available" option
+- Instant approval, business gets paid immediately

 **Steps:**
 7. Modify `PaymentsService` to support deposit payment intents (partial amount)
+8. Add PaymentPlan model and service
+9. Add financing application flow (redirect to partner)
+10. Add "payment received" celebration + upsell
+    - "Payment received! Your next AC tune-up is due in 6 months. Want to schedule now?"
```

---

### Sprint 7.3 Enhancements: No-Show Prevention

```diff
 ### Sprint 7.3: No-Show Prevention System

-#### d) Smart Overbooking Recommendations
-When aggregate no-show risk for a time slot exceeds a threshold:
-- AI recommends overbooking (e.g., book 3 appointments when only 2 can be served)
-- Dashboard shows risk-adjusted capacity vs actual bookings
-- Historical accuracy tracking to refine the model

+#### d) Double-Booking Recovery (Replaces Overbooking)
+
+**Rationale for removal of overbooking:** Unlike airlines/hotels, service businesses
+can't easily handle double-booked customers. A plumber arriving at two homes
+simultaneously destroys customer trust. Better approach: faster waitlist filling.
+
+**New approach - Instant Waitlist Matching:**
+```typescript
+// When cancellation detected, instantly fill from waitlist
+@OnEvent(EVENTS.APPOINTMENT_CANCELLED)
+async handleCancellation(payload: AppointmentEventPayload) {
+  const slot = {
+    serviceId: payload.serviceId,
+    date: payload.date,
+    time: payload.time,
+    technicianId: payload.technicianId,
+  };
+
+  // Find waitlisted customers who match
+  const matches = await this.waitlistService.findMatches(slot);
+
+  if (matches.length > 0) {
+    // Notify first match with 30-minute claim window
+    await this.notifyWithClaimWindow(matches[0], slot, 30);
+
+    // If not claimed, move to next
+    await this.scheduleNextNotification(matches.slice(1), slot, 30);
+  }
+}
+```
+
+**Faster Response = Better Fill Rate:**
+- SMS sent within 60 seconds of cancellation
+- First-responder-wins model
+- Track: "Slot filled in X minutes" metric
+
+#### e) Proactive No-Show Rescue
+
+```typescript
+// If high-risk appointment not confirmed 4 hours before, try to fill
+@Cron('*/30 * * * *') // Every 30 minutes
+async rescueUnconfirmedAppointments() {
+  const atRisk = await this.getUnconfirmedHighRiskAppointments(4); // 4 hours out
+
+  for (const apt of atRisk) {
+    // Make one more outreach attempt
+    await this.sendUrgentConfirmationRequest(apt);
+
+    // Simultaneously, prepare backup
+    await this.prepareWaitlistBackup(apt.slot);
+  }
+}
+```
```

---

### Sprint 7.4 Enhancements: Review Pipeline

```diff
 ### Sprint 7.4: Smart Google Review Pipeline

+**New Feature: Review Response Automation**
+Instead of just suggesting responses, auto-post them (with approval):
+
+```typescript
+class ReviewAutoResponder {
+  @OnEvent(EVENTS.REVIEW_RECEIVED)
+  async handleNewReview(payload: ReviewEventPayload) {
+    // Generate response
+    const response = await this.aiEngine.generateText({
+      template: 'review.draft-response',
+      variables: { ... },
+    });
+
+    if (payload.rating >= 4 && this.tenant.settings.autoRespondPositive) {
+      // Auto-post positive review responses
+      await this.googleBusiness.postResponse(payload.reviewId, response);
+      await this.logAutoResponse(payload, response);
+    } else {
+      // Queue for approval
+      await this.queueForApproval(payload, response);
+    }
+  }
+}
+```

+**New Feature: Review Velocity Targeting**
+```typescript
+// Goal-based review collection
+interface ReviewGoal {
+  targetReviews: number;
+  currentReviews: number;
+  deadline: Date;
+  dailyTarget: number;
+}
+
+// "You need 12 more reviews to hit 50 by end of month. I'll request 1-2 per day."
+```

+**New Feature: Negative Review Prevention**
+After NPS 6 or below:
+1. Alert owner within 5 minutes
+2. AI drafts service recovery message
+3. Schedule follow-up call
+4. Track: "Detractor saved" metric
```

---

### Sprint 7.6 Enhancements: Smart Dispatch

```diff
 ### Sprint 7.6: Smart Dispatch & Route Optimization

 5. Modify `SmartDispatchService`:
    - `optimizeRoute(technicianId, date)`:
-     - Integrate Google Maps Distance Matrix API (existing TODO in codebase)
+     - **Integrate Google Maps Distance Matrix API** (required, not TODO)
+     - Add real-time traffic awareness (departure time matters)
      - Consider real-world drive times instead of Haversine-only
      - Add time window constraints (customer preferred arrival windows)
      - Return optimized job order with ETAs

+**New Feature: Skill Development Tracking**
+```typescript
+model TechnicianCertification {
+  id            String   @id @default(uuid())
+  teamMemberId  String
+  certification String   // "EPA 608", "NATE", etc.
+  earnedAt      Date
+  expiresAt     Date?
+  @@index([teamMemberId])
+}
+
+// Track certifications and prompt for renewal
+// Suggest training based on job type gaps
+```

+**New Feature: Technician Earnings Dashboard**
+```typescript
+// Gamification: show each tech their performance
+interface TechnicianDashboard {
+  todayEarnings: number;
+  weekEarnings: number;
+  monthEarnings: number;
+  jobsCompleted: number;
+  avgRating: number;
+  upsellRevenue: number;
+  rank: number; // vs other techs
+}
+```
```

---

## Part 4: Features to Remove or Modify

### 4.1 Remove: Vapi Voice Calls for Collections

**Location:** Sprint 7.2

```diff
-#### d) Smart Collections Voice Calls
-For seriously overdue invoices (14+ days), instead of sending yet another SMS:
-- Vapi AI calls the customer with full context
-- "Hi, I'm calling from [Business] about invoice #234 for $1,200 that was due two weeks ago. I wanted to check if there's anything we can help with — we can set up a payment plan if that would make things easier."
-- Can take payment over the phone (Stripe)
-- Can negotiate and set up payment plans

+#### d) Collections Escalation Path (Human-Focused)
+
+**Rationale for removal:** AI voice calls for debt collection create legal liability
+under FDCPA and state collection laws. Robo-calls for collections can result in
+lawsuits and damage reputation. Human touch is essential for sensitive conversations.
+
+**Replacement approach:**
+```typescript
+// For invoices 14+ days overdue
+class CollectionsEscalator {
+  async escalate(invoiceId: string) {
+    const invoice = await this.getInvoice(invoiceId);
+
+    // 1. Final automated SMS (not AI call)
+    await this.sendFinalNotice(invoice);
+
+    // 2. Create task for human follow-up
+    await this.createTask({
+      type: 'collections_call',
+      priority: 'high',
+      assignee: invoice.tenant.ownerId,
+      title: `Call ${invoice.customerName} - $${invoice.amount} overdue ${invoice.daysOverdue} days`,
+      script: await this.generateCallScript(invoice),
+    });
+
+    // 3. Optional: Send to collections agency integration
+    if (invoice.daysOverdue > 60) {
+      await this.offerCollectionsAgency(invoice);
+    }
+  }
+}
+```
```

---

### 4.2 Modify: Overbooking Recommendations

**Location:** Sprint 7.3 (Already addressed above)

**Summary:** Replace "overbooking" with "faster waitlist recovery." Service businesses cannot risk showing up to two locations simultaneously.

---

### 4.3 Modify: Customer Phone Number Lookup Timing

**Location:** Sprint 7.3

```diff
-4. Implement inbound SMS webhook parsing in `SmsService`:
-   - Parse "C" replies → mark appointment `confirmedAt = now()`
-   - Parse "R" replies → send reschedule link
-   - Alert dispatcher if appointment not confirmed 12h before

+4. Implement inbound SMS webhook parsing in `SmsService`:
+   - Parse "C" or "CONFIRM" or "YES" replies → mark appointment `confirmedAt = now()`
+   - Parse "R" or "RESCHEDULE" or "CANCEL" replies → send reschedule link + offer waitlist
+   - Alert dispatcher if appointment not confirmed **6h before** (not 12h - tighter window)
+   - Add: Parse "ETA" or "WHERE" → send real-time technician location link
```

---

## Part 5: New Database Schema Additions

```prisma
// Multi-model AI support
model AiSemanticCache {
  id         String   @id @default(uuid())
  tenantId   String?
  template   String
  inputHash  String
  embedding  Unsupported("vector(1536)")
  response   String   @db.Text
  hitCount   Int      @default(0)
  createdAt  DateTime @default(now())
  expiresAt  DateTime
  @@index([template])
}

// Prompt versioning
model PromptVersion {
  id             String   @id @default(uuid())
  name           String
  version        String
  template       String   @db.Text
  model          String   @default("auto")
  temperature    Float    @default(0.7)
  maxTokens      Int      @default(1024)
  isActive       Boolean  @default(false)
  trafficPercent Int      @default(0)
  createdAt      DateTime @default(now())
  createdBy      String?
  changelog      String?
  @@unique([name, version])
  @@index([name, isActive])
}

// Cross-tenant benchmarking
model IndustryBenchmark {
  id         String   @id @default(uuid())
  industry   String
  metric     String
  avg        Float
  p25        Float
  p50        Float
  p75        Float
  p90        Float
  sampleSize Int
  periodStart DateTime
  periodEnd  DateTime
  @@unique([industry, metric, periodStart])
}

// Lead scoring
model LeadScore {
  id                    String   @id @default(uuid())
  leadId                String   @unique
  conversionProbability Float
  predictedLTV          Float
  urgency               String
  priorityRank          Int
  signals               Json
  scoredAt              DateTime @default(now())
}

// Customer journey state
model CustomerJourneyState {
  id             String   @id @default(uuid())
  customerId     String   @unique
  stage          String
  stageEnteredAt DateTime
  blockedActions Json     @default("[]")
  preferences    Json
  updatedAt      DateTime @updatedAt
}

// Weather triggers
model WeatherCampaign {
  id          String   @id @default(uuid())
  tenantId    String
  condition   String
  triggeredAt DateTime
  sentAt      DateTime?
  status      String
  forecast    Json
  @@index([tenantId, condition])
}

// Competitor tracking
model CompetitorSnapshot {
  id                    String   @id @default(uuid())
  tenantId              String
  competitorPlaceId     String
  name                  String
  rating                Float
  reviewCount           Int
  priceLevel            Int?
  recentReviewsPositive Int
  recentReviewsNegative Int
  scannedAt             DateTime
  @@index([tenantId])
}

// Inventory management
model InventoryItem {
  id           String   @id @default(uuid())
  tenantId     String
  name         String
  sku          String?
  category     String
  quantity     Int
  reorderPoint Int
  cost         Float
  @@unique([tenantId, sku])
}

model PartsUsage {
  id        String   @id @default(uuid())
  jobId     String
  partId    String
  quantity  Int
  cost      Float
  usedAt    DateTime @default(now())
  @@index([jobId])
}

// AI training
model TenantAiPreference {
  id         String   @id @default(uuid())
  tenantId   String
  topic      String
  styleGuide Json
  examples   Json
  updatedAt  DateTime @updatedAt
  @@unique([tenantId, topic])
}
```

---

## Summary: Priority Order

| Priority | Enhancement | Impact | Effort |
|----------|-------------|--------|--------|
| **P0** | Multi-model routing | 68% cost reduction | Medium |
| **P0** | Streaming responses | Essential for Copilot UX | Low |
| **P0** | Remove AI collections calls | Legal risk mitigation | Low |
| **P1** | Cross-tenant benchmarking | Major differentiator | Medium |
| **P1** | Semantic caching | 50%+ additional savings | Medium |
| **P1** | Customer journey orchestration | Better CX | High |
| **P1** | Prompt versioning + A/B testing | Quality improvement | Medium |
| **P2** | Predictive lead scoring | Sales efficiency | Medium |
| **P2** | Weather intelligence | Proactive marketing | Medium |
| **P2** | AI training mode | Personalization | Medium |
| **P3** | Competitor intelligence | Market awareness | Low |
| **P3** | Inventory intelligence | Operational efficiency | High |
| **P3** | Natural language config | UX improvement | Medium |

---

## Conclusion

The Sprint 7 plan provides an excellent automation foundation. These revisions transform it from "automated business tools" to "AI-native business partner." The key shifts:

1. **From single-model to intelligent routing** - 68% cost reduction
2. **From isolated automations to orchestrated journeys** - Better customer experience
3. **From tenant isolation to collective intelligence** - Every business benefits from aggregate learning
4. **From reactive to proactive** - Weather, leads, churn predicted before they happen
5. **From rigid to learnable** - AI adapts to each business's style

The recommended implementation order prioritizes cost reduction (P0) and differentiation (P1) first, with advanced features following in later sprints.

/**
 * Central prompt template library for all AI features.
 * Templates use {variableName} syntax for interpolation.
 *
 * Naming convention: 'domain.action'
 * - domain: quote, payment, noshow, review, retention, dispatch, comms, copilot
 * - action: what the AI should do
 *
 * Templates for sprints 7.1–7.8 are stubs that will be fleshed out
 * when each sprint is implemented.
 */

// === Quote Intelligence (Sprint 7.1) ===

const QUOTE_TEMPLATES = {
  'quote.score-conversion': `You are an expert sales analyst for a service business.
Analyze this quote and predict conversion likelihood.

Quote Details:
- Amount: {quoteAmount}
- Service: {serviceType}
- Valid Until: {validUntil}

Customer History:
- Total visits: {totalVisits}
- Total spent: {totalSpent}
- Last service: {lastServiceType}
- Days since last interaction: {daysSinceLastInteraction}

Market context:
- Average market price: {marketAvgPrice}

Respond with JSON only:
{
  "conversionProbability": 0.0-1.0,
  "riskFactors": ["factor1", "factor2"],
  "recommendedAction": "follow_up_within_24h" | "offer_discount" | "standard_sequence",
  "suggestedDiscount": 0-15,
  "reasoning": "brief explanation"
}`,

  'quote.generate-followup': `You are a friendly service business assistant.
Write a personalized follow-up message for a customer about their quote.

Customer: {customerName}
Service: {serviceType}
Quote amount: {quoteAmount}
Follow-up step: {step} of 4
Channel: {channel}
Business name: {businessName}
Previous interaction summary: {previousInteraction}

Guidelines:
- Keep SMS under 160 characters, email can be longer
- Be conversational and helpful, not pushy
- Step 1: Friendly check-in
- Step 2: Value reminder with details
- Step 3: Urgency (expiration approaching)
- Step 4: Final offer / personal touch

Write the message text only, no subject line for SMS.`,

  'quote.predict-objections': `Predict the customer's likely objections to this quote.

Quote amount: {quoteAmount}
Service type: {serviceType}
Customer history: {customerHistory}
Competitor pricing: {competitorPricing}

Respond with JSON only:
{
  "likelyObjections": [
    {
      "objection": "price_too_high" | "want_second_opinion" | "timing" | "trust",
      "probability": 0.0-1.0,
      "counterArgument": "suggested response"
    }
  ]
}`,
};

// === Payment Intelligence (Sprint 7.2) ===

const PAYMENT_TEMPLATES = {
  'payment.predict-behavior': `Predict this customer's payment behavior.

Payment history: {paymentHistory}
Invoice amount: {invoiceAmount}
Service type: {serviceType}
Customer tenure: {customerTenure}
Recent NPS score: {recentNpsScore}
Outstanding invoices: {currentOutstanding}

Respond with JSON only:
{
  "onTimePaymentProbability": 0.0-1.0,
  "predictedDaysToPayment": number,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "recommendedTerms": "net-15" | "net-30" | "due-on-receipt",
  "recommendedDepositPercent": 0-50,
  "reasoning": "brief explanation"
}`,

  'payment.calibrate-tone': `Determine the appropriate tone for a payment reminder.

Customer CLV: {customerCLV}
Payment history: {paymentHistorySummary}
Days overdue: {daysOverdue}
Reminders already sent: {reminderCount}
Customer sentiment: {customerSentiment}

Respond with JSON only:
{
  "tone": "warm" | "professional" | "firm" | "urgent",
  "personalizedMessage": "the actual reminder text",
  "escalationNeeded": boolean,
  "shouldCallInstead": boolean
}`,

  'payment.forecast-cashflow': `Forecast cash flow for the next {period}.

Outstanding invoices: {outstandingInvoices}
Upcoming scheduled work: {upcomingWork}
Historical revenue (last 12 months): {historicalRevenue}
Seasonal patterns: {seasonalPatterns}

Respond with JSON only:
{
  "nextWeekForecast": { "expected": number, "optimistic": number, "pessimistic": number },
  "next30DayForecast": { "expected": number, "optimistic": number, "pessimistic": number },
  "riskAlerts": ["alert1"],
  "recommendations": ["action1"]
}`,
};

// === No-Show Intelligence (Sprint 7.3) ===

const NOSHOW_TEMPLATES = {
  'noshow.score-risk': `Score the no-show risk for this appointment.

Customer no-show count: {noShowCount}
Total appointments: {totalAppointments}
Confirmation rate: {confirmationRate}
Day of week: {dayOfWeek}
Time of day: {timeOfDay}
Service type: {serviceType}
Booking lead time (days): {bookingLeadDays}
Is new customer: {isNewCustomer}

Respond with JSON only:
{
  "noShowProbability": 0.0-1.0,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH",
  "riskFactors": ["factor1"],
  "recommendations": {
    "requireDeposit": boolean,
    "extraReminder": boolean,
    "overbookSlot": boolean,
    "proactiveCallRecommended": boolean
  }
}`,

  'noshow.craft-reminder': `Write a personalized appointment reminder.

Customer: {customerName}
Service: {serviceName}
Date: {appointmentDate}
Time: {appointmentTime}
Technician: {technicianName}
Risk score: {riskScore}
Risk factors: {riskFactors}

Write a brief, friendly SMS reminder. If high risk, add
urgency and mention waitlist. Keep under 160 characters.`,
};

// === Review Intelligence (Sprint 7.4) ===

const REVIEW_TEMPLATES = {
  'review.generate-request': `Write a personalized review request SMS.

Customer: {customerName}
Service performed: {servicePerformed}
Technician: {technicianName}
NPS score: {npsScore}
Business name: {businessName}
Review link: {reviewLink}
Platform: {platform}

Write a warm, personal SMS (under 160 chars) asking for a review.
Reference the specific service and technician.`,

  'review.draft-response': `Draft a response to this customer review.

Review text: {reviewText}
Rating: {reviewRating}/5
Customer: {customerName}
Service performed: {servicePerformed}
Business name: {businessName}
Owner name: {ownerName}
Is return customer: {isReturnCustomer}

Respond with JSON only:
{
  "suggestedResponse": "the response text",
  "tone": "grateful" | "empathetic" | "professional",
  "escalationNeeded": boolean,
  "internalNote": "note for the team if any"
}`,

  'review.analyze-themes': `Analyze these reviews and identify themes.

Reviews: {reviews}
Business type: {businessType}

Respond with JSON only:
{
  "positiveThemes": [{ "theme": "name", "frequency": number, "sampleQuotes": [] }],
  "negativeThemes": [{ "theme": "name", "frequency": number, "sampleQuotes": [] }],
  "competitiveAdvantages": ["advantage1"],
  "improvementAreas": ["area1"],
  "overallSentimentTrend": "improving" | "stable" | "declining"
}`,
};

// === Retention Intelligence (Sprint 7.5) ===

const RETENTION_TEMPLATES = {
  'retention.predict-churn': `Predict this customer's churn risk.

Health score: {healthScore}
Appointment frequency trend: {frequencyTrend}
Last NPS score: {lastNpsScore}
Payment behavior trend: {paymentTrend}
Days since last service: {daysSinceLastService}
Customer tenure: {customerTenure}
CLV: {customerCLV}

Respond with JSON only:
{
  "churnProbability": 0.0-1.0,
  "churnTimeframe": "30_days" | "60_days" | "90_days",
  "churnReasons": ["reason1"],
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "recommendedIntervention": {
    "type": "personal_call" | "discount_offer" | "service_reminder" | "vip_treatment",
    "message": "suggested outreach text",
    "urgency": "immediate" | "this_week" | "this_month"
  }
}`,

  'retention.generate-winback': `Write a personalized win-back message.

Customer: {customerName}
Last service: {lastService}
Days since last visit: {daysSinceLastVisit}
Total visits: {totalVisits}
Total spent: {totalSpent}
Business name: {businessName}

Write a warm, personal message that acknowledges their loyalty
and offers a reason to return. Keep SMS under 160 chars.`,

  'retention.predict-service-need': `Predict when this customer will need service.

Equipment: {customerEquipment}
Service history: {serviceHistory}
Seasonal patterns: {seasonalPatterns}

Respond with JSON only:
{
  "predictedNeeds": [
    {
      "service": "service name",
      "predictedDate": "YYYY-MM-DD",
      "confidence": 0.0-1.0,
      "reason": "brief explanation"
    }
  ]
}`,
};

// === Dispatch Intelligence (Sprint 7.6) ===

const DISPATCH_TEMPLATES = {
  'dispatch.estimate-duration': `Estimate how long this job will take.

Service type: {serviceType}
Description: {serviceDescription}
Equipment: {equipmentType}, age {equipmentAge}
Condition: {equipmentCondition}
Customer history: {customerHistory}
Technician experience: {technicianExperience}
Job type: {jobType}

Respond with JSON only:
{
  "estimatedMinutes": number,
  "confidenceRange": { "min": number, "max": number },
  "complexityFactors": ["factor1"],
  "bufferRecommendation": number
}`,

  'dispatch.suggest-upsell': `Identify upsell opportunities for this job.

Current job service: {currentService}
Customer equipment: {customerEquipment}
Spend history: {spendHistory}
Maintenance alerts: {maintenanceAlerts}
Current season: {currentSeason}

Respond with JSON only:
{
  "upsellOpportunities": [
    {
      "service": "service name",
      "confidence": 0.0-1.0,
      "reason": "brief explanation",
      "suggestedPitch": "what the technician should say",
      "estimatedRevenue": number
    }
  ],
  "totalUpsellPotential": number
}`,
};

// === Communication Intelligence (Sprint 7.7) ===

const COMMS_TEMPLATES = {
  'comms.classify-intent': `Classify the intent and sentiment of this message.

Message: {messageText}
Customer context: {customerContext}

Respond with JSON only:
{
  "intent": "BOOKING" | "PRICING" | "STATUS" | "COMPLAINT" | "OTHER",
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "URGENT",
  "confidence": 0.0-1.0,
  "summary": "one-line summary"
}`,

  'comms.generate-response': `Generate a helpful response to this customer message.

Message: {messageText}
Customer: {customerName}
Context: {customerContext}
Business services: {businessServices}
Available slots: {availableSlots}
Business name: {businessName}
Business hours: {businessHours}

Write a helpful, conversational response. If booking intent,
suggest specific available times. Keep under 160 chars for SMS.`,

  'comms.summarize-conversation': `Summarize this conversation for the customer record.

Messages: {conversationHistory}

Respond with JSON only:
{
  "summary": "2-3 sentence summary",
  "keyTopics": ["topic1"],
  "actionItems": ["item1"],
  "customerSentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "followUpNeeded": boolean
}`,
};

// === AI Specialist Agents ===

const AGENT_TEMPLATES = {
  'agent.revenue-quote-analysis': `You are a sales intelligence analyst for a service business.
Analyze this quote and determine if follow-up action is needed.

Quote Details:
- Quote Number: {quoteNumber}
- Amount: {quoteAmount}
- Service: {serviceType}
- Sent: {daysSinceSent} days ago
- Viewed: {viewedStatus}
- Valid Until: {validUntil}

Customer Profile:
- Name: {customerName}
- Total Past Visits: {totalVisits}
- Total Lifetime Spend: {totalSpent}
- Last Interaction: {daysSinceLastInteraction} days ago

Analyze the quote status and recommend the best action.

Respond with JSON only:
{
  "conversionLikelihood": 0.0-1.0,
  "urgencyScore": 0.0-1.0,
  "recommendedAction": "call_immediately" | "send_followup" | "offer_discount" | "wait" | "mark_cold",
  "suggestedDiscount": 0-20,
  "optimalFollowUpTime": "immediate" | "today" | "tomorrow" | "this_week",
  "reasoning": "2-3 sentence explanation"
}`,

  'agent.customer-churn-analysis': `You are a customer success analyst for a service business.
Analyze this customer's behavior and assess churn risk.

Customer Profile:
- Name: {customerName}
- Health Score: {healthScore}/100
- Current Churn Risk: {churnRisk}%
- Lifecycle Stage: {lifecycleStage}
- Total Appointments: {totalAppointments}
- No-Show Count: {noShowCount}

Engagement Data:
- Days Since Last Visit: {daysSinceLastVisit}
- Total Lifetime Spend: {totalSpent}
- Average Visit Frequency: {avgVisitFrequency} days

Analyze the customer's engagement patterns and recommend retention actions.

Respond with JSON only:
{
  "churnRiskAssessment": 0.0-1.0,
  "churnTimeframe": "30_days" | "60_days" | "90_days" | "stable",
  "primaryRiskFactors": ["factor1", "factor2"],
  "recommendedAction": "personal_call" | "send_offer" | "loyalty_program" | "service_reminder" | "no_action",
  "suggestedOffer": "description or null",
  "reasoning": "2-3 sentence explanation"
}`,

  'agent.operations-noshow-analysis': `You are an operations analyst for a service business.
Analyze this upcoming appointment and predict no-show risk.

Appointment Details:
- Scheduled: {scheduledDate} at {scheduledTime}
- Service: {serviceName}
- Duration: {duration} minutes
- Status: {status}
- Confirmed: {isConfirmed}

Customer Risk Factors:
- Previous No-Shows: {noShowCount}
- Churn Risk: {churnRisk}%
- Hours Until Appointment: {hoursUntil}

Analyze the appointment and recommend preventive actions.

Respond with JSON only:
{
  "noShowProbability": 0.0-1.0,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "riskFactors": ["factor1", "factor2"],
  "recommendedActions": [
    {
      "action": "send_reminder" | "confirm_call" | "require_deposit" | "overbook_slot",
      "priority": "immediate" | "soon" | "optional",
      "reasoning": "why this action"
    }
  ]
}`,

  'agent.marketing-segment-analysis': `You are a marketing strategist for a service business.
Analyze the customer base and recommend marketing campaigns.

Business Metrics:
- Total Customers: {totalCustomers}
- New This Month: {newCustomers}
- Dormant Customers (90+ days): {dormantCount}
- At-Risk Customers: {atRiskCount}
- High-Value Customers: {highValueCount}

NPS Data:
- Average NPS: {avgNps}
- Promoters (9-10): {promoterCount}
- Detractors (0-6): {detractorCount}

Current Month: {currentMonth}
Season: {currentSeason}

Recommend the highest-impact marketing campaign to run right now.

Respond with JSON only:
{
  "recommendedCampaign": {
    "type": "winback" | "referral" | "seasonal" | "retention" | "upsell",
    "targetSegment": "dormant" | "at_risk" | "promoters" | "all",
    "estimatedReach": number,
    "expectedImpact": "low" | "medium" | "high",
    "suggestedMessage": "campaign message idea",
    "bestChannel": "sms" | "email" | "both"
  },
  "secondaryOpportunities": ["opportunity1", "opportunity2"],
  "reasoning": "2-3 sentence explanation"
}`,
};

// === Business Copilot (Sprint 7.8) ===

const COPILOT_TEMPLATES = {
  'copilot.answer-question': `You are a business intelligence assistant for a service business.
Answer this business question using the provided data.

Question: {question}
Data: {data}

Provide a clear, actionable answer with specific numbers.
Be concise but thorough. Suggest next steps when relevant.`,

  'copilot.weekly-report': `Generate a weekly business performance report.

Revenue data: {revenueData}
Appointment stats: {appointmentStats}
Quote conversion: {quoteConversionRate}
Customer satisfaction: {customerSatisfaction}
Cash flow: {cashFlowStatus}
Technician performance: {technicianPerformance}
Reviews received: {reviewsReceived}
Retention metrics: {retentionMetrics}

Respond with JSON only:
{
  "keyMetrics": { "revenue": number, "revenueChange": number, "jobsCompleted": number },
  "topWins": ["win1", "win2", "win3"],
  "areasNeedingAttention": ["area1", "area2", "area3"],
  "actionItems": ["specific action with details"],
  "forecast": "brief next week outlook"
}`,

  'copilot.anomaly-detection': `Identify anomalies in this business data.

Today's metrics: {todaysMetrics}
Rolling 30-day average: {rollingAverage}

Respond with JSON only:
{
  "anomalies": [
    {
      "type": "booking_drop" | "revenue_spike" | "cancellation_surge" | "review_cluster",
      "severity": "low" | "medium" | "high",
      "description": "what happened",
      "possibleCause": "likely reason",
      "suggestedAction": "what to do"
    }
  ]
}`,
};

// === Onboarding Interview ===

const ONBOARDING_TEMPLATES = {
  'onboarding.interview': `You are a friendly business consultant conducting an onboarding interview for a service business software platform.

PERSONALITY:
- Warm, encouraging, and genuinely curious
- Professional but not stiff
- Celebrate their answers briefly ("That's great!", "Love that!", "Perfect!")
- Keep responses concise (2-3 sentences max before the next question)
- Sound natural, like a real conversation

RULES:
1. Acknowledge their previous answer briefly and naturally
2. Then ask the next question smoothly
3. If their answer is vague, you can ask a gentle follow-up
4. Never lecture or give unsolicited advice during the interview
5. Keep the momentum going - don't over-explain

Business: {businessName}
Progress: {completedQuestions}/{totalQuestions}
Previous question: {previousQuestion}
Next question to ask: {nextQuestion}

The user just said: "{userMessage}"

Respond naturally (acknowledge their answer), then smoothly transition to asking: {nextQuestion}`,

  'onboarding.extract-data': `Extract structured business information from this conversation exchange.

Question asked: {questionAsked}
User's answer: {userAnswer}
Fields to extract: {fieldsToExtract}
Existing profile data: {existingProfile}

Extract the relevant information and return as JSON. Only include fields where you have confident data from the answer.

Guidelines for extraction:
- industry: Extract the business type (e.g., "plumbing", "hvac", "landscaping", "electrical")
- targetMarket: Should be "residential", "commercial", or "both"
- teamSize: Extract as a number
- hasFieldTechnicians: true if they mention technicians, field workers, or service people
- hasOfficeStaff: true if they mention office staff, dispatchers, or admin
- ownerRole: Should be "field", "office", or "both"
- communicationStyle: Should be "professional", "friendly", or "casual"
- preferredChannels: Array like ["sms", "email", "phone"]
- growthStage: Should be "startup", "growing", or "established"
- primaryGoals: Array of goals mentioned
- currentChallenges: Array of challenges mentioned
- peakSeasons: Array of months or seasons (e.g., ["summer", "spring"] or ["June", "July", "August"])
- busyDays: Array of day numbers (0=Sunday, 1=Monday, etc.)

Respond with JSON only:
{
  "extracted": {
    "fieldName": { "value": "extracted value", "confidence": 0.0-1.0 }
  },
  "needsClarification": false,
  "clarificationQuestion": null
}`,

  'onboarding.extract-fields': `Extract specific business fields from the user's response.

User Response: {userResponse}
Fields to Extract: {fieldsToExtract}
Existing Profile: {existingProfile}

For each field, extract the value and provide a confidence score (0.0-1.0).
Only include fields that can be reasonably extracted from the response.

Respond with JSON only:
{
  "extractions": [
    {
      "field": "fieldName",
      "value": "extracted value or appropriate type",
      "confidence": 0.85,
      "reasoning": "brief explanation of how this was extracted"
    }
  ]
}`,

  'onboarding.generate-summary': `Generate a comprehensive business profile summary based on the completed onboarding interview.

Business Name: {businessName}
Interview Data: {interviewData}

Create:
1. A compelling 2-3 paragraph summary describing the business
2. A brand voice description for how they should communicate with customers
3. 3-5 platform recommendations based on their goals and challenges

Respond with JSON only:
{
  "aiSummary": "2-3 paragraph summary that captures who they are, what they do, and what makes them special",
  "brandVoice": "Description of their ideal communication style with customers based on their preferences",
  "recommendations": [
    {
      "title": "Recommendation title",
      "description": "Why this matters and how to use it",
      "feature": "Related platform feature (e.g., 'AI Scheduling', 'Smart Follow-ups', 'Review Requests')"
    }
  ]
}`,
};

/** All prompt templates merged into a single lookup. */
export const PROMPT_TEMPLATES: Record<string, string> = {
  ...QUOTE_TEMPLATES,
  ...PAYMENT_TEMPLATES,
  ...NOSHOW_TEMPLATES,
  ...REVIEW_TEMPLATES,
  ...RETENTION_TEMPLATES,
  ...DISPATCH_TEMPLATES,
  ...COMMS_TEMPLATES,
  ...COPILOT_TEMPLATES,
  ...AGENT_TEMPLATES,
  ...ONBOARDING_TEMPLATES,
};

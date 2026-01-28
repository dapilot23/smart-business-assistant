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
};

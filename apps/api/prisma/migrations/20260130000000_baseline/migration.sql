-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'DISPATCHER', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BASIC', 'INTERMEDIATE', 'EXPERT');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('QUEUED', 'RINGING', 'IN_PROGRESS', 'FORWARDING', 'ENDED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('NOT_STARTED', 'EN_ROUTE', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobPhotoType" AS ENUM ('BEFORE', 'DURING', 'AFTER');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('PENDING', 'SENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewRequestStatus" AS ENUM ('PENDING', 'SENT', 'CLICKED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "OutboundCampaignType" AS ENUM ('APPOINTMENT_REMINDER', 'FOLLOW_UP_SURVEY', 'PAYMENT_REMINDER', 'MAINTENANCE_REMINDER', 'PROMOTIONAL');

-- CreateEnum
CREATE TYPE "OutboundCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "OutboundCallStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PhotoQuoteStatus" AS ENUM ('PENDING', 'ANALYZING', 'READY', 'ACCEPTED', 'REJECTED', 'CONVERTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PhotoComplexity" AS ENUM ('SIMPLE', 'MEDIUM', 'COMPLEX', 'REQUIRES_INSPECTION');

-- CreateEnum
CREATE TYPE "TechnicianLocationStatus" AS ENUM ('IDLE', 'EN_ROUTE', 'ON_SITE', 'BREAK', 'OFFLINE');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PENDING', 'APPLIED', 'IN_PROGRESS', 'COMPLETED', 'MODIFIED');

-- CreateEnum
CREATE TYPE "NpsSurveyStatus" AS ENUM ('PENDING', 'SENT', 'RESPONDED', 'REVIEW_PROMPTED', 'REVIEW_CLICKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EquipmentCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MaintenanceAlertType" AS ENUM ('AGE_BASED', 'USAGE_BASED', 'SEASONAL', 'WARRANTY_EXPIRING', 'OVERDUE_SERVICE', 'AI_PREDICTED', 'RECALL', 'EFFICIENCY');

-- CreateEnum
CREATE TYPE "AlertPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MaintenanceAlertStatus" AS ENUM ('PENDING', 'NOTIFIED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PricingRuleType" AS ENUM ('TIME_OF_DAY', 'DAY_OF_WEEK', 'DEMAND_BASED', 'URGENCY', 'SEASONAL', 'EARLY_BIRD', 'LOYALTY', 'PROMOTIONAL');

-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('STANDARD', 'NEXT_DAY', 'SAME_DAY', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL', 'IMESSAGE');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED', 'SPAM');

-- CreateEnum
CREATE TYPE "ConversationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageContentType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION', 'CONTACT', 'TEMPLATE');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateCategory" AS ENUM ('MARKETING', 'UTILITY', 'AUTHENTICATION');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'DISABLED');

-- CreateEnum
CREATE TYPE "AiFeedbackAction" AS ENUM ('ACCEPTED', 'EDITED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MessageIntent" AS ENUM ('INQUIRY', 'BOOKING_REQUEST', 'RESCHEDULE_REQUEST', 'CANCELLATION_REQUEST', 'COMPLAINT', 'FEEDBACK', 'EMERGENCY', 'FOLLOW_UP', 'GENERAL');

-- CreateEnum
CREATE TYPE "MessageSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'URGENT');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('REVENUE_SALES', 'CUSTOMER_SUCCESS', 'OPERATIONS', 'MARKETING');

-- CreateEnum
CREATE TYPE "InsightPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('CREATE_CAMPAIGN', 'SEND_SMS', 'SEND_EMAIL', 'SCHEDULE_APPOINTMENT', 'CREATE_QUOTE', 'APPLY_DISCOUNT', 'SCHEDULE_FOLLOW_UP', 'CREATE_SEGMENT');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'APPROVED', 'EXECUTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('SMS_BLAST', 'EMAIL_BLAST', 'DRIP_SEQUENCE', 'REFERRAL', 'SEASONAL');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "OnboardingMode" AS ENUM ('CHAT', 'VOICE', 'PHONE_CALL');

-- CreateEnum
CREATE TYPE "ConversationState" AS ENUM ('IDLE', 'USER_TYPING', 'PROCESSING', 'STREAMING', 'EXTRACTING', 'ERROR', 'LOCKED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TECHNICIAN',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "tenantId" TEXT NOT NULL,
    "clerkId" TEXT,
    "invitedBy" TEXT,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TECHNICIAN',
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "healthScore" INTEGER NOT NULL DEFAULT 50,
    "churnRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lifecycleStage" TEXT NOT NULL DEFAULT 'NEW',

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "price" DECIMAL(10,2),
    "tenantId" TEXT NOT NULL,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "maxPerDay" INTEGER,
    "leadTimeHours" INTEGER NOT NULL DEFAULT 24,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_availability" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT,
    "assignedTo" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "confirmationCode" TEXT,
    "manageToken" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "googleCalendarEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_reminders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT,
    "preferredDate" TIMESTAMP(3),
    "preferredStart" TEXT,
    "preferredEnd" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "notifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "quoteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_follow_ups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "quoteId" TEXT,
    "tenantId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "depositAmount" DECIMAL(10,2),
    "lateFeeApplied" BOOLEAN NOT NULL DEFAULT false,
    "lateFeeAmount" DECIMAL(10,2),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_reminders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_availability" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technician_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_off" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_off_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vapiCallId" TEXT NOT NULL,
    "callerPhone" TEXT NOT NULL,
    "direction" "CallDirection" NOT NULL DEFAULT 'INBOUND',
    "status" "CallStatus" NOT NULL DEFAULT 'QUEUED',
    "duration" INTEGER,
    "transcript" TEXT,
    "summary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_integrations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "calendarId" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "technicianId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "workSummary" TEXT,
    "materialsUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_photos" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "type" "JobPhotoType" NOT NULL DEFAULT 'DURING',
    "caption" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_broadcasts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentBy" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "status" "BroadcastStatus" NOT NULL DEFAULT 'PENDING',
    "targetRoles" "UserRole"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "sms_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_broadcast_recipients" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "sms_broadcast_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "businessHours" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "appointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "reminderHoursBefore" INTEGER NOT NULL DEFAULT 24,
    "autoConfirmBookings" BOOLEAN NOT NULL DEFAULT false,
    "reviewRequestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reviewRequestDelay" INTEGER NOT NULL DEFAULT 24,
    "quoteFollowUpEnabled" BOOLEAN NOT NULL DEFAULT true,
    "depositRequired" BOOLEAN NOT NULL DEFAULT false,
    "depositPercentage" INTEGER NOT NULL DEFAULT 50,
    "lateFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lateFeePercentage" INTEGER NOT NULL DEFAULT 5,
    "paymentReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "retentionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "retentionDormantDays" INTEGER NOT NULL DEFAULT 90,
    "googleReviewUrl" TEXT,
    "yelpReviewUrl" TEXT,
    "facebookReviewUrl" TEXT,
    "reviewTimingHours" INTEGER NOT NULL DEFAULT 3,
    "reviewMaxPerDay" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "ReviewRequestStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "platform" TEXT,
    "npsScore" INTEGER,
    "npsGated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_contexts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "lastServiceType" TEXT,
    "preferredTime" TEXT,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "aiSummary" TEXT,
    "preferences" JSONB,
    "lastInteraction" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_risk_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "noShowRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "churnRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "noShowFactors" JSONB,
    "paymentFactors" JSONB,
    "churnFactors" JSONB,
    "aiRiskSummary" TEXT,
    "recommendedAction" TEXT,
    "actionPriority" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "riskHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_risk_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OutboundCampaignType" NOT NULL,
    "status" "OutboundCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "template" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_calls" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "status" "OutboundCallStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "vapiCallId" TEXT,
    "outcome" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_quote_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "photoUrl" TEXT NOT NULL,
    "photoKey" TEXT,
    "aiAnalysis" JSONB,
    "issueDescription" TEXT,
    "suggestedService" TEXT,
    "estimatedPriceMin" DECIMAL(10,2),
    "estimatedPriceMax" DECIMAL(10,2),
    "confidence" DOUBLE PRECISION,
    "complexity" "PhotoComplexity" NOT NULL DEFAULT 'MEDIUM',
    "status" "PhotoQuoteStatus" NOT NULL DEFAULT 'PENDING',
    "customerNotes" TEXT,
    "staffNotes" TEXT,
    "convertedToQuote" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_preferences" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "preferredDays" INTEGER[],
    "preferredTimeStart" TEXT,
    "preferredTimeEnd" TEXT,
    "preferredTechnician" TEXT,
    "avoidDays" INTEGER[],
    "learningConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataPoints" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_locations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "status" "TechnicianLocationStatus" NOT NULL DEFAULT 'IDLE',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_locations" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geocoded" BOOLEAN NOT NULL DEFAULT false,
    "geocodedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optimized_routes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalDistance" DOUBLE PRECISION,
    "totalDuration" INTEGER,
    "stops" JSONB NOT NULL,
    "optimizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "status" "RouteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "optimized_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_auth" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "verificationCode" TEXT,
    "codeExpiry" TIMESTAMP(3),
    "magicLinkToken" TEXT,
    "magicLinkExpiry" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_sessions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerAuthId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nps_surveys" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "score" INTEGER,
    "feedback" TEXT,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "reviewClicked" BOOLEAN NOT NULL DEFAULT false,
    "reviewPlatform" TEXT,
    "status" "NpsSurveyStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nps_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_equipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "equipmentType" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "installDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "lastServiceDate" TIMESTAMP(3),
    "nextServiceDue" TIMESTAMP(3),
    "condition" "EquipmentCondition" NOT NULL DEFAULT 'GOOD',
    "notes" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_service_history" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "serviceType" TEXT NOT NULL,
    "description" TEXT,
    "cost" DECIMAL(10,2),
    "partsReplaced" TEXT,
    "technicianId" TEXT,
    "technicianName" TEXT,
    "condition" "EquipmentCondition",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_service_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_alerts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "equipmentId" TEXT,
    "alertType" "MaintenanceAlertType" NOT NULL,
    "priority" "AlertPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reasoning" TEXT,
    "confidence" DOUBLE PRECISION,
    "dueDate" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "dismissReason" TEXT,
    "convertedToCampaign" TEXT,
    "status" "MaintenanceAlertStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_metrics" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER,
    "dayOfWeek" INTEGER,
    "bookingCount" INTEGER NOT NULL DEFAULT 0,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "cancelledJobs" INTEGER NOT NULL DEFAULT 0,
    "capacityUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "avgJobDuration" INTEGER,
    "peakHour" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demand_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" "PricingRuleType" NOT NULL,
    "conditions" JSONB NOT NULL,
    "multiplierMin" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    "multiplierMax" DECIMAL(5,2) NOT NULL DEFAULT 1.5,
    "flatAdjustment" DECIMAL(10,2),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_pricing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "minPrice" DECIMAL(10,2),
    "maxPrice" DECIMAL(10,2),
    "urgentMultiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.5,
    "emergencyMultiplier" DECIMAL(5,2) NOT NULL DEFAULT 2.0,
    "dynamicPricingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_quote_history" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "serviceId" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "finalPrice" DECIMAL(10,2) NOT NULL,
    "appliedRules" JSONB NOT NULL,
    "urgencyLevel" "UrgencyLevel" NOT NULL DEFAULT 'STANDARD',
    "demandFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_quote_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_channels" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "channel" "ChannelType" NOT NULL,
    "channelId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_threads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT NOT NULL,
    "channel" "ChannelType" NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "ConversationPriority" NOT NULL DEFAULT 'NORMAL',
    "assignedTo" TEXT,
    "subject" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessagePreview" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "metadata" JSONB,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" "MessageContentType" NOT NULL DEFAULT 'TEXT',
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "mediaSize" INTEGER,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "externalId" TEXT,
    "senderName" TEXT,
    "senderPhone" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "category" "WhatsAppTemplateCategory" NOT NULL,
    "status" "WhatsAppTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "headerType" TEXT,
    "headerContent" TEXT,
    "bodyText" TEXT NOT NULL,
    "footerText" TEXT,
    "buttons" JSONB,
    "exampleValues" JSONB,
    "whatsappId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_replies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "shortcut" TEXT,
    "channels" "ChannelType"[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costCents" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_feedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "aiOutput" TEXT NOT NULL,
    "action" "AiFeedbackAction" NOT NULL,
    "humanEdit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "discountCode" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retention_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_intervals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "reminderDays" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_intervals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_skills" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "level" "SkillLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technician_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_classifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "intent" "MessageIntent" NOT NULL,
    "sentiment" "MessageSentiment" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "urgencyScore" INTEGER NOT NULL DEFAULT 0,
    "keywords" TEXT[],
    "suggestedRoute" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_responder_rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "intent" "MessageIntent",
    "sentiment" "MessageSentiment",
    "minUrgency" INTEGER NOT NULL DEFAULT 0,
    "maxUrgency" INTEGER NOT NULL DEFAULT 100,
    "responseTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_responder_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copilot_conversations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "copilot_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "report" JSONB NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_insights" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "insightType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "impactScore" DOUBLE PRECISION NOT NULL,
    "priority" "InsightPriority" NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "actionParams" JSONB,
    "actionLabel" TEXT NOT NULL,
    "status" "InsightStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "aiReasoning" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "triggerEvent" TEXT,
    "entitiesAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "insightsGenerated" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "errorMessage" TEXT,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "revenueAgentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "customerAgentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "operationsAgentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "marketingAgentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dashboardNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushMinPriority" "InsightPriority" NOT NULL DEFAULT 'HIGH',
    "emailDigestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailDigestFrequency" TEXT NOT NULL DEFAULT 'DAILY',
    "emailDigestRecipients" TEXT[],
    "revenueAgentSchedule" TEXT NOT NULL DEFAULT '0 8 * * *',
    "customerAgentSchedule" TEXT NOT NULL DEFAULT '0 9 * * *',
    "operationsAgentSchedule" TEXT NOT NULL DEFAULT '0 20 * * *',
    "marketingAgentSchedule" TEXT NOT NULL DEFAULT '0 10 * * 1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_actions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "insightId" TEXT,
    "copilotSessionId" TEXT,
    "actionType" "ActionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "executedBy" TEXT,
    "result" JSONB,
    "errorMessage" TEXT,
    "estimatedImpact" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ai_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contextual_suggestions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "suggestions" JSONB NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contextual_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "audienceSegmentId" TEXT,
    "audienceQuery" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "isAbTest" BOOLEAN NOT NULL DEFAULT false,
    "variants" JSONB,
    "winningVariant" TEXT,
    "channel" TEXT,
    "subject" TEXT,
    "content" TEXT,
    "senderName" TEXT,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "unsubscribeCount" INTEGER NOT NULL DEFAULT 0,
    "bounceCount" INTEGER NOT NULL DEFAULT 0,
    "conversionCount" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_steps" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "name" TEXT,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "delayHours" INTEGER NOT NULL DEFAULT 0,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "conditions" JSONB,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "conversionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL DEFAULT 1,
    "variant" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "bounceType" TEXT,
    "conversionValue" DECIMAL(10,2),
    "conversionType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audience_segments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiReasoning" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audience_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referredId" TEXT,
    "referredEmail" TEXT,
    "referredPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "convertedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),
    "referrerReward" TEXT,
    "referredReward" TEXT,
    "referrerRewardValue" DECIMAL(10,2),
    "referredRewardValue" DECIMAL(10,2),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "referrerRewardType" TEXT NOT NULL DEFAULT 'CREDIT',
    "referrerRewardValue" DECIMAL(10,2) NOT NULL DEFAULT 25,
    "referredRewardType" TEXT NOT NULL DEFAULT 'DISCOUNT_PERCENT',
    "referredRewardValue" DECIMAL(10,2) NOT NULL DEFAULT 10,
    "maxReferralsPerCustomer" INTEGER,
    "referralExpiryDays" INTEGER NOT NULL DEFAULT 90,
    "minPurchaseForReward" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasonal_demand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "week" INTEGER,
    "appointmentCount" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "newCustomers" INTEGER NOT NULL DEFAULT 0,
    "avgBookingValue" DECIMAL(10,2),
    "demandIndex" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "revenueIndex" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasonal_demand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "industry" TEXT,
    "yearsInBusiness" INTEGER,
    "businessDescription" TEXT,
    "targetMarket" TEXT,
    "serviceArea" TEXT,
    "serviceAreaRadius" INTEGER,
    "timezone" TEXT,
    "revenueRange" TEXT,
    "averageJobValue" DECIMAL(10,2),
    "pricingModel" TEXT,
    "pricingPosition" TEXT,
    "repeatCustomerPercent" INTEGER,
    "teamSize" INTEGER,
    "hasFieldTechnicians" BOOLEAN NOT NULL DEFAULT false,
    "hasOfficeStaff" BOOLEAN NOT NULL DEFAULT false,
    "ownerRole" TEXT,
    "jobsPerWeek" INTEGER,
    "currentTools" JSONB,
    "leadSources" JSONB,
    "topLeadSource" TEXT,
    "communicationStyle" TEXT,
    "brandVoice" TEXT,
    "preferredChannels" TEXT[],
    "primaryGoals" JSONB,
    "currentChallenges" JSONB,
    "growthStage" TEXT,
    "revenueGoal" TEXT,
    "peakSeasons" JSONB,
    "slowSeasons" JSONB,
    "busyDays" INTEGER[],
    "knownCompetitors" JSONB,
    "marketPosition" TEXT,
    "competitiveAdvantage" TEXT,
    "winReasons" JSONB,
    "loseReasons" JSONB,
    "priceVsMarket" TEXT,
    "uniqueSellingPoints" JSONB,
    "observedPeakMonths" INTEGER[],
    "observedSlowMonths" INTEGER[],
    "observedAvgJobValue" DECIMAL(10,2),
    "observedJobsPerWeek" DOUBLE PRECISION,
    "observedResponseTime" INTEGER,
    "observedChannelMix" JSONB,
    "observedServiceMix" JSONB,
    "lastBehaviorUpdate" TIMESTAMP(3),
    "aiSummary" TEXT,
    "aiRecommendations" JSONB,
    "industryBenchmarks" JSONB,
    "growthTrajectory" TEXT,
    "predictedPeakMonths" INTEGER[],
    "profileCompleteness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profileConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fieldConfidence" JSONB,
    "inferredFields" TEXT[],
    "needsValidation" TEXT[],
    "lastValidated" TIMESTAMP(3),
    "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "onboardingMode" "OnboardingMode" NOT NULL DEFAULT 'CHAT',
    "completedQuestions" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 8,
    "interviewStartedAt" TIMESTAMP(3),
    "interviewCompletedAt" TIMESTAMP(3),
    "quickWinsDelivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_conversations" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "currentQuestionId" TEXT,
    "extractedData" JSONB,
    "state" "ConversationState" NOT NULL DEFAULT 'IDLE',
    "version" INTEGER NOT NULL DEFAULT 0,
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vapiCallId" TEXT,
    "voiceTranscript" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_templates" (
    "id" TEXT NOT NULL,
    "industrySlug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "typicalPeakMonths" INTEGER[],
    "typicalSlowMonths" INTEGER[],
    "avgJobValueResidential" DECIMAL(10,2),
    "avgJobValueCommercial" DECIMAL(10,2),
    "typicalTeamSize" JSONB,
    "emergencyMix" DOUBLE PRECISION,
    "suggestedServices" JSONB,
    "communicationNorms" TEXT,
    "typicalLeadSources" JSONB,
    "followUpQuestions" JSONB,
    "benchmarkData" JSONB,
    "benchmarkUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industry_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_email_key" ON "tenants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE INDEX "users_clerkId_idx" ON "users"("clerkId");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_token_key" ON "team_invitations"("token");

-- CreateIndex
CREATE INDEX "team_invitations_token_idx" ON "team_invitations"("token");

-- CreateIndex
CREATE INDEX "team_invitations_tenantId_idx" ON "team_invitations"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_tenantId_email_key" ON "team_invitations"("tenantId", "email");

-- CreateIndex
CREATE INDEX "customers_tenantId_idx" ON "customers"("tenantId");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "services_tenantId_idx" ON "services"("tenantId");

-- CreateIndex
CREATE INDEX "service_availability_serviceId_idx" ON "service_availability"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "service_availability_serviceId_dayOfWeek_key" ON "service_availability"("serviceId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_confirmationCode_key" ON "appointments"("confirmationCode");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_manageToken_key" ON "appointments"("manageToken");

-- CreateIndex
CREATE INDEX "appointments_tenantId_idx" ON "appointments"("tenantId");

-- CreateIndex
CREATE INDEX "appointments_customerId_idx" ON "appointments"("customerId");

-- CreateIndex
CREATE INDEX "appointments_scheduledAt_idx" ON "appointments"("scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_assignedTo_idx" ON "appointments"("assignedTo");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_manageToken_idx" ON "appointments"("manageToken");

-- CreateIndex
CREATE INDEX "appointment_reminders_tenantId_idx" ON "appointment_reminders"("tenantId");

-- CreateIndex
CREATE INDEX "appointment_reminders_appointmentId_idx" ON "appointment_reminders"("appointmentId");

-- CreateIndex
CREATE INDEX "appointment_reminders_status_scheduledAt_idx" ON "appointment_reminders"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "waitlist_tenantId_idx" ON "waitlist"("tenantId");

-- CreateIndex
CREATE INDEX "waitlist_serviceId_status_idx" ON "waitlist"("serviceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "quotes"("quoteNumber");

-- CreateIndex
CREATE INDEX "quotes_tenantId_idx" ON "quotes"("tenantId");

-- CreateIndex
CREATE INDEX "quotes_customerId_idx" ON "quotes"("customerId");

-- CreateIndex
CREATE INDEX "quote_items_quoteId_idx" ON "quote_items"("quoteId");

-- CreateIndex
CREATE INDEX "quote_follow_ups_tenantId_idx" ON "quote_follow_ups"("tenantId");

-- CreateIndex
CREATE INDEX "quote_follow_ups_quoteId_idx" ON "quote_follow_ups"("quoteId");

-- CreateIndex
CREATE INDEX "quote_follow_ups_status_scheduledAt_idx" ON "quote_follow_ups"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_tenantId_idx" ON "invoices"("tenantId");

-- CreateIndex
CREATE INDEX "invoices_customerId_idx" ON "invoices"("customerId");

-- CreateIndex
CREATE INDEX "invoices_quoteId_idx" ON "invoices"("quoteId");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "payment_reminders_tenantId_idx" ON "payment_reminders"("tenantId");

-- CreateIndex
CREATE INDEX "payment_reminders_invoiceId_idx" ON "payment_reminders"("invoiceId");

-- CreateIndex
CREATE INDEX "payment_reminders_status_scheduledAt_idx" ON "payment_reminders"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "technician_availability_tenantId_idx" ON "technician_availability"("tenantId");

-- CreateIndex
CREATE INDEX "technician_availability_userId_idx" ON "technician_availability"("userId");

-- CreateIndex
CREATE INDEX "technician_availability_dayOfWeek_idx" ON "technician_availability"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "technician_availability_tenantId_userId_dayOfWeek_key" ON "technician_availability"("tenantId", "userId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "time_off_tenantId_idx" ON "time_off"("tenantId");

-- CreateIndex
CREATE INDEX "time_off_userId_idx" ON "time_off"("userId");

-- CreateIndex
CREATE INDEX "time_off_startDate_endDate_idx" ON "time_off"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "call_logs_vapiCallId_key" ON "call_logs"("vapiCallId");

-- CreateIndex
CREATE INDEX "call_logs_tenantId_idx" ON "call_logs"("tenantId");

-- CreateIndex
CREATE INDEX "call_logs_vapiCallId_idx" ON "call_logs"("vapiCallId");

-- CreateIndex
CREATE INDEX "call_logs_callerPhone_idx" ON "call_logs"("callerPhone");

-- CreateIndex
CREATE INDEX "call_logs_status_idx" ON "call_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_integrations_tenantId_key" ON "calendar_integrations"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_appointmentId_key" ON "jobs"("appointmentId");

-- CreateIndex
CREATE INDEX "jobs_tenantId_idx" ON "jobs"("tenantId");

-- CreateIndex
CREATE INDEX "jobs_appointmentId_idx" ON "jobs"("appointmentId");

-- CreateIndex
CREATE INDEX "jobs_technicianId_idx" ON "jobs"("technicianId");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "job_photos_jobId_idx" ON "job_photos"("jobId");

-- CreateIndex
CREATE INDEX "sms_broadcasts_tenantId_idx" ON "sms_broadcasts"("tenantId");

-- CreateIndex
CREATE INDEX "sms_broadcasts_status_idx" ON "sms_broadcasts"("status");

-- CreateIndex
CREATE INDEX "sms_broadcast_recipients_broadcastId_idx" ON "sms_broadcast_recipients"("broadcastId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenantId_key" ON "tenant_settings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "review_requests_jobId_key" ON "review_requests"("jobId");

-- CreateIndex
CREATE INDEX "review_requests_tenantId_idx" ON "review_requests"("tenantId");

-- CreateIndex
CREATE INDEX "review_requests_status_idx" ON "review_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "customer_contexts_customerId_key" ON "customer_contexts"("customerId");

-- CreateIndex
CREATE INDEX "customer_contexts_tenantId_idx" ON "customer_contexts"("tenantId");

-- CreateIndex
CREATE INDEX "customer_contexts_customerId_idx" ON "customer_contexts"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_risk_profiles_customerId_key" ON "customer_risk_profiles"("customerId");

-- CreateIndex
CREATE INDEX "customer_risk_profiles_tenantId_idx" ON "customer_risk_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "customer_risk_profiles_customerId_idx" ON "customer_risk_profiles"("customerId");

-- CreateIndex
CREATE INDEX "customer_risk_profiles_overallRisk_idx" ON "customer_risk_profiles"("overallRisk");

-- CreateIndex
CREATE INDEX "customer_risk_profiles_riskLevel_idx" ON "customer_risk_profiles"("riskLevel");

-- CreateIndex
CREATE INDEX "outbound_campaigns_tenantId_idx" ON "outbound_campaigns"("tenantId");

-- CreateIndex
CREATE INDEX "outbound_campaigns_status_idx" ON "outbound_campaigns"("status");

-- CreateIndex
CREATE INDEX "outbound_campaigns_scheduledFor_idx" ON "outbound_campaigns"("scheduledFor");

-- CreateIndex
CREATE INDEX "outbound_calls_campaignId_idx" ON "outbound_calls"("campaignId");

-- CreateIndex
CREATE INDEX "outbound_calls_customerId_idx" ON "outbound_calls"("customerId");

-- CreateIndex
CREATE INDEX "outbound_calls_status_idx" ON "outbound_calls"("status");

-- CreateIndex
CREATE INDEX "outbound_calls_scheduledFor_idx" ON "outbound_calls"("scheduledFor");

-- CreateIndex
CREATE INDEX "photo_quote_requests_tenantId_idx" ON "photo_quote_requests"("tenantId");

-- CreateIndex
CREATE INDEX "photo_quote_requests_customerId_idx" ON "photo_quote_requests"("customerId");

-- CreateIndex
CREATE INDEX "photo_quote_requests_status_idx" ON "photo_quote_requests"("status");

-- CreateIndex
CREATE INDEX "photo_quote_requests_createdAt_idx" ON "photo_quote_requests"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_preferences_customerId_key" ON "customer_preferences"("customerId");

-- CreateIndex
CREATE INDEX "customer_preferences_tenantId_idx" ON "customer_preferences"("tenantId");

-- CreateIndex
CREATE INDEX "customer_preferences_customerId_idx" ON "customer_preferences"("customerId");

-- CreateIndex
CREATE INDEX "technician_locations_tenantId_idx" ON "technician_locations"("tenantId");

-- CreateIndex
CREATE INDEX "technician_locations_userId_idx" ON "technician_locations"("userId");

-- CreateIndex
CREATE INDEX "technician_locations_recordedAt_idx" ON "technician_locations"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_locations_customerId_key" ON "customer_locations"("customerId");

-- CreateIndex
CREATE INDEX "customer_locations_tenantId_idx" ON "customer_locations"("tenantId");

-- CreateIndex
CREATE INDEX "customer_locations_customerId_idx" ON "customer_locations"("customerId");

-- CreateIndex
CREATE INDEX "optimized_routes_tenantId_idx" ON "optimized_routes"("tenantId");

-- CreateIndex
CREATE INDEX "optimized_routes_technicianId_idx" ON "optimized_routes"("technicianId");

-- CreateIndex
CREATE INDEX "optimized_routes_date_idx" ON "optimized_routes"("date");

-- CreateIndex
CREATE UNIQUE INDEX "optimized_routes_tenantId_technicianId_date_key" ON "optimized_routes"("tenantId", "technicianId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "customer_auth_customerId_key" ON "customer_auth"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_auth_magicLinkToken_key" ON "customer_auth"("magicLinkToken");

-- CreateIndex
CREATE INDEX "customer_auth_tenantId_idx" ON "customer_auth"("tenantId");

-- CreateIndex
CREATE INDEX "customer_auth_customerId_idx" ON "customer_auth"("customerId");

-- CreateIndex
CREATE INDEX "customer_auth_phone_idx" ON "customer_auth"("phone");

-- CreateIndex
CREATE INDEX "customer_auth_email_idx" ON "customer_auth"("email");

-- CreateIndex
CREATE INDEX "customer_auth_magicLinkToken_idx" ON "customer_auth"("magicLinkToken");

-- CreateIndex
CREATE UNIQUE INDEX "customer_sessions_token_key" ON "customer_sessions"("token");

-- CreateIndex
CREATE INDEX "customer_sessions_customerId_idx" ON "customer_sessions"("customerId");

-- CreateIndex
CREATE INDEX "customer_sessions_token_idx" ON "customer_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "nps_surveys_jobId_key" ON "nps_surveys"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "nps_surveys_token_key" ON "nps_surveys"("token");

-- CreateIndex
CREATE INDEX "nps_surveys_tenantId_idx" ON "nps_surveys"("tenantId");

-- CreateIndex
CREATE INDEX "nps_surveys_customerId_idx" ON "nps_surveys"("customerId");

-- CreateIndex
CREATE INDEX "nps_surveys_status_idx" ON "nps_surveys"("status");

-- CreateIndex
CREATE INDEX "nps_surveys_token_idx" ON "nps_surveys"("token");

-- CreateIndex
CREATE INDEX "customer_equipment_tenantId_idx" ON "customer_equipment"("tenantId");

-- CreateIndex
CREATE INDEX "customer_equipment_customerId_idx" ON "customer_equipment"("customerId");

-- CreateIndex
CREATE INDEX "customer_equipment_equipmentType_idx" ON "customer_equipment"("equipmentType");

-- CreateIndex
CREATE INDEX "customer_equipment_nextServiceDue_idx" ON "customer_equipment"("nextServiceDue");

-- CreateIndex
CREATE INDEX "equipment_service_history_equipmentId_idx" ON "equipment_service_history"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_service_history_tenantId_idx" ON "equipment_service_history"("tenantId");

-- CreateIndex
CREATE INDEX "equipment_service_history_serviceDate_idx" ON "equipment_service_history"("serviceDate");

-- CreateIndex
CREATE INDEX "maintenance_alerts_tenantId_idx" ON "maintenance_alerts"("tenantId");

-- CreateIndex
CREATE INDEX "maintenance_alerts_customerId_idx" ON "maintenance_alerts"("customerId");

-- CreateIndex
CREATE INDEX "maintenance_alerts_equipmentId_idx" ON "maintenance_alerts"("equipmentId");

-- CreateIndex
CREATE INDEX "maintenance_alerts_status_idx" ON "maintenance_alerts"("status");

-- CreateIndex
CREATE INDEX "maintenance_alerts_priority_idx" ON "maintenance_alerts"("priority");

-- CreateIndex
CREATE INDEX "maintenance_alerts_dueDate_idx" ON "maintenance_alerts"("dueDate");

-- CreateIndex
CREATE INDEX "demand_metrics_tenantId_idx" ON "demand_metrics"("tenantId");

-- CreateIndex
CREATE INDEX "demand_metrics_date_idx" ON "demand_metrics"("date");

-- CreateIndex
CREATE INDEX "demand_metrics_dayOfWeek_idx" ON "demand_metrics"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "demand_metrics_tenantId_date_hour_key" ON "demand_metrics"("tenantId", "date", "hour");

-- CreateIndex
CREATE INDEX "pricing_rules_tenantId_idx" ON "pricing_rules"("tenantId");

-- CreateIndex
CREATE INDEX "pricing_rules_ruleType_idx" ON "pricing_rules"("ruleType");

-- CreateIndex
CREATE INDEX "pricing_rules_isActive_idx" ON "pricing_rules"("isActive");

-- CreateIndex
CREATE INDEX "pricing_rules_priority_idx" ON "pricing_rules"("priority");

-- CreateIndex
CREATE INDEX "service_pricing_tenantId_idx" ON "service_pricing"("tenantId");

-- CreateIndex
CREATE INDEX "service_pricing_serviceId_idx" ON "service_pricing"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "service_pricing_tenantId_serviceId_key" ON "service_pricing"("tenantId", "serviceId");

-- CreateIndex
CREATE INDEX "price_quote_history_tenantId_idx" ON "price_quote_history"("tenantId");

-- CreateIndex
CREATE INDEX "price_quote_history_customerId_idx" ON "price_quote_history"("customerId");

-- CreateIndex
CREATE INDEX "price_quote_history_serviceId_idx" ON "price_quote_history"("serviceId");

-- CreateIndex
CREATE INDEX "price_quote_history_requestedAt_idx" ON "price_quote_history"("requestedAt");

-- CreateIndex
CREATE INDEX "message_channels_tenantId_idx" ON "message_channels"("tenantId");

-- CreateIndex
CREATE INDEX "message_channels_customerId_idx" ON "message_channels"("customerId");

-- CreateIndex
CREATE INDEX "message_channels_channel_idx" ON "message_channels"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "message_channels_tenantId_customerId_channel_key" ON "message_channels"("tenantId", "customerId", "channel");

-- CreateIndex
CREATE INDEX "conversation_threads_tenantId_idx" ON "conversation_threads"("tenantId");

-- CreateIndex
CREATE INDEX "conversation_threads_customerId_idx" ON "conversation_threads"("customerId");

-- CreateIndex
CREATE INDEX "conversation_threads_status_idx" ON "conversation_threads"("status");

-- CreateIndex
CREATE INDEX "conversation_threads_assignedTo_idx" ON "conversation_threads"("assignedTo");

-- CreateIndex
CREATE INDEX "conversation_threads_lastMessageAt_idx" ON "conversation_threads"("lastMessageAt");

-- CreateIndex
CREATE INDEX "messages_threadId_idx" ON "messages"("threadId");

-- CreateIndex
CREATE INDEX "messages_tenantId_idx" ON "messages"("tenantId");

-- CreateIndex
CREATE INDEX "messages_direction_idx" ON "messages"("direction");

-- CreateIndex
CREATE INDEX "messages_status_idx" ON "messages"("status");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_templates_tenantId_idx" ON "whatsapp_templates"("tenantId");

-- CreateIndex
CREATE INDEX "whatsapp_templates_category_idx" ON "whatsapp_templates"("category");

-- CreateIndex
CREATE INDEX "whatsapp_templates_status_idx" ON "whatsapp_templates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_templates_tenantId_name_language_key" ON "whatsapp_templates"("tenantId", "name", "language");

-- CreateIndex
CREATE INDEX "quick_replies_tenantId_idx" ON "quick_replies"("tenantId");

-- CreateIndex
CREATE INDEX "quick_replies_category_idx" ON "quick_replies"("category");

-- CreateIndex
CREATE INDEX "quick_replies_shortcut_idx" ON "quick_replies"("shortcut");

-- CreateIndex
CREATE INDEX "ai_usage_logs_tenantId_idx" ON "ai_usage_logs"("tenantId");

-- CreateIndex
CREATE INDEX "ai_usage_logs_tenantId_feature_idx" ON "ai_usage_logs"("tenantId", "feature");

-- CreateIndex
CREATE INDEX "ai_usage_logs_createdAt_idx" ON "ai_usage_logs"("createdAt");

-- CreateIndex
CREATE INDEX "ai_feedback_tenantId_idx" ON "ai_feedback"("tenantId");

-- CreateIndex
CREATE INDEX "ai_feedback_tenantId_feature_idx" ON "ai_feedback"("tenantId", "feature");

-- CreateIndex
CREATE INDEX "ai_feedback_createdAt_idx" ON "ai_feedback"("createdAt");

-- CreateIndex
CREATE INDEX "retention_campaigns_tenantId_idx" ON "retention_campaigns"("tenantId");

-- CreateIndex
CREATE INDEX "retention_campaigns_customerId_idx" ON "retention_campaigns"("customerId");

-- CreateIndex
CREATE INDEX "retention_campaigns_status_scheduledAt_idx" ON "retention_campaigns"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "retention_campaigns_tenantId_type_idx" ON "retention_campaigns"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "service_intervals_serviceId_key" ON "service_intervals"("serviceId");

-- CreateIndex
CREATE INDEX "service_intervals_tenantId_idx" ON "service_intervals"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "service_intervals_tenantId_serviceId_key" ON "service_intervals"("tenantId", "serviceId");

-- CreateIndex
CREATE INDEX "technician_skills_tenantId_idx" ON "technician_skills"("tenantId");

-- CreateIndex
CREATE INDEX "technician_skills_userId_idx" ON "technician_skills"("userId");

-- CreateIndex
CREATE INDEX "technician_skills_serviceId_idx" ON "technician_skills"("serviceId");

-- CreateIndex
CREATE INDEX "technician_skills_tenantId_serviceId_idx" ON "technician_skills"("tenantId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "technician_skills_userId_serviceId_key" ON "technician_skills"("userId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "message_classifications_messageId_key" ON "message_classifications"("messageId");

-- CreateIndex
CREATE INDEX "message_classifications_tenantId_idx" ON "message_classifications"("tenantId");

-- CreateIndex
CREATE INDEX "message_classifications_conversationId_idx" ON "message_classifications"("conversationId");

-- CreateIndex
CREATE INDEX "message_classifications_intent_idx" ON "message_classifications"("intent");

-- CreateIndex
CREATE INDEX "message_classifications_sentiment_idx" ON "message_classifications"("sentiment");

-- CreateIndex
CREATE INDEX "message_classifications_urgencyScore_idx" ON "message_classifications"("urgencyScore");

-- CreateIndex
CREATE INDEX "auto_responder_rules_tenantId_idx" ON "auto_responder_rules"("tenantId");

-- CreateIndex
CREATE INDEX "auto_responder_rules_isActive_idx" ON "auto_responder_rules"("isActive");

-- CreateIndex
CREATE INDEX "auto_responder_rules_intent_idx" ON "auto_responder_rules"("intent");

-- CreateIndex
CREATE INDEX "copilot_conversations_tenantId_idx" ON "copilot_conversations"("tenantId");

-- CreateIndex
CREATE INDEX "copilot_conversations_tenantId_userId_idx" ON "copilot_conversations"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "weekly_reports_tenantId_idx" ON "weekly_reports"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_reports_tenantId_weekStart_key" ON "weekly_reports"("tenantId", "weekStart");

-- CreateIndex
CREATE INDEX "agent_insights_tenantId_idx" ON "agent_insights"("tenantId");

-- CreateIndex
CREATE INDEX "agent_insights_tenantId_agentType_idx" ON "agent_insights"("tenantId", "agentType");

-- CreateIndex
CREATE INDEX "agent_insights_tenantId_status_idx" ON "agent_insights"("tenantId", "status");

-- CreateIndex
CREATE INDEX "agent_insights_tenantId_priority_idx" ON "agent_insights"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "agent_insights_entityType_entityId_idx" ON "agent_insights"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "agent_insights_expiresAt_idx" ON "agent_insights"("expiresAt");

-- CreateIndex
CREATE INDEX "agent_runs_tenantId_idx" ON "agent_runs"("tenantId");

-- CreateIndex
CREATE INDEX "agent_runs_tenantId_agentType_idx" ON "agent_runs"("tenantId", "agentType");

-- CreateIndex
CREATE INDEX "agent_runs_status_idx" ON "agent_runs"("status");

-- CreateIndex
CREATE INDEX "agent_runs_startedAt_idx" ON "agent_runs"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "agent_settings_tenantId_key" ON "agent_settings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_actions_insightId_key" ON "ai_actions"("insightId");

-- CreateIndex
CREATE INDEX "ai_actions_tenantId_idx" ON "ai_actions"("tenantId");

-- CreateIndex
CREATE INDEX "ai_actions_tenantId_status_idx" ON "ai_actions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ai_actions_insightId_idx" ON "ai_actions"("insightId");

-- CreateIndex
CREATE INDEX "ai_actions_expiresAt_idx" ON "ai_actions"("expiresAt");

-- CreateIndex
CREATE INDEX "contextual_suggestions_tenantId_idx" ON "contextual_suggestions"("tenantId");

-- CreateIndex
CREATE INDEX "contextual_suggestions_validUntil_idx" ON "contextual_suggestions"("validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "contextual_suggestions_tenantId_context_key" ON "contextual_suggestions"("tenantId", "context");

-- CreateIndex
CREATE INDEX "marketing_campaigns_tenantId_idx" ON "marketing_campaigns"("tenantId");

-- CreateIndex
CREATE INDEX "marketing_campaigns_tenantId_status_idx" ON "marketing_campaigns"("tenantId", "status");

-- CreateIndex
CREATE INDEX "marketing_campaigns_tenantId_type_idx" ON "marketing_campaigns"("tenantId", "type");

-- CreateIndex
CREATE INDEX "marketing_campaigns_scheduledAt_idx" ON "marketing_campaigns"("scheduledAt");

-- CreateIndex
CREATE INDEX "campaign_steps_campaignId_idx" ON "campaign_steps"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_steps_campaignId_stepNumber_key" ON "campaign_steps"("campaignId", "stepNumber");

-- CreateIndex
CREATE INDEX "campaign_recipients_campaignId_idx" ON "campaign_recipients"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_recipients_customerId_idx" ON "campaign_recipients"("customerId");

-- CreateIndex
CREATE INDEX "campaign_recipients_status_idx" ON "campaign_recipients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_recipients_campaignId_customerId_stepNumber_key" ON "campaign_recipients"("campaignId", "customerId", "stepNumber");

-- CreateIndex
CREATE INDEX "audience_segments_tenantId_idx" ON "audience_segments"("tenantId");

-- CreateIndex
CREATE INDEX "audience_segments_tenantId_isActive_idx" ON "audience_segments"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "audience_segments_tenantId_name_key" ON "audience_segments"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referralCode_key" ON "referrals"("referralCode");

-- CreateIndex
CREATE INDEX "referrals_tenantId_idx" ON "referrals"("tenantId");

-- CreateIndex
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");

-- CreateIndex
CREATE INDEX "referrals_referredId_idx" ON "referrals"("referredId");

-- CreateIndex
CREATE INDEX "referrals_referralCode_idx" ON "referrals"("referralCode");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "referral_settings_tenantId_key" ON "referral_settings"("tenantId");

-- CreateIndex
CREATE INDEX "seasonal_demand_tenantId_idx" ON "seasonal_demand"("tenantId");

-- CreateIndex
CREATE INDEX "seasonal_demand_tenantId_year_idx" ON "seasonal_demand"("tenantId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "seasonal_demand_tenantId_year_month_key" ON "seasonal_demand"("tenantId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_tenantId_key" ON "business_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "business_profiles_tenantId_idx" ON "business_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "business_profiles_industry_idx" ON "business_profiles"("industry");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_conversations_businessProfileId_key" ON "onboarding_conversations"("businessProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "industry_templates_industrySlug_key" ON "industry_templates"("industrySlug");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_availability" ADD CONSTRAINT "service_availability_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminders" ADD CONSTRAINT "appointment_reminders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminders" ADD CONSTRAINT "appointment_reminders_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_follow_ups" ADD CONSTRAINT "quote_follow_ups_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_follow_ups" ADD CONSTRAINT "quote_follow_ups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_availability" ADD CONSTRAINT "technician_availability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_availability" ADD CONSTRAINT "technician_availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_broadcasts" ADD CONSTRAINT "sms_broadcasts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_broadcast_recipients" ADD CONSTRAINT "sms_broadcast_recipients_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "sms_broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contexts" ADD CONSTRAINT "customer_contexts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_risk_profiles" ADD CONSTRAINT "customer_risk_profiles_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_calls" ADD CONSTRAINT "outbound_calls_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "outbound_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_preferences" ADD CONSTRAINT "customer_preferences_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_locations" ADD CONSTRAINT "technician_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_locations" ADD CONSTRAINT "customer_locations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_auth" ADD CONSTRAINT "customer_auth_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customerAuthId_fkey" FOREIGN KEY ("customerAuthId") REFERENCES "customer_auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps_surveys" ADD CONSTRAINT "nps_surveys_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_equipment" ADD CONSTRAINT "customer_equipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_service_history" ADD CONSTRAINT "equipment_service_history_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "customer_equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_alerts" ADD CONSTRAINT "maintenance_alerts_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "customer_equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "conversation_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_campaigns" ADD CONSTRAINT "retention_campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_campaigns" ADD CONSTRAINT "retention_campaigns_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_intervals" ADD CONSTRAINT "service_intervals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_intervals" ADD CONSTRAINT "service_intervals_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_skills" ADD CONSTRAINT "technician_skills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_skills" ADD CONSTRAINT "technician_skills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_skills" ADD CONSTRAINT "technician_skills_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_classifications" ADD CONSTRAINT "message_classifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_classifications" ADD CONSTRAINT "message_classifications_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_responder_rules" ADD CONSTRAINT "auto_responder_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copilot_conversations" ADD CONSTRAINT "copilot_conversations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_insights" ADD CONSTRAINT "agent_insights_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "agent_insights"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contextual_suggestions" ADD CONSTRAINT "contextual_suggestions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_audienceSegmentId_fkey" FOREIGN KEY ("audienceSegmentId") REFERENCES "audience_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_segments" ADD CONSTRAINT "audience_segments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasonal_demand" ADD CONSTRAINT "seasonal_demand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_conversations" ADD CONSTRAINT "onboarding_conversations_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;


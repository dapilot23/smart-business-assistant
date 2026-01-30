-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AnomalyStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TaskOwnerType" AS ENUM ('AI_AGENT', 'HUMAN');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskSourceType" AS ENUM ('INSIGHT', 'ACTION', 'SUGGESTION', 'COPILOT', 'EVENT', 'MANUAL');

-- AlterEnum
ALTER TYPE "AgentType" ADD VALUE 'FOUNDER';

-- CreateTable
CREATE TABLE "suggested_responses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT,
    "suggestion" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "tone" TEXT,
    "accepted" BOOLEAN,
    "editedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggested_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_anomalies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "status" "AnomalyStatus" NOT NULL DEFAULT 'OPEN',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "metrics" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tasks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "ownerType" "TaskOwnerType" NOT NULL,
    "ownerAgentType" "AgentType",
    "ownerUserId" TEXT,
    "createdByType" "TaskOwnerType" NOT NULL DEFAULT 'HUMAN',
    "createdByAgentType" "AgentType",
    "createdByUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "blockedReason" TEXT,
    "sourceType" "TaskSourceType",
    "sourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suggested_responses_tenantId_idx" ON "suggested_responses"("tenantId");

-- CreateIndex
CREATE INDEX "suggested_responses_conversationId_idx" ON "suggested_responses"("conversationId");

-- CreateIndex
CREATE INDEX "suggested_responses_messageId_idx" ON "suggested_responses"("messageId");

-- CreateIndex
CREATE INDEX "business_anomalies_tenantId_idx" ON "business_anomalies"("tenantId");

-- CreateIndex
CREATE INDEX "business_anomalies_status_idx" ON "business_anomalies"("status");

-- CreateIndex
CREATE INDEX "business_anomalies_severity_idx" ON "business_anomalies"("severity");

-- CreateIndex
CREATE INDEX "agent_tasks_tenantId_idx" ON "agent_tasks"("tenantId");

-- CreateIndex
CREATE INDEX "agent_tasks_tenantId_status_idx" ON "agent_tasks"("tenantId", "status");

-- CreateIndex
CREATE INDEX "agent_tasks_tenantId_ownerType_idx" ON "agent_tasks"("tenantId", "ownerType");

-- CreateIndex
CREATE INDEX "agent_tasks_tenantId_ownerAgentType_idx" ON "agent_tasks"("tenantId", "ownerAgentType");

-- CreateIndex
CREATE INDEX "agent_tasks_tenantId_priority_idx" ON "agent_tasks"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "agent_tasks_dueAt_idx" ON "agent_tasks"("dueAt");

-- AddForeignKey
ALTER TABLE "suggested_responses" ADD CONSTRAINT "suggested_responses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggested_responses" ADD CONSTRAINT "suggested_responses_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggested_responses" ADD CONSTRAINT "suggested_responses_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_anomalies" ADD CONSTRAINT "business_anomalies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


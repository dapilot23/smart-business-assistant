-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateTable
CREATE TABLE "communication_opt_outs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_opt_outs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "communication_opt_outs_tenantId_channel_value_key" ON "communication_opt_outs"("tenantId", "channel", "value");

-- CreateIndex
CREATE INDEX "communication_opt_outs_tenantId_idx" ON "communication_opt_outs"("tenantId");

-- CreateIndex
CREATE INDEX "communication_opt_outs_channel_value_idx" ON "communication_opt_outs"("channel", "value");

-- AddForeignKey
ALTER TABLE "communication_opt_outs" ADD CONSTRAINT "communication_opt_outs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "communication_opt_outs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communication_opt_outs" FORCE ROW LEVEL SECURITY;

-- Add tenant isolation policy
CREATE POLICY "tenant_isolation_policy" ON "communication_opt_outs"
  USING (check_tenant_access("tenantId"));

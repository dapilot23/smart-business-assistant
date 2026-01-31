-- AlterTable
ALTER TABLE "agent_settings" ADD COLUMN     "autopilotMode" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "maxDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 10;

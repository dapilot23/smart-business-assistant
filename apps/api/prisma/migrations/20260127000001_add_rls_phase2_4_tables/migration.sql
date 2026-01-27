-- Row Level Security Migration - Phase 2-4 Tables
-- This migration enables RLS on remaining tenant-scoped tables from Phase 2-4 features
-- and creates policies to enforce tenant isolation at the database level.

-- Note: The current_tenant_id() function already exists from the previous migration

-- =============================================================================
-- PHASE 2 TABLES
-- =============================================================================

-- Customer Contexts table
ALTER TABLE "customer_contexts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "customer_contexts"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Outbound Campaigns table
ALTER TABLE "outbound_campaigns" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "outbound_campaigns"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Outbound Calls table (child table - protected via campaign relationship)
ALTER TABLE "outbound_calls" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_through_parent" ON "outbound_calls"
  USING (
    current_tenant_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM "outbound_campaigns"
      WHERE "outbound_campaigns"."id" = "outbound_calls"."campaignId"
      AND "outbound_campaigns"."tenantId" = current_tenant_id()
    )
  );

-- Photo Quote Requests table
ALTER TABLE "photo_quote_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "photo_quote_requests"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Customer Preferences table
ALTER TABLE "customer_preferences" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "customer_preferences"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- =============================================================================
-- PHASE 3 TABLES
-- =============================================================================

-- Technician Locations table
ALTER TABLE "technician_locations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "technician_locations"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Customer Locations table
ALTER TABLE "customer_locations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "customer_locations"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Optimized Routes table
ALTER TABLE "optimized_routes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "optimized_routes"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Customer Auth table
ALTER TABLE "customer_auth" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "customer_auth"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Customer Sessions table (child table - protected via customer_auth relationship)
ALTER TABLE "customer_sessions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_through_parent" ON "customer_sessions"
  USING (
    current_tenant_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM "customer_auth"
      WHERE "customer_auth"."id" = "customer_sessions"."customerAuthId"
      AND "customer_auth"."tenantId" = current_tenant_id()
    )
  );

-- NPS Surveys table
ALTER TABLE "nps_surveys" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "nps_surveys"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Customer Equipment table
ALTER TABLE "customer_equipment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "customer_equipment"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Equipment Service History table
ALTER TABLE "equipment_service_history" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "equipment_service_history"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Maintenance Alerts table
ALTER TABLE "maintenance_alerts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "maintenance_alerts"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- =============================================================================
-- PHASE 4 TABLES
-- =============================================================================

-- Demand Metrics table
ALTER TABLE "demand_metrics" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "demand_metrics"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Pricing Rules table
ALTER TABLE "pricing_rules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "pricing_rules"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Service Pricing table
ALTER TABLE "service_pricing" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "service_pricing"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Price Quote History table
ALTER TABLE "price_quote_history" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "price_quote_history"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Message Channels table
ALTER TABLE "message_channels" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "message_channels"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Conversation Threads table
ALTER TABLE "conversation_threads" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "conversation_threads"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Messages table
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "messages"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- WhatsApp Templates table
ALTER TABLE "whatsapp_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "whatsapp_templates"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

-- Quick Replies table
ALTER TABLE "quick_replies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "quick_replies"
  USING (current_tenant_id() IS NULL OR "tenantId" = current_tenant_id());

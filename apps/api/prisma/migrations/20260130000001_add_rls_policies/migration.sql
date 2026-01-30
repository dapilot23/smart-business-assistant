-- Migration: Add Missing RLS Policies + Fix NULL Bypass Vulnerability
-- =============================================================================
-- This migration does two things:
--   1. Adds RLS for 3 tables that were missing policies (waitlist,
--      appointment_reminders, payment_reminders)
--   2. Fixes a critical security vulnerability where NULL/empty tenant context
--      allowed unrestricted access to ALL tenant data. The old pattern:
--        current_tenant_id() IS NULL OR "tenantId" = current_tenant_id()
--      meant that any request failing to set tenant context would bypass RLS
--      entirely. The new pattern is fail-closed: no tenant context = no access.
--      System operations must explicitly set app.rls_bypass = 'true'.
-- =============================================================================


-- =============================================================================
-- STEP 1: Enable RLS on the 3 missing tables
-- =============================================================================

ALTER TABLE "waitlist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waitlist" FORCE ROW LEVEL SECURITY;

ALTER TABLE "appointment_reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointment_reminders" FORCE ROW LEVEL SECURITY;

ALTER TABLE "payment_reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_reminders" FORCE ROW LEVEL SECURITY;


-- =============================================================================
-- STEP 2: Create the fail-closed tenant access check function
-- =============================================================================

CREATE OR REPLACE FUNCTION check_tenant_access(row_tenant_id TEXT) RETURNS BOOLEAN AS $$
BEGIN
  -- System operations bypass: only when explicitly set
  IF current_setting('app.rls_bypass', TRUE) = 'true' THEN
    RETURN TRUE;
  END IF;

  -- Normal tenant isolation: tenant must match
  -- If no tenant is set, deny access (fail-closed)
  IF current_setting('app.current_tenant_id', TRUE) IS NULL
     OR current_setting('app.current_tenant_id', TRUE) = '' THEN
    RETURN FALSE;
  END IF;

  RETURN row_tenant_id = current_setting('app.current_tenant_id', TRUE);
END;
$$ LANGUAGE plpgsql STABLE;

-- Variant for child tables that check via parent relationship
-- (not used directly in policies, but kept for documentation; child tables
--  use inline EXISTS with check_tenant_access on the parent)


-- =============================================================================
-- STEP 3: Drop ALL existing policies from ALL RLS-enabled tables
-- =============================================================================

-- Phase 1 direct-tenantId tables
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "users";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "customers";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "services";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "appointments";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "quotes";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "invoices";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "technician_availability";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "time_off";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "call_logs";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "calendar_integrations";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "jobs";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "sms_broadcasts";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "team_invitations";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "tenant_settings";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "review_requests";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "tenants";

-- Phase 1 parent-relationship (child) tables
DROP POLICY IF EXISTS "allow_through_parent" ON "quote_items";
DROP POLICY IF EXISTS "allow_through_parent" ON "invoice_items";
DROP POLICY IF EXISTS "allow_through_parent" ON "job_photos";
DROP POLICY IF EXISTS "allow_through_parent" ON "service_availability";
DROP POLICY IF EXISTS "allow_through_parent" ON "sms_broadcast_recipients";

-- Phase 2 tables
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "customer_contexts";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "outbound_campaigns";
DROP POLICY IF EXISTS "allow_through_parent" ON "outbound_calls";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "photo_quote_requests";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "customer_preferences";

-- Phase 3 tables
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "technician_locations";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "customer_locations";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "optimized_routes";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "customer_auth";
DROP POLICY IF EXISTS "allow_through_parent" ON "customer_sessions";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "nps_surveys";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "customer_equipment";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "equipment_service_history";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "maintenance_alerts";

-- Phase 4 tables
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "demand_metrics";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "pricing_rules";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "service_pricing";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "price_quote_history";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "message_channels";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "conversation_threads";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "messages";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "whatsapp_templates";
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "quick_replies";


-- =============================================================================
-- STEP 4: Also FORCE RLS on all previously-enabled tables
--         (previous migrations used ENABLE but not FORCE; FORCE ensures RLS
--          applies even to table owners)
-- =============================================================================

ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "customers" FORCE ROW LEVEL SECURITY;
ALTER TABLE "services" FORCE ROW LEVEL SECURITY;
ALTER TABLE "appointments" FORCE ROW LEVEL SECURITY;
ALTER TABLE "quotes" FORCE ROW LEVEL SECURITY;
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;
ALTER TABLE "technician_availability" FORCE ROW LEVEL SECURITY;
ALTER TABLE "time_off" FORCE ROW LEVEL SECURITY;
ALTER TABLE "call_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "calendar_integrations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "jobs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "sms_broadcasts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "team_invitations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenant_settings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "review_requests" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
ALTER TABLE "quote_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "invoice_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "job_photos" FORCE ROW LEVEL SECURITY;
ALTER TABLE "service_availability" FORCE ROW LEVEL SECURITY;
ALTER TABLE "sms_broadcast_recipients" FORCE ROW LEVEL SECURITY;
ALTER TABLE "customer_contexts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "outbound_campaigns" FORCE ROW LEVEL SECURITY;
ALTER TABLE "outbound_calls" FORCE ROW LEVEL SECURITY;
ALTER TABLE "photo_quote_requests" FORCE ROW LEVEL SECURITY;
ALTER TABLE "customer_preferences" FORCE ROW LEVEL SECURITY;
ALTER TABLE "technician_locations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "customer_locations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "optimized_routes" FORCE ROW LEVEL SECURITY;
ALTER TABLE "customer_auth" FORCE ROW LEVEL SECURITY;
ALTER TABLE "customer_sessions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "nps_surveys" FORCE ROW LEVEL SECURITY;
ALTER TABLE "customer_equipment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "equipment_service_history" FORCE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_alerts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "demand_metrics" FORCE ROW LEVEL SECURITY;
ALTER TABLE "pricing_rules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "service_pricing" FORCE ROW LEVEL SECURITY;
ALTER TABLE "price_quote_history" FORCE ROW LEVEL SECURITY;
ALTER TABLE "message_channels" FORCE ROW LEVEL SECURITY;
ALTER TABLE "conversation_threads" FORCE ROW LEVEL SECURITY;
ALTER TABLE "messages" FORCE ROW LEVEL SECURITY;
ALTER TABLE "whatsapp_templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "quick_replies" FORCE ROW LEVEL SECURITY;


-- =============================================================================
-- STEP 5: Recreate ALL policies using the fail-closed check_tenant_access()
-- =============================================================================

-- -------------------------
-- Direct tenantId tables
-- -------------------------

CREATE POLICY "tenant_isolation_policy" ON "users"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "customers"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "services"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "appointments"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "quotes"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "invoices"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "technician_availability"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "time_off"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "call_logs"
  USING (check_tenant_access("tenantId"));

-- calendar_integrations may not exist in all environments
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_integrations') THEN
    EXECUTE 'CREATE POLICY "tenant_isolation_policy" ON "calendar_integrations" USING (check_tenant_access("tenantId"))';
  END IF;
END $$;

CREATE POLICY "tenant_isolation_policy" ON "jobs"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "sms_broadcasts"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "team_invitations"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "tenant_settings"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "review_requests"
  USING (check_tenant_access("tenantId"));

-- tenants table: uses "id" instead of "tenantId"
CREATE POLICY "tenant_isolation_policy" ON "tenants"
  USING (check_tenant_access("id"));

-- Phase 2 direct tables
CREATE POLICY "tenant_isolation_policy" ON "customer_contexts"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "outbound_campaigns"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "photo_quote_requests"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "customer_preferences"
  USING (check_tenant_access("tenantId"));

-- Phase 3 direct tables
CREATE POLICY "tenant_isolation_policy" ON "technician_locations"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "customer_locations"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "optimized_routes"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "customer_auth"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "nps_surveys"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "customer_equipment"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "equipment_service_history"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "maintenance_alerts"
  USING (check_tenant_access("tenantId"));

-- Phase 4 direct tables
CREATE POLICY "tenant_isolation_policy" ON "demand_metrics"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "pricing_rules"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "service_pricing"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "price_quote_history"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "message_channels"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "conversation_threads"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "messages"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "whatsapp_templates"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "quick_replies"
  USING (check_tenant_access("tenantId"));

-- NEW: 3 previously-missing tables
CREATE POLICY "tenant_isolation_policy" ON "waitlist"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "appointment_reminders"
  USING (check_tenant_access("tenantId"));

CREATE POLICY "tenant_isolation_policy" ON "payment_reminders"
  USING (check_tenant_access("tenantId"));

-- -------------------------
-- Child / parent-relationship tables
-- -------------------------

-- Quote Items (protected via quotes parent)
CREATE POLICY "allow_through_parent" ON "quote_items"
  USING (
    check_tenant_access(
      (SELECT q."tenantId" FROM "quotes" q WHERE q."id" = "quote_items"."quoteId")
    )
  );

-- Invoice Items (protected via invoices parent)
CREATE POLICY "allow_through_parent" ON "invoice_items"
  USING (
    check_tenant_access(
      (SELECT i."tenantId" FROM "invoices" i WHERE i."id" = "invoice_items"."invoiceId")
    )
  );

-- Job Photos (protected via jobs parent)
CREATE POLICY "allow_through_parent" ON "job_photos"
  USING (
    check_tenant_access(
      (SELECT j."tenantId" FROM "jobs" j WHERE j."id" = "job_photos"."jobId")
    )
  );

-- Service Availability (protected via services parent)
CREATE POLICY "allow_through_parent" ON "service_availability"
  USING (
    check_tenant_access(
      (SELECT s."tenantId" FROM "services" s WHERE s."id" = "service_availability"."serviceId")
    )
  );

-- SMS Broadcast Recipients (protected via sms_broadcasts parent)
CREATE POLICY "allow_through_parent" ON "sms_broadcast_recipients"
  USING (
    check_tenant_access(
      (SELECT b."tenantId" FROM "sms_broadcasts" b WHERE b."id" = "sms_broadcast_recipients"."broadcastId")
    )
  );

-- Outbound Calls (protected via outbound_campaigns parent)
CREATE POLICY "allow_through_parent" ON "outbound_calls"
  USING (
    check_tenant_access(
      (SELECT c."tenantId" FROM "outbound_campaigns" c WHERE c."id" = "outbound_calls"."campaignId")
    )
  );

-- Customer Sessions (protected via customer_auth parent)
CREATE POLICY "allow_through_parent" ON "customer_sessions"
  USING (
    check_tenant_access(
      (SELECT a."tenantId" FROM "customer_auth" a WHERE a."id" = "customer_sessions"."customerAuthId")
    )
  );


-- =============================================================================
-- STEP 6: Update helper functions to support the new bypass mechanism
-- =============================================================================

-- Update set_tenant_context to also clear any bypass flag
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT) RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id, TRUE);
  PERFORM set_config('app.rls_bypass', '', TRUE);
END;
$$ LANGUAGE plpgsql;

-- Update clear_tenant_context to also clear bypass flag
CREATE OR REPLACE FUNCTION clear_tenant_context() RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', '', TRUE);
  PERFORM set_config('app.rls_bypass', '', TRUE);
END;
$$ LANGUAGE plpgsql;

-- New: set_system_context for operations that need full access
CREATE OR REPLACE FUNCTION set_system_context() RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.rls_bypass', 'true', TRUE);
  PERFORM set_config('app.current_tenant_id', '', TRUE);
END;
$$ LANGUAGE plpgsql;

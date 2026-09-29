-- ==============================================================================
-- MAHA POSHAN REGISTER - SCALABLE SCHOOL-CENTRIC TENANT MIGRATION
-- Migration File: supabase_school_centric_migration.sql
-- Goal: Establish 'schools' as the primary tenant, UDISE as unique identifier,
--       User -> Membership -> School relationship, 3-role RBAC,
--       orthogonal status architecture (verification, access, subscription),
--       and strict RLS tenant isolation.
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. Tenant Table: schools (Tenant Root)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  udise_number VARCHAR(11) NOT NULL,
  school_name TEXT NOT NULL,
  center_cluster TEXT,
  district TEXT,
  taluka TEXT,
  headmaster_name TEXT,
  incharge_teacher TEXT,
  cook_name TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'expired')),
  clerk_user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  duration_months INTEGER DEFAULT 6,
  expires_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_by TEXT,
  CONSTRAINT unique_udise_number UNIQUE (udise_number)
);

-- Ensure all core & status columns exist safely
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 6;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Status Architecture: Separate Orthogonal Statuses
-- 1. verification_status: PENDING, VERIFIED, MORE_INFO_REQUIRED, REJECTED
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'PENDING';
DO $$ BEGIN
  ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS chk_schools_verification_status;
  ALTER TABLE public.schools ADD CONSTRAINT chk_schools_verification_status 
    CHECK (verification_status IN ('PENDING', 'VERIFIED', 'MORE_INFO_REQUIRED', 'REJECTED'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. access_status: PENDING, ACTIVE, SUSPENDED, EXPIRED
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS access_status VARCHAR(30) DEFAULT 'PENDING';
DO $$ BEGIN
  ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS chk_schools_access_status;
  ALTER TABLE public.schools ADD CONSTRAINT chk_schools_access_status 
    CHECK (access_status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. subscription_status: TRIAL, ACTIVE, EXPIRED, CANCELLED
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) DEFAULT 'TRIAL';
DO $$ BEGIN
  ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS chk_schools_subscription_status;
  ALTER TABLE public.schools ADD CONSTRAINT chk_schools_subscription_status 
    CHECK (subscription_status IN ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. Scalable Verification & Auto-Validation Fields (Requirement 2 & 8)
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS admin_feedback TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS validation_result VARCHAR(30) DEFAULT 'REQUIRES_REVIEW';
DO $$ BEGIN
  ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS chk_schools_validation_result;
  ALTER TABLE public.schools ADD CONSTRAINT chk_schools_validation_result
    CHECK (validation_result IN ('VERIFIED', 'REQUIRES_REVIEW', 'DUPLICATE', 'INVALID'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Ensure unique UDISE constraint exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_udise_number'
  ) THEN
    ALTER TABLE public.schools ADD CONSTRAINT unique_udise_number UNIQUE (udise_number);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_schools_udise ON public.schools(udise_number);
CREATE INDEX IF NOT EXISTS idx_schools_clerk_user_id ON public.schools(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_schools_access_status ON public.schools(access_status);

-- ------------------------------------------------------------------------------
-- 3. User -> Membership -> School Relationship
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  role VARCHAR(30) NOT NULL DEFAULT 'TEACHER' CHECK (role IN ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_by TEXT,
  CONSTRAINT unique_user_school_membership UNIQUE (clerk_user_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_clerk_user_id ON public.memberships(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_school_id ON public.memberships(school_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON public.memberships(role);

-- Maintain backward-compatible user_roles table or view
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role VARCHAR(30) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_by TEXT,
  CONSTRAINT unique_clerk_user_role UNIQUE (clerk_user_id)
);

-- ------------------------------------------------------------------------------
-- 4. Helper Authentication & Identity Resolution Functions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    auth.uid()::text,
    current_setting('request.jwt.claim.sub', true),
    (NULLIF(current_setting('request.headers', true), '')::json ->> 'x-user-id')
  );
$$;

CREATE OR REPLACE FUNCTION requesting_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'email',
    current_setting('request.jwt.claim.email', true),
    (NULLIF(current_setting('request.headers', true), '')::json ->> 'x-user-email')
  );
$$;

-- Resolves user's school_id primarily through memberships (User -> Membership -> School)
CREATE OR REPLACE FUNCTION get_user_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT school_id FROM public.memberships WHERE clerk_user_id = requesting_user_id() AND is_active = true LIMIT 1),
    (SELECT school_id FROM public.user_roles WHERE clerk_user_id = requesting_user_id() AND is_active = true LIMIT 1),
    (SELECT id FROM public.schools WHERE clerk_user_id = requesting_user_id() LIMIT 1)
  );
$$;

-- Resolves user's role primarily through memberships
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.memberships WHERE clerk_user_id = requesting_user_id() AND is_active = true LIMIT 1),
    (SELECT role FROM public.user_roles WHERE clerk_user_id = requesting_user_id() AND is_active = true LIMIT 1),
    CASE 
      WHEN requesting_user_email() IN ('umardesh@gmail.com', 'mahaposhan@gmail.com', 'poshanragister@gmail.com') THEN 'SUPER_ADMIN'
      WHEN EXISTS (SELECT 1 FROM public.schools WHERE clerk_user_id = requesting_user_id()) THEN 'SCHOOL_ADMIN'
      ELSE 'TEACHER'
    END
  );
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role = 'SUPER_ADMIN' FROM public.memberships WHERE clerk_user_id = requesting_user_id() AND is_active = true LIMIT 1),
    (SELECT role = 'SUPER_ADMIN' FROM public.user_roles WHERE clerk_user_id = requesting_user_id() AND is_active = true LIMIT 1),
    (requesting_user_email() IN ('umardesh@gmail.com', 'mahaposhan@gmail.com', 'poshanragister@gmail.com')),
    false
  );
$$;

-- ------------------------------------------------------------------------------
-- 5. School-Owned Records: daily_entries & stock_inward
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  date DATE NOT NULL,
  dish_id TEXT NOT NULL,
  dish_name_mr TEXT NOT NULL,
  dish_name_en TEXT,
  student_count INTEGER NOT NULL CHECK (student_count >= 0 AND student_count <= 999), -- Max 3 digits (999)
  items JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_grains_pulses_kg NUMERIC(10,3) DEFAULT 0,
  total_vegetables_kg NUMERIC(10,3) DEFAULT 0,
  total_cooking_cost NUMERIC(10,2) DEFAULT 0,
  remarks TEXT,
  saved_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS updated_by TEXT;

CREATE INDEX IF NOT EXISTS idx_daily_entries_school_date ON public.daily_entries(school_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_entries_clerk_date ON public.daily_entries(clerk_user_id, date);

-- Unique constraint per school per date (prevent duplicate entries for same school)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_school_daily_entry_date'
  ) THEN
    ALTER TABLE public.daily_entries ADD CONSTRAINT unique_school_daily_entry_date UNIQUE (school_id, date);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Stock Inward Table
CREATE TABLE IF NOT EXISTS public.stock_inward (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  month_key VARCHAR(7) NOT NULL, -- YYYY-MM
  stock_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

ALTER TABLE public.stock_inward ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.stock_inward ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.stock_inward ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.stock_inward ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.stock_inward ADD COLUMN IF NOT EXISTS updated_by TEXT;

CREATE INDEX IF NOT EXISTS idx_stock_inward_school_month ON public.stock_inward(school_id, month_key);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_school_stock_inward_month'
  ) THEN
    ALTER TABLE public.stock_inward ADD CONSTRAINT unique_school_stock_inward_month UNIQUE (school_id, month_key);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ------------------------------------------------------------------------------
-- 6. Immutable Audit Logs Table & Automatic Trigger
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  user_email TEXT,
  user_role VARCHAR(30),
  action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'APPROVE_ACCESS', 'ROLE_CHANGE', 'STATUS_CHANGE'
  table_name VARCHAR(50) NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id ON public.audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_school_id UUID;
  v_user_id TEXT;
  v_user_email TEXT;
  v_user_role VARCHAR;
BEGIN
  v_user_id := COALESCE(requesting_user_id(), 'system');
  v_user_email := requesting_user_email();
  v_user_role := COALESCE(get_user_role(), CASE WHEN is_super_admin() THEN 'SUPER_ADMIN' ELSE 'UNKNOWN' END);

  IF TG_OP = 'DELETE' THEN
    v_school_id := CASE 
      WHEN TG_TABLE_NAME = 'schools' THEN OLD.id 
      ELSE OLD.school_id 
    END;

    INSERT INTO public.audit_logs (
      school_id, user_id, user_email, user_role, action, table_name, record_id, old_values, timestamp
    ) VALUES (
      v_school_id, v_user_id, v_user_email, v_user_role, 'DELETE', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD), now()
    );
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    v_school_id := CASE 
      WHEN TG_TABLE_NAME = 'schools' THEN NEW.id 
      ELSE NEW.school_id 
    END;

    INSERT INTO public.audit_logs (
      school_id, user_id, user_email, user_role, action, table_name, record_id, old_values, new_values, timestamp
    ) VALUES (
      v_school_id, v_user_id, v_user_email, v_user_role, 'UPDATE', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW), now()
    );
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    v_school_id := CASE 
      WHEN TG_TABLE_NAME = 'schools' THEN NEW.id 
      ELSE NEW.school_id 
    END;

    INSERT INTO public.audit_logs (
      school_id, user_id, user_email, user_role, action, table_name, record_id, new_values, timestamp
    ) VALUES (
      v_school_id, v_user_id, v_user_email, v_user_role, 'CREATE', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW), now()
    );
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. Tenant Immutability & Anti-Escalation Security Triggers
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_tenant_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Super Admins can override for administrative corrections
  IF NOT is_super_admin() THEN
    -- 1. Prevent changing school_id on any school-owned records
    IF TG_TABLE_NAME IN ('daily_entries', 'stock_inward') AND NEW.school_id IS DISTINCT FROM OLD.school_id THEN
      RAISE EXCEPTION 'Security Violation: Modifying school_id on existing records is strictly prohibited.';
    END IF;

    -- 2. Prevent role escalation on memberships
    IF TG_TABLE_NAME = 'memberships' THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Security Violation: Modifying user role without Super Admin privileges is prohibited.';
      END IF;
      IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
        RAISE EXCEPTION 'Security Violation: Reassigning user school assignment is prohibited.';
      END IF;
    END IF;

    -- 3. Prevent regular users from tampering with school status flags
    IF TG_TABLE_NAME = 'schools' THEN
      IF NEW.verification_status IS DISTINCT FROM OLD.verification_status OR
         NEW.access_status IS DISTINCT FROM OLD.access_status OR
         NEW.subscription_status IS DISTINCT FROM OLD.subscription_status OR
         NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Security Violation: Modifying school verification/access status without Super Admin privileges is prohibited.';
      END IF;
      IF NEW.udise_number IS DISTINCT FROM OLD.udise_number THEN
        RAISE EXCEPTION 'Security Violation: Modifying established UDISE number is prohibited.';
      END IF;
    END IF;
  END IF;

  -- Maintain updated_at and updated_by
  NEW.updated_at := now();
  NEW.updated_by := requesting_user_id();

  RETURN NEW;
END;
$$;

-- Status Synchronization Trigger (Keeps legacy 'status' in sync with orthogonal statuses)
CREATE OR REPLACE FUNCTION sync_school_statuses()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If legacy status is updated, propagate to access & verification if not explicitly set
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active' OR OLD.status IS NULL) THEN
    NEW.access_status := COALESCE(NEW.access_status, 'ACTIVE');
    NEW.verification_status := CASE WHEN NEW.verification_status = 'REJECTED' THEN 'REJECTED' ELSE 'VERIFIED' END;
    NEW.subscription_status := CASE WHEN NEW.subscription_status = 'CANCELLED' THEN 'CANCELLED' ELSE 'ACTIVE' END;
  ELSIF NEW.status = 'suspended' THEN
    NEW.access_status := 'SUSPENDED';
  ELSIF NEW.status = 'expired' THEN
    NEW.access_status := 'EXPIRED';
    NEW.subscription_status := 'EXPIRED';
  ELSIF NEW.status = 'pending' AND (OLD.status IS DISTINCT FROM 'pending' OR OLD.status IS NULL) THEN
    NEW.access_status := 'PENDING';
    NEW.verification_status := 'PENDING';
  END IF;

  -- If orthogonal statuses are updated, keep legacy status consistent
  IF NEW.access_status = 'ACTIVE' THEN
    NEW.status := 'active';
  ELSIF NEW.access_status = 'SUSPENDED' THEN
    NEW.status := 'suspended';
  ELSIF NEW.access_status = 'EXPIRED' THEN
    NEW.status := 'expired';
  ELSIF NEW.access_status = 'PENDING' THEN
    NEW.status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach Triggers
DROP TRIGGER IF EXISTS trg_sync_school_statuses ON public.schools;
CREATE TRIGGER trg_sync_school_statuses
  BEFORE INSERT OR UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION sync_school_statuses();

DROP TRIGGER IF EXISTS trg_immutability_schools ON public.schools;
CREATE TRIGGER trg_immutability_schools
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_immutability();

DROP TRIGGER IF EXISTS trg_immutability_memberships ON public.memberships;
CREATE TRIGGER trg_immutability_memberships
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_immutability();

DROP TRIGGER IF EXISTS trg_immutability_daily_entries ON public.daily_entries;
CREATE TRIGGER trg_immutability_daily_entries
  BEFORE UPDATE ON public.daily_entries
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_immutability();

DROP TRIGGER IF EXISTS trg_immutability_stock_inward ON public.stock_inward;
CREATE TRIGGER trg_immutability_stock_inward
  BEFORE UPDATE ON public.stock_inward
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_immutability();

-- Attach Audit Triggers
DROP TRIGGER IF EXISTS trg_audit_schools ON public.schools;
CREATE TRIGGER trg_audit_schools
  AFTER INSERT OR UPDATE OR DELETE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_memberships ON public.memberships;
CREATE TRIGGER trg_audit_memberships
  AFTER INSERT OR UPDATE OR DELETE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_daily_entries ON public.daily_entries;
CREATE TRIGGER trg_audit_daily_entries
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_entries
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_stock_inward ON public.stock_inward;
CREATE TRIGGER trg_audit_stock_inward
  AFTER INSERT OR UPDATE OR DELETE ON public.stock_inward
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- ------------------------------------------------------------------------------
-- 8. Row Level Security (RLS) Policies — Strict Tenant Isolation
-- ------------------------------------------------------------------------------
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_inward ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- --- A. Policies for 'schools' ---
DROP POLICY IF EXISTS schools_select_policy ON public.schools;
CREATE POLICY schools_select_policy ON public.schools
  FOR SELECT
  USING (
    is_super_admin() 
    OR id = get_user_school_id() 
    OR clerk_user_id = requesting_user_id()
  );

DROP POLICY IF EXISTS schools_insert_policy ON public.schools;
CREATE POLICY schools_insert_policy ON public.schools
  FOR INSERT
  WITH CHECK (
    is_super_admin() 
    OR clerk_user_id = requesting_user_id()
    OR requesting_user_id() IS NOT NULL
  );

DROP POLICY IF EXISTS schools_update_policy ON public.schools;
CREATE POLICY schools_update_policy ON public.schools
  FOR UPDATE
  USING (
    is_super_admin() 
    OR (id = get_user_school_id() AND get_user_role() IN ('SUPER_ADMIN', 'SCHOOL_ADMIN'))
    OR (clerk_user_id = requesting_user_id() AND get_user_school_id() IS NULL)
  );

DROP POLICY IF EXISTS schools_delete_policy ON public.schools;
CREATE POLICY schools_delete_policy ON public.schools
  FOR DELETE
  USING (is_super_admin());

-- --- B. Policies for 'memberships' ---
DROP POLICY IF EXISTS memberships_select_policy ON public.memberships;
CREATE POLICY memberships_select_policy ON public.memberships
  FOR SELECT
  USING (
    is_super_admin() 
    OR clerk_user_id = requesting_user_id() 
    OR school_id = get_user_school_id()
  );

DROP POLICY IF EXISTS memberships_insert_policy ON public.memberships;
CREATE POLICY memberships_insert_policy ON public.memberships
  FOR INSERT
  WITH CHECK (
    is_super_admin() 
    -- School admin can add teachers to their own school
    OR (get_user_role() = 'SCHOOL_ADMIN' AND school_id = get_user_school_id() AND role = 'TEACHER')
    -- Initial self-registration as school admin when user has no active membership
    OR (clerk_user_id = requesting_user_id() AND role = 'SCHOOL_ADMIN' AND NOT EXISTS (
      SELECT 1 FROM public.memberships WHERE clerk_user_id = requesting_user_id()
    ))
  );

DROP POLICY IF EXISTS memberships_update_policy ON public.memberships;
CREATE POLICY memberships_update_policy ON public.memberships
  FOR UPDATE
  USING (
    is_super_admin() 
    OR (get_user_role() = 'SCHOOL_ADMIN' AND school_id = get_user_school_id() AND role = 'TEACHER')
  );

DROP POLICY IF EXISTS memberships_delete_policy ON public.memberships;
CREATE POLICY memberships_delete_policy ON public.memberships
  FOR DELETE
  USING (
    is_super_admin() 
    OR (get_user_role() = 'SCHOOL_ADMIN' AND school_id = get_user_school_id() AND role = 'TEACHER')
  );

-- --- C. Policies for 'daily_entries' ---
DROP POLICY IF EXISTS daily_entries_select_policy ON public.daily_entries;
CREATE POLICY daily_entries_select_policy ON public.daily_entries
  FOR SELECT
  USING (
    is_super_admin() 
    OR school_id = get_user_school_id() 
    OR (school_id IS NULL AND clerk_user_id = requesting_user_id())
  );

DROP POLICY IF EXISTS daily_entries_insert_policy ON public.daily_entries;
CREATE POLICY daily_entries_insert_policy ON public.daily_entries
  FOR INSERT
  WITH CHECK (
    is_super_admin() 
    OR school_id = get_user_school_id() 
    OR (school_id IS NULL AND clerk_user_id = requesting_user_id())
  );

DROP POLICY IF EXISTS daily_entries_update_policy ON public.daily_entries;
CREATE POLICY daily_entries_update_policy ON public.daily_entries
  FOR UPDATE
  USING (
    is_super_admin() 
    OR school_id = get_user_school_id() 
    OR (school_id IS NULL AND clerk_user_id = requesting_user_id())
  );

DROP POLICY IF EXISTS daily_entries_delete_policy ON public.daily_entries;
CREATE POLICY daily_entries_delete_policy ON public.daily_entries
  FOR DELETE
  USING (
    is_super_admin() 
    OR (school_id = get_user_school_id() AND get_user_role() IN ('SUPER_ADMIN', 'SCHOOL_ADMIN'))
    OR (school_id IS NULL AND clerk_user_id = requesting_user_id())
  );

-- --- D. Policies for 'stock_inward' ---
DROP POLICY IF EXISTS stock_inward_select_policy ON public.stock_inward;
CREATE POLICY stock_inward_select_policy ON public.stock_inward
  FOR SELECT
  USING (
    is_super_admin() 
    OR school_id = get_user_school_id() 
    OR (school_id IS NULL AND clerk_user_id = requesting_user_id())
  );

DROP POLICY IF EXISTS stock_inward_insert_policy ON public.stock_inward;
CREATE POLICY stock_inward_insert_policy ON public.stock_inward
  FOR INSERT
  WITH CHECK (
    is_super_admin() 
    OR school_id = get_user_school_id() 
    OR (school_id IS NULL AND clerk_user_id = requesting_user_id())
  );

DROP POLICY IF EXISTS stock_inward_update_policy ON public.stock_inward;
CREATE POLICY stock_inward_update_policy ON public.stock_inward
  FOR UPDATE
  USING (
    is_super_admin() 
    OR school_id = get_user_school_id() 
    OR (school_id IS NULL AND clerk_user_id = requesting_user_id())
  );

DROP POLICY IF EXISTS stock_inward_delete_policy ON public.stock_inward;
CREATE POLICY stock_inward_delete_policy ON public.stock_inward
  FOR DELETE
  USING (
    is_super_admin() 
    OR (school_id = get_user_school_id() AND get_user_role() IN ('SUPER_ADMIN', 'SCHOOL_ADMIN'))
    OR (school_id IS NULL AND clerk_user_id = requesting_user_id())
  );

-- --- E. Policies for 'audit_logs' (IMMUTABLE APPEND-ONLY) ---
DROP POLICY IF EXISTS audit_logs_select_policy ON public.audit_logs;
CREATE POLICY audit_logs_select_policy ON public.audit_logs
  FOR SELECT
  USING (
    is_super_admin() 
    OR (school_id = get_user_school_id() AND get_user_role() = 'SCHOOL_ADMIN')
  );

DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
CREATE POLICY audit_logs_insert_policy ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE policy on audit_logs!

-- ------------------------------------------------------------------------------
-- 9. Safe Data Migration & Backfill
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  r_school RECORD;
BEGIN
  -- 1. Ensure existing schools have status and backfill orthogonal statuses
  UPDATE public.schools 
  SET 
    verification_status = CASE 
      WHEN status = 'active' THEN 'VERIFIED'
      ELSE 'PENDING'
    END,
    access_status = CASE 
      WHEN status = 'active' THEN 'ACTIVE'
      WHEN status = 'suspended' THEN 'SUSPENDED'
      WHEN status = 'expired' THEN 'EXPIRED'
      ELSE 'PENDING'
    END,
    subscription_status = CASE 
      WHEN status = 'active' THEN 'ACTIVE'
      WHEN status = 'expired' THEN 'EXPIRED'
      ELSE 'TRIAL'
    END
  WHERE verification_status IS NULL OR access_status IS NULL;

  -- 2. Backfill memberships from schools table
  FOR r_school IN SELECT id, clerk_user_id, user_email, user_name, headmaster_name FROM public.schools WHERE clerk_user_id IS NOT NULL LOOP
    -- Populate memberships table
    INSERT INTO public.memberships (clerk_user_id, school_id, user_email, user_name, role)
    VALUES (
      r_school.clerk_user_id,
      r_school.id,
      COALESCE(r_school.user_email, 'admin@mahaposhan.in'),
      COALESCE(r_school.user_name, r_school.headmaster_name, 'मुख्याध्यापक'),
      'SCHOOL_ADMIN'
    )
    ON CONFLICT (clerk_user_id, school_id) DO NOTHING;

    -- Also keep user_roles synchronized
    INSERT INTO public.user_roles (clerk_user_id, school_id, email, full_name, role)
    VALUES (
      r_school.clerk_user_id,
      r_school.id,
      COALESCE(r_school.user_email, 'admin@mahaposhan.in'),
      COALESCE(r_school.user_name, r_school.headmaster_name, 'मुख्याध्यापक'),
      'SCHOOL_ADMIN'
    )
    ON CONFLICT (clerk_user_id) DO UPDATE SET school_id = EXCLUDED.school_id;

    -- Backfill school_id in daily_entries & stock_inward
    UPDATE public.daily_entries 
    SET school_id = r_school.id 
    WHERE clerk_user_id = r_school.clerk_user_id AND school_id IS NULL;

    UPDATE public.stock_inward 
    SET school_id = r_school.id 
    WHERE clerk_user_id = r_school.clerk_user_id AND school_id IS NULL;
  END LOOP;

  -- 3. Seed Super Admin Memberships for authorized emails
  -- Umar Deshmukh
  INSERT INTO public.user_roles (clerk_user_id, email, full_name, role)
  VALUES ('super_admin_umardesh', 'umardesh@gmail.com', 'Super Admin (Umar Deshmukh)', 'SUPER_ADMIN')
  ON CONFLICT (clerk_user_id) DO UPDATE SET role = 'SUPER_ADMIN';

  -- MahaPoshan Admin
  INSERT INTO public.user_roles (clerk_user_id, email, full_name, role)
  VALUES ('super_admin_mahaposhan', 'mahaposhan@gmail.com', 'Super Admin (MahaPoshan)', 'SUPER_ADMIN')
  ON CONFLICT (clerk_user_id) DO UPDATE SET role = 'SUPER_ADMIN';

END $$;

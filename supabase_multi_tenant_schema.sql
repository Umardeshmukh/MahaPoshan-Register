-- ==============================================================================
-- MAHA POSHAN REGISTER - PRODUCTION MULTI-TENANT SECURITY ARCHITECTURE
-- Supabase PostgreSQL Row Level Security (RLS) & Role-Based Access Control (RBAC)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Helper Authentication & Identity Resolution Functions
-- Extracts current user identifier from Clerk JWT claim, Supabase Auth UID, or session header
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

-- 3. Schools Table (Tenant Root)
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
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'expired')),
  clerk_user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_by TEXT,
  CONSTRAINT unique_udise_number UNIQUE (udise_number)
);

-- Ensure columns exist if table was already created
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- 4. User Roles Table (User-to-Tenant Mapping & RBAC)
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

-- Index for fast lookup on user authentication
CREATE INDEX IF NOT EXISTS idx_user_roles_clerk_user_id ON public.user_roles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_school_id ON public.user_roles(school_id);

-- 5. Tenant Role Helper Functions
CREATE OR REPLACE FUNCTION get_user_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT school_id FROM public.user_roles 
  WHERE clerk_user_id = requesting_user_id() 
    AND is_active = true 
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.user_roles 
  WHERE clerk_user_id = requesting_user_id() 
    AND is_active = true 
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role = 'SUPER_ADMIN' FROM public.user_roles WHERE clerk_user_id = requesting_user_id() AND is_active = true LIMIT 1),
    (requesting_user_email() = 'umardesh@gmail.com'),
    false
  );
$$;

-- 6. Migrate & Secure Daily Entries Table (Aggregated Attendance, ZERO Student PII)
CREATE TABLE IF NOT EXISTS public.daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  date DATE NOT NULL,
  dish_id TEXT NOT NULL,
  dish_name_mr TEXT NOT NULL,
  dish_name_en TEXT,
  student_count INTEGER NOT NULL CHECK (student_count >= 0), -- Aggregate count only, zero student PII
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

-- Ensure all multi-tenant columns exist on daily_entries
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS updated_by TEXT;

CREATE INDEX IF NOT EXISTS idx_daily_entries_school_date ON public.daily_entries(school_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_entries_clerk_date ON public.daily_entries(clerk_user_id, date);

-- 7. Migrate & Secure Stock Inward Table
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

-- 8. Immutable Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  user_email TEXT,
  user_role VARCHAR(30),
  action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'APPROVE_ACCESS', 'ROLE_CHANGE', 'DATA_EXPORT'
  table_name VARCHAR(50) NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id ON public.audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- 9. Automatic Audit Trigger Function
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

-- 10. Tenant Immutability & Protection Trigger Function
-- Rejects attempts by regular users to modify school_id or user roles
CREATE OR REPLACE FUNCTION enforce_tenant_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Super admins can override if needed for administrative reassignment
  IF NOT is_super_admin() THEN
    IF TG_TABLE_NAME IN ('daily_entries', 'stock_inward') AND NEW.school_id IS DISTINCT FROM OLD.school_id THEN
      RAISE EXCEPTION 'Security Violation: Modifying school_id is strictly prohibited.';
    END IF;

    IF TG_TABLE_NAME = 'user_roles' AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Security Violation: Modifying user role without Super Admin privileges is prohibited.';
    END IF;

    IF TG_TABLE_NAME = 'user_roles' AND NEW.school_id IS DISTINCT FROM OLD.school_id THEN
      RAISE EXCEPTION 'Security Violation: Modifying user school assignment is prohibited.';
    END IF;
  END IF;

  -- Maintain updated_at and updated_by
  NEW.updated_at := now();
  NEW.updated_by := requesting_user_id();

  RETURN NEW;
END;
$$;

-- Attach Immutability Triggers
DROP TRIGGER IF EXISTS trg_immutability_daily_entries ON public.daily_entries;
CREATE TRIGGER trg_immutability_daily_entries
  BEFORE UPDATE ON public.daily_entries
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_immutability();

DROP TRIGGER IF EXISTS trg_immutability_stock_inward ON public.stock_inward;
CREATE TRIGGER trg_immutability_stock_inward
  BEFORE UPDATE ON public.stock_inward
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_immutability();

DROP TRIGGER IF EXISTS trg_immutability_user_roles ON public.user_roles;
CREATE TRIGGER trg_immutability_user_roles
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_immutability();

-- Attach Audit Triggers
DROP TRIGGER IF EXISTS trg_audit_schools ON public.schools;
CREATE TRIGGER trg_audit_schools
  AFTER INSERT OR UPDATE OR DELETE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_daily_entries ON public.daily_entries;
CREATE TRIGGER trg_audit_daily_entries
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_entries
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_stock_inward ON public.stock_inward;
CREATE TRIGGER trg_audit_stock_inward
  AFTER INSERT OR UPDATE OR DELETE ON public.stock_inward
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_inward ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. Policies for 'schools'
-- ------------------------------------------------------------------------------
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
    OR (id = get_user_school_id() AND get_user_role() = 'SCHOOL_ADMIN')
    OR (clerk_user_id = requesting_user_id() AND get_user_school_id() IS NULL)
  );

DROP POLICY IF EXISTS schools_delete_policy ON public.schools;
CREATE POLICY schools_delete_policy ON public.schools
  FOR DELETE
  USING (is_super_admin());

-- ------------------------------------------------------------------------------
-- B. Policies for 'user_roles'
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS user_roles_select_policy ON public.user_roles;
CREATE POLICY user_roles_select_policy ON public.user_roles
  FOR SELECT
  USING (
    is_super_admin() 
    OR clerk_user_id = requesting_user_id() 
    OR school_id = get_user_school_id()
  );

DROP POLICY IF EXISTS user_roles_insert_policy ON public.user_roles;
CREATE POLICY user_roles_insert_policy ON public.user_roles
  FOR INSERT
  WITH CHECK (
    is_super_admin() 
    OR (get_user_role() = 'SCHOOL_ADMIN' AND school_id = get_user_school_id() AND role = 'TEACHER')
    -- Initial self-registration as school admin
    OR (clerk_user_id = requesting_user_id() AND role = 'SCHOOL_ADMIN' AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE clerk_user_id = requesting_user_id()))
  );

DROP POLICY IF EXISTS user_roles_update_policy ON public.user_roles;
CREATE POLICY user_roles_update_policy ON public.user_roles
  FOR UPDATE
  USING (
    is_super_admin() 
    OR (get_user_role() = 'SCHOOL_ADMIN' AND school_id = get_user_school_id() AND role = 'TEACHER')
  );

DROP POLICY IF EXISTS user_roles_delete_policy ON public.user_roles;
CREATE POLICY user_roles_delete_policy ON public.user_roles
  FOR DELETE
  USING (
    is_super_admin() 
    OR (get_user_role() = 'SCHOOL_ADMIN' AND school_id = get_user_school_id() AND role = 'TEACHER')
  );

-- ------------------------------------------------------------------------------
-- C. Policies for 'daily_entries'
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- D. Policies for 'stock_inward'
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- E. Policies for 'audit_logs' (IMMUTABLE APPEND-ONLY)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS audit_logs_select_policy ON public.audit_logs;
CREATE POLICY audit_logs_select_policy ON public.audit_logs
  FOR SELECT
  USING (
    is_super_admin() 
    OR (school_id = get_user_school_id() AND get_user_role() = 'SCHOOL_ADMIN')
  );

-- INSERT allowed for system triggers or authenticated service
DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
CREATE POLICY audit_logs_insert_policy ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- NO UPDATE OR DELETE POLICIES CREATED FOR audit_logs (Immutable!)

-- ==============================================================================
-- 12. DATA EXPORT STORED PROCEDURE
-- ==============================================================================
CREATE OR REPLACE FUNCTION export_school_tenant_data(target_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_user_role VARCHAR;
  v_user_school_id UUID;
BEGIN
  v_user_role := get_user_role();
  v_user_school_id := get_user_school_id();

  -- Verify authorization: Must be Super Admin or School Admin of the requested school
  IF NOT (is_super_admin() OR (v_user_school_id = target_school_id AND v_user_role = 'SCHOOL_ADMIN')) THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to export data for this school.';
  END IF;

  SELECT jsonb_build_object(
    'exported_at', now(),
    'exported_by', requesting_user_id(),
    'school', (SELECT to_jsonb(s) FROM public.schools s WHERE s.id = target_school_id),
    'daily_entries', (SELECT COALESCE(jsonb_agg(to_jsonb(d)), '[]'::jsonb) FROM public.daily_entries d WHERE d.school_id = target_school_id),
    'stock_inward', (SELECT COALESCE(jsonb_agg(to_jsonb(si)), '[]'::jsonb) FROM public.stock_inward si WHERE si.school_id = target_school_id),
    'audit_summary', (SELECT count(*) FROM public.audit_logs al WHERE al.school_id = target_school_id)
  ) INTO v_result;

  -- Log the export event in audit_logs
  INSERT INTO public.audit_logs (
    school_id, user_id, user_email, user_role, action, table_name, record_id, timestamp
  ) VALUES (
    target_school_id, requesting_user_id(), requesting_user_email(), v_user_role, 'DATA_EXPORT', 'schools', target_school_id::text, now()
  );

  RETURN v_result;
END;
$$;

-- ==============================================================================
-- 13. SAFE DATA MIGRATION & BACKFILL FOR EXISTING RECORDS
-- ==============================================================================
DO $$
DECLARE
  r_school RECORD;
BEGIN
  -- 1. Ensure existing schools have valid UUID and status
  UPDATE public.schools SET status = 'active' WHERE status IS NULL;

  -- 2. Backfill school_id in daily_entries from schools table
  FOR r_school IN SELECT id, clerk_user_id FROM public.schools WHERE clerk_user_id IS NOT NULL LOOP
    UPDATE public.daily_entries 
    SET school_id = r_school.id 
    WHERE clerk_user_id = r_school.clerk_user_id AND school_id IS NULL;

    UPDATE public.stock_inward 
    SET school_id = r_school.id 
    WHERE clerk_user_id = r_school.clerk_user_id AND school_id IS NULL;

    -- Ensure School Admin role exists in user_roles
    INSERT INTO public.user_roles (clerk_user_id, school_id, email, full_name, role)
    SELECT 
      r_school.clerk_user_id, 
      r_school.id, 
      COALESCE(s.user_email, 'admin@mahaposhan.in'), 
      COALESCE(s.user_name, s.headmaster_name, 'मुख्याध्यापक'), 
      'SCHOOL_ADMIN'
    FROM public.schools s 
    WHERE s.id = r_school.id
    ON CONFLICT (clerk_user_id) DO UPDATE SET school_id = EXCLUDED.school_id;
  END LOOP;

  -- 3. Seed Super Admin Role for umardesh@gmail.com
  INSERT INTO public.user_roles (clerk_user_id, email, full_name, role)
  VALUES ('super_admin_umer', 'umardesh@gmail.com', 'Super Admin (Umer Deshmukh)', 'SUPER_ADMIN')
  ON CONFLICT (clerk_user_id) DO UPDATE SET role = 'SUPER_ADMIN';

END $$;

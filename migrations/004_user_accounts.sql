-- ============================================================================
-- PT SUMBER MINERAL ABADI (PT SMA) - PROCUREMENT MANAGEMENT SYSTEM
-- SUPABASE POSTGRESQL MIGRATION: 004_user_accounts.sql
-- ============================================================================

-- 1. Add username and password fields to public.user_profiles
ALTER TABLE public.user_profiles 
    ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);

-- 2. Seed Default Accounts for all 4 Roles
-- Role: PM (Project Manager), Admin (Logistics), Finance (Finance Admin), Users (HOD)

-- Project Manager Account
INSERT INTO public.user_profiles (full_name, username, role, is_active, password_hash)
VALUES (
    'Boyke Aldrinsyah Zein',
    'pm_admin',
    'project_manager',
    true,
    'password123'
)
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash;

-- Admin (Logistics) Account
INSERT INTO public.user_profiles (full_name, username, role, is_active, password_hash)
VALUES (
    'Rahmat Hidayat (Logistics Admin)',
    'admin_log',
    'admin_logistics',
    true,
    'password123'
)
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash;

-- Finance Admin Account
INSERT INTO public.user_profiles (full_name, username, role, is_active, password_hash)
VALUES (
    'Siti Nurhaliza, S.E. (Finance Admin)',
    'admin_fin',
    'admin_finance',
    true,
    'password123'
)
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash;

-- Users (HOD - HSE) Account
INSERT INTO public.user_profiles (department_id, full_name, username, role, is_active, password_hash)
SELECT 
    d.id,
    'Agus Salim (HOD HSE & K3)',
    'user_hse',
    'hod',
    true,
    'password123'
FROM public.departments d WHERE d.code = 'HSE'
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    department_id = EXCLUDED.department_id,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash;

-- Users (HOD - Mining) Account
INSERT INTO public.user_profiles (department_id, full_name, username, role, is_active, password_hash)
SELECT 

    d.id,
    'Hendro Pratama (HOD Mining Ops)',
    'user_mining',
    'hod',
    true,
    'password123'
FROM public.departments d WHERE d.code = 'MINING'
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    department_id = EXCLUDED.department_id,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash;

-- Users (HOD - Maintenance) Account
INSERT INTO public.user_profiles (department_id, full_name, username, role, is_active, password_hash)
SELECT 
    d.id,
    'Dedi Kurniawan (HOD Maintenance)',
    'user_maint',
    'hod',
    true,
    'password123'
FROM public.departments d WHERE d.code = 'MAINTENANCE'
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    department_id = EXCLUDED.department_id,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash;

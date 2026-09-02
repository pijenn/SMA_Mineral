-- ============================================================================
-- PT SUMBER MINERAL ABADI (PT SMA) - PROCUREMENT MANAGEMENT SYSTEM
-- SUPABASE POSTGRESQL MIGRATION: 005_auth_and_login_sync.sql
-- ============================================================================

-- 1. Ensure required columns exist on public.user_profiles
ALTER TABLE public.user_profiles 
    ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS password_hash TEXT,
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);

-- 2. DISABLE RLS or Grant Full Access to anon & authenticated on all tables
-- This ensures the client application can read and write directly to Supabase.
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_request_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_transaction_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_proofs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_weekly_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- 3. Seed / Ensure the 12 Mining Departments exist
INSERT INTO public.departments (id, code, name, description)
VALUES 
    ('00000000-0000-0000-0001-000000000001', 'MINING', 'Mining & Production Operations', 'Operasi penambangan bijih nikel dan overburden'),
    ('00000000-0000-0000-0001-000000000002', 'HAULING', 'Hauling & Ore Transport', 'Pengangkutan material dan logistik armada tambang'),
    ('00000000-0000-0000-0001-000000000003', 'CRUSHING', 'Crushing & Screening Plant', 'Pengolahan dan pemecahan bijih nikel'),
    ('00000000-0000-0000-0001-000000000004', 'MAINTENANCE', 'Heavy Equipment & Plant Maintenance', 'Perawatan alat berat excavator, dump truck, dan genset'),
    ('00000000-0000-0000-0001-000000000005', 'HSE', 'Health, Safety & Environment (K3)', 'Keselamatan kerja tambang, APD, dan pengelolaan lingkungan'),
    ('00000000-0000-0000-0001-000000000006', 'LOGISTICS', 'Supply Chain & Warehouse Site', 'Gudang site tambang dan ekspedisi logistik'),
    ('00000000-0000-0000-0001-000000000007', 'FINANCE', 'Finance, Accounting & Tax', 'Pengelolaan anggaran kas mingguan dan kuitansi'),
    ('00000000-0000-0000-0001-000000000008', 'HRGA', 'Human Resources & General Affairs', 'Personalia, mess tambang, konsumsi, dan umum'),
    ('00000000-0000-0000-0001-000000000009', 'IT', 'IT Infrastructure & Telecommunications', 'Jaringan radio komunikasi tambang, internet, dan server'),
    ('00000000-0000-0000-0001-000000000010', 'LAB', 'Quality Control & Assay Laboratory', 'Uji kadar nikel (Ni) dan sampling geologi'),
    ('00000000-0000-0000-0001-000000000011', 'ENV', 'Environmental & Mine Reclamation', 'Reklamasi lahan bekas tambang dan sediment trap'),
    ('00000000-0000-0000-0001-000000000012', 'SECURITY', 'Mine Security & Asset Protection', 'Pengamanan area konsesi tambang dan pos jaga')
ON CONFLICT (id) DO UPDATE SET 
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 4. Seed Active Procurement Period (Minggu ke-36, Sep 2026)
INSERT INTO public.procurement_periods (id, year, week_number, period_name, start_date, end_date, disbursed_budget, previous_rollover_balance, status, notes)
VALUES (
    '00000000-0000-0000-0002-000000000001',
    2026,
    36,
    'Minggu ke-36 (01 Sep - 07 Sep 2026)',
    '2026-09-01',
    '2026-09-07',
    200000000,
    45500000,
    'submission_open',
    'Siklus pengadaan operasional reguler minggu pertama September 2026.'
)
ON CONFLICT (id) DO UPDATE SET 
    period_name = EXCLUDED.period_name,
    disbursed_budget = EXCLUDED.disbursed_budget,
    previous_rollover_balance = EXCLUDED.previous_rollover_balance;

-- 5. Seed Real User Accounts into public.user_profiles
-- Project Manager Account
INSERT INTO public.user_profiles (id, full_name, username, role, is_active, password_hash)
VALUES (
    '00000000-0000-0000-0003-000000000001',
    'Bambang Wijaya, S.T.',
    'pm_admin',
    'project_manager',
    true,
    'password123'
)
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_active = true;

-- Admin Logistics Account
INSERT INTO public.user_profiles (id, full_name, username, role, is_active, password_hash)
VALUES (
    '00000000-0000-0000-0003-000000000002',
    'Rahmat Hidayat',
    'admin_log',
    'admin_logistics',
    true,
    'password123'
)
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_active = true;

-- Admin Finance Account
INSERT INTO public.user_profiles (id, full_name, username, role, is_active, password_hash)
VALUES (
    '00000000-0000-0000-0003-000000000003',
    'Siti Nurhaliza, S.E.',
    'admin_fin',
    'admin_finance',
    true,
    'password123'
)
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_active = true;

-- HOD HSE & K3 Account
INSERT INTO public.user_profiles (id, department_id, full_name, username, role, is_active, password_hash)
VALUES (
    '00000000-0000-0000-0003-000000000004',
    '00000000-0000-0000-0001-000000000005',
    'Agus Salim, S.K.M.',
    'user_hse',
    'hod',
    true,
    'password123'
)
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    department_id = EXCLUDED.department_id,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_active = true;

-- HOD Mining Operations Account
INSERT INTO public.user_profiles (id, department_id, full_name, username, role, is_active, password_hash)
VALUES (
    '00000000-0000-0000-0003-000000000005',
    '00000000-0000-0000-0001-000000000001',
    'Hendro Pratama, S.T.',
    'user_mining',
    'hod',
    true,
    'password123'
)
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    department_id = EXCLUDED.department_id,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_active = true;

-- HOD Heavy Equipment Maintenance Account
INSERT INTO public.user_profiles (id, department_id, full_name, username, role, is_active, password_hash)
VALUES (
    '00000000-0000-0000-0003-000000000006',
    '00000000-0000-0000-0001-000000000004',
    'Dedi Kurniawan, A.Md.',
    'user_maint',
    'hod',
    true,
    'password123'
)
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    department_id = EXCLUDED.department_id,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_active = true;

-- 6. Seed Initial Routine Catalog Items
INSERT INTO public.routine_items (id, department_id, item_code, name, specification, unit, estimated_unit_price, status)
VALUES 
    ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0001-000000000005', 'R-HSE-001', 'Helm Safety Proguard SNI & ANSI', 'Tipe V-Gard dengan strap putar', 'pcs', 125000, 'active'),
    ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0001-000000000005', 'R-HSE-002', 'Sepatu Safety Boots King Steel Toe', 'Standar tambang EN ISO 20345 S3', 'pasang', 450000, 'active'),
    ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0001-000000000005', 'R-HSE-003', 'Rompi Safety Reflektor 3M Hi-Vis', 'Warna oranye terang grade tambang', 'pcs', 75000, 'active'),
    ('00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0001-000000000004', 'R-MNT-001', 'Oli Mesin Diesel Meditran SX 15W-40', 'Drum 209 Liter untuk Excavator & Dump Truck', 'drum', 8500000, 'active'),
    ('00000000-0000-0000-0004-000000000005', '00000000-0000-0000-0001-000000000004', 'R-MNT-002', 'Grease Chassis EP-2 High Temp', 'Pail 15 Kg tahan panas & debu tambang', 'pail', 950000, 'active')
ON CONFLICT (id) DO NOTHING;

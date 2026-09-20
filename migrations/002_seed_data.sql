-- ============================================================================
-- PT SUMBER MINERAL ABADI (PT SMA) - PROCUREMENT MANAGEMENT SYSTEM
-- SUPABASE POSTGRESQL MIGRATION: 002_seed_data.sql
-- ============================================================================

-- Seed 12 Operational Departments
INSERT INTO public.departments (code, name, description)
VALUES 
    ('MINING', 'Mining & Operations', 'Site mining operations, heavy equipment, and extraction'),
    ('GEOLOGY', 'Geology & Exploration', 'Exploration, grade control, sampling, and surveying'),
    ('PROCESSING', 'Ore Processing & Stockpile', 'Crushing, screening, stockpile management, and blending'),
    ('HAULING', 'Hauling & Transportation', 'Trucking, dump trucks, and ore logistics'),
    ('PORT', 'Jetty & Port Operations', 'Barging, transshipment, vessel loading, and port equipment'),
    ('MAINTENANCE', 'Plant & Equipment Maintenance', 'Workshop, mechanical, electrical, and spare parts'),
    ('HSE', 'Health, Safety & Environment', 'K3, environmental compliance, PPE, and emergency response'),
    ('LOGISTICS', 'Logistics & Supply Chain', 'Warehouse, inventory, sourcing, and material delivery'),
    ('FINANCE', 'Finance & Accounting', 'Budgeting, disbursements, invoicing, and tax accounting'),
    ('HRGA', 'HR & General Affairs', 'Personnel, camp management, catering, security, and facilities'),
    ('IT', 'Information Technology', 'Network infrastructure, communication, systems, and hardware'),
    ('LEGAL', 'Legal & External Relations', 'Permits, community relations (CSR), and regulatory compliance')
ON CONFLICT (code) DO NOTHING;

-- Seed Sample Routine Items for Departments
INSERT INTO public.routine_items (department_id, item_code, name, description, unit, estimated_unit_price, status)
SELECT 
    d.id,
    'R-LOG-001',
    'Safety Helmet (White / Yellow) ANSI Certified',
    'Standard mining safety hard hat with chinstrap',
    'pcs',
    125000.00,
    'active'
FROM public.departments d WHERE d.code = 'HSE'
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO public.routine_items (department_id, item_code, name, description, unit, estimated_unit_price, status)
SELECT 
    d.id,
    'R-MAINT-001',
    'Hydraulic Oil ISO VG 68 (200L Drum)',
    'Standard heavy equipment hydraulic oil',
    'drum',
    5500000.00,
    'active'
FROM public.departments d WHERE d.code = 'MAINTENANCE'
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO public.routine_items (department_id, item_code, name, description, unit, estimated_unit_price, status)
SELECT 
    d.id,
    'R-GEO-001',
    'Sample Bags Heavy Duty (Pack of 100)',
    'Waterproof geological core and rock sampling bags',
    'pack',
    350000.00,
    'active'
FROM public.departments d WHERE d.code = 'GEOLOGY'
ON CONFLICT (item_code) DO NOTHING;

-- Seed Initial Procurement Period (e.g., Week 36 - 2026 / Minggu ke-4)
INSERT INTO public.procurement_periods (year, week_number, period_name, start_date, end_date, disbursed_budget, previous_rollover_balance, status)
VALUES 
    (2026, 36, 'Minggu ke-4 (September 2026)', '2026-09-22', '2026-09-28', 150000000.00, 0.00, 'submission_open')
ON CONFLICT (year, week_number) DO NOTHING;

-- ============================================================================
-- PT SUMBER MINERAL ABADI (PT SMA) - PROCUREMENT MANAGEMENT SYSTEM
-- SUPABASE POSTGRESQL MIGRATION: 001_initial_schema.sql
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ENUMS & DOMAIN TYPES
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('hod', 'admin_logistics', 'admin_finance', 'project_manager');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE item_category_type AS ENUM ('routine', 'additional');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE routine_item_status AS ENUM ('active', 'pending_approval', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE period_status AS ENUM ('draft', 'submission_open', 'in_review', 'purchasing', 'finalized', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('draft', 'submitted', 'needs_revision', 'validated', 'approved_by_pm', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE item_lifecycle_status AS ENUM (
        'draft',
        'submitted',
        'needs_revision',
        'validated',
        'pm_item_approved',
        'pm_item_rejected',
        'finance_budgeted',
        'pm_buy_approved',
        'deferred_deficit',
        'purchased',
        'processing_delivery',
        'in_transit',
        'received_at_site',
        'deferred_next_week'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE delivery_status_type AS ENUM ('none', 'processing', 'in_transit', 'delivered', 'delayed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE finance_report_status AS ENUM ('draft', 'submitted_by_finance', 'approved_by_pm', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('need_revision', 'prioritize_confirmation', 'purchase_update', 'delayed_arrival', 'approval_request', 'general');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. MASTER DATA: DEPARTMENTS (12 DEPARTMENTS OF PT SMA)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. USER PROFILES (Linked to Supabase auth.users)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    username VARCHAR(50) UNIQUE,
    password_hash TEXT,
    role user_role NOT NULL DEFAULT 'hod',
    phone_number VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);

-- ----------------------------------------------------------------------------
-- 4. ROUTINE ITEMS CATALOG (Master Data with Unique Item Code)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.routine_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    specification TEXT,
    unit VARCHAR(50) NOT NULL,
    estimated_unit_price NUMERIC(15, 2) DEFAULT 0,
    status routine_item_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routine_items_dept ON public.routine_items(department_id);
CREATE INDEX IF NOT EXISTS idx_routine_items_code ON public.routine_items(item_code);

-- ----------------------------------------------------------------------------
-- 5. PROCUREMENT PERIODS (Weekly Cycles & Disbursement)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.procurement_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INT NOT NULL,
    week_number INT NOT NULL,
    period_name VARCHAR(100) NOT NULL, -- e.g. "Week 35 - September 2026"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    disbursed_budget NUMERIC(15, 2) NOT NULL DEFAULT 0,
    previous_rollover_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status period_status NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_period_year_week UNIQUE (year, week_number)
);

CREATE INDEX IF NOT EXISTS idx_procurement_periods_dates ON public.procurement_periods(start_date, end_date);

-- ----------------------------------------------------------------------------
-- 6. PROCUREMENT REQUESTS (Departmental Weekly Submissions)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.procurement_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id UUID NOT NULL REFERENCES public.procurement_periods(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    submitted_by UUID REFERENCES public.user_profiles(id),
    status request_status NOT NULL DEFAULT 'draft',
    submission_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_request_dept_period UNIQUE (period_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_procurement_requests_period ON public.procurement_requests(period_id);
CREATE INDEX IF NOT EXISTS idx_procurement_requests_dept ON public.procurement_requests(department_id);

-- ----------------------------------------------------------------------------
-- 7. PROCUREMENT REQUEST ITEMS (Line Items with Live Stepper & Priority)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.procurement_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.procurement_requests(id) ON DELETE CASCADE,
    item_type item_category_type NOT NULL DEFAULT 'routine',
    routine_item_id UUID REFERENCES public.routine_items(id) ON DELETE RESTRICT,
    custom_item_name VARCHAR(255),
    specification TEXT,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    priority_level INT NOT NULL CHECK (priority_level BETWEEN 1 AND 3), -- 1=Routine/Low, 2=Medium, 3=Urgent/Mandatory
    
    -- Rollover / Backlog Tracking
    is_rollover BOOLEAN NOT NULL DEFAULT FALSE,
    origin_period_id UUID REFERENCES public.procurement_periods(id),
    
    -- Logistics Review & Sourcing
    logistics_notes TEXT,
    price_range_min NUMERIC(15, 2),
    price_range_max NUMERIC(15, 2),
    reference_link TEXT,
    final_unit_price NUMERIC(15, 2),
    estimated_total_price NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * COALESCE(final_unit_price, 0)) STORED,
    
    -- Approvals & Stepper
    pm_item_approval VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    pm_item_approval_notes TEXT,
    pm_buy_approval VARCHAR(20) DEFAULT 'pending',  -- pending, approved, deferred
    pm_buy_approval_notes TEXT,
    
    lifecycle_status item_lifecycle_status NOT NULL DEFAULT 'draft',
    delivery_status delivery_status_type NOT NULL DEFAULT 'none',
    eta_delivery DATE,
    received_at TIMESTAMPTZ,
    received_by UUID REFERENCES public.user_profiles(id),
    receipt_notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraint: if routine, routine_item_id must be provided; if additional, custom_item_name must be provided
    CONSTRAINT chk_item_type_data CHECK (
        (item_type = 'routine' AND routine_item_id IS NOT NULL) OR
        (item_type = 'additional' AND custom_item_name IS NOT NULL AND custom_item_name <> '')
    )
);

CREATE INDEX IF NOT EXISTS idx_request_items_req ON public.procurement_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_request_items_priority ON public.procurement_request_items(priority_level);
CREATE INDEX IF NOT EXISTS idx_request_items_status ON public.procurement_request_items(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_request_items_routine ON public.procurement_request_items(routine_item_id);

-- ----------------------------------------------------------------------------
-- 8. PURCHASE TRANSACTIONS & ACTUAL EXPENSES (Logistics Execution)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.purchase_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id UUID NOT NULL REFERENCES public.procurement_periods(id) ON DELETE RESTRICT,
    transaction_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. PO-SMA-2026-W35-001
    vendor_name VARCHAR(255) NOT NULL,
    invoice_number VARCHAR(100),
    purchase_date DATE NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cash',
    created_by UUID REFERENCES public.user_profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.purchase_transactions(id) ON DELETE CASCADE,
    request_item_id UUID NOT NULL REFERENCES public.procurement_request_items(id) ON DELETE RESTRICT,
    purchased_quantity NUMERIC(10, 2) NOT NULL CHECK (purchased_quantity > 0),
    actual_unit_price NUMERIC(15, 2) NOT NULL CHECK (actual_unit_price >= 0),
    actual_total_price NUMERIC(15, 2) NOT NULL CHECK (actual_total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_items_tx ON public.purchase_transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_items_req_item ON public.purchase_transaction_items(request_item_id);

-- ----------------------------------------------------------------------------
-- 9. PURCHASE PROOFS & RECEIPTS (Logistics Upload, Finance Verification)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.purchase_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.purchase_transactions(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size_bytes BIGINT,
    uploaded_by UUID REFERENCES public.user_profiles(id),
    verified_by_finance BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by UUID REFERENCES public.user_profiles(id),
    verified_at TIMESTAMPTZ,
    finance_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_proofs_tx ON public.purchase_proofs(transaction_id);

-- ----------------------------------------------------------------------------
-- 10. FINANCE WEEKLY REPORTS (Budget Recap, Surplus/Deficit Calculation)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.finance_weekly_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id UUID UNIQUE NOT NULL REFERENCES public.procurement_periods(id) ON DELETE RESTRICT,
    disbursed_budget NUMERIC(15, 2) NOT NULL DEFAULT 0,
    previous_rollover_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_budget_available NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_actual_expenditure NUMERIC(15, 2) NOT NULL DEFAULT 0,
    remaining_balance NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Positive = Surplus, Negative = Deficit
    status finance_report_status NOT NULL DEFAULT 'draft',
    submitted_by UUID REFERENCES public.user_profiles(id),
    submitted_at TIMESTAMPTZ,
    approved_by_pm UUID REFERENCES public.user_profiles(id),
    approved_at TIMESTAMPTZ,
    pm_approval_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. FINANCIAL JOURNAL ENTRIES (Automatic Accounting Records)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.financial_journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id UUID NOT NULL REFERENCES public.procurement_periods(id) ON DELETE RESTRICT,
    transaction_id UUID REFERENCES public.purchase_transactions(id) ON DELETE SET NULL,
    entry_date DATE NOT NULL,
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_period ON public.financial_journal_entries(period_id);

-- ----------------------------------------------------------------------------
-- 12. NOTIFICATIONS & ALERTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'general',
    related_request_id UUID REFERENCES public.procurement_requests(id) ON DELETE CASCADE,
    related_item_id UUID REFERENCES public.procurement_request_items(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);

-- ----------------------------------------------------------------------------
-- 13. HELPER FUNCTIONS & TRIGGERS (Automated Timestamps & Calculations)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_routine_items_updated_at BEFORE UPDATE ON public.routine_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_procurement_periods_updated_at BEFORE UPDATE ON public.procurement_periods FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_procurement_requests_updated_at BEFORE UPDATE ON public.procurement_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_procurement_request_items_updated_at BEFORE UPDATE ON public.procurement_request_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_purchase_transactions_updated_at BEFORE UPDATE ON public.purchase_transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_finance_weekly_reports_updated_at BEFORE UPDATE ON public.finance_weekly_reports FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 14. VIEWS: REAL-TIME CONSOLIDATION & BACKLOG
-- ----------------------------------------------------------------------------

-- View: Consolidated Procurement Pipeline with Live Status
CREATE OR REPLACE VIEW public.v_consolidated_procurement_pipeline AS
SELECT 
    pri.id AS request_item_id,
    p.id AS period_id,
    p.period_name,
    p.year,
    p.week_number,
    d.id AS department_id,
    d.code AS department_code,
    d.name AS department_name,
    pri.item_type,
    COALESCE(ri.item_code, 'NON-ROUTINE') AS item_code,
    COALESCE(ri.name, pri.custom_item_name) AS item_name,
    pri.specification,
    pri.quantity,
    pri.unit,
    pri.priority_level,
    pri.is_rollover,
    pri.final_unit_price,
    pri.estimated_total_price,
    pri.lifecycle_status,
    pri.delivery_status,
    pri.eta_delivery,
    pri.received_at,
    pri.pm_item_approval,
    pri.pm_buy_approval
FROM public.procurement_request_items pri
JOIN public.procurement_requests pr ON pr.id = pri.request_id
JOIN public.departments d ON d.id = pr.department_id
JOIN public.procurement_periods p ON p.id = pr.period_id
LEFT JOIN public.routine_items ri ON ri.id = pri.routine_item_id;

-- View: Unpurchased Backlog & Rollover Items
CREATE OR REPLACE VIEW public.v_backlog_rollover_items AS
SELECT * FROM public.v_consolidated_procurement_pipeline
WHERE lifecycle_status IN ('deferred_deficit', 'deferred_next_week')
   OR (priority_level = 3 AND lifecycle_status NOT IN ('purchased', 'processing_delivery', 'in_transit', 'received_at_site'));

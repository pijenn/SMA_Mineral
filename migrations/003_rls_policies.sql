-- ============================================================================
-- PT SUMBER MINERAL ABADI (PT SMA) - PROCUREMENT MANAGEMENT SYSTEM
-- SUPABASE POSTGRESQL MIGRATION: 003_rls_policies.sql
-- ============================================================================

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function to get current user department
CREATE OR REPLACE FUNCTION public.get_current_user_dept()
RETURNS UUID AS $$
    SELECT department_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. Departments: Readable by all authenticated users
CREATE POLICY "Departments are viewable by authenticated users"
    ON public.departments FOR SELECT
    TO authenticated
    USING (true);

-- 2. User Profiles: Users can view all active profiles, edit only their own
CREATE POLICY "Profiles viewable by authenticated users"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- 3. Routine Items: Viewable by all; manageable by HOD (for own dept), Logistics, and PM
CREATE POLICY "Routine items viewable by all authenticated"
    ON public.routine_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Routine items insertable by HOD, Logistics, PM"
    ON public.routine_items FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('admin_logistics', 'project_manager') OR
        (public.get_current_user_role() = 'hod' AND department_id = public.get_current_user_dept())
    );

-- 4. Procurement Periods: Viewable by all; manageable by Finance and PM
CREATE POLICY "Periods viewable by authenticated users"
    ON public.procurement_periods FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Periods manageable by Finance and PM"
    ON public.procurement_periods FOR ALL
    TO authenticated
    USING (public.get_current_user_role() IN ('admin_finance', 'project_manager'));

-- 5. Procurement Requests & Items:
-- HOD can view/edit own department's requests; Logistics, Finance, PM can view all.
CREATE POLICY "Requests viewable by relevant roles"
    ON public.procurement_requests FOR SELECT
    TO authenticated
    USING (
        public.get_current_user_role() IN ('admin_logistics', 'admin_finance', 'project_manager') OR
        department_id = public.get_current_user_dept()
    );

CREATE POLICY "HOD can create and edit own department requests"
    ON public.procurement_requests FOR ALL
    TO authenticated
    USING (
        department_id = public.get_current_user_dept() OR
        public.get_current_user_role() IN ('admin_logistics', 'project_manager')
    );

CREATE POLICY "Request items viewable by relevant roles"
    ON public.procurement_request_items FOR SELECT
    TO authenticated
    USING (
        public.get_current_user_role() IN ('admin_logistics', 'admin_finance', 'project_manager') OR
        EXISTS (
            SELECT 1 FROM public.procurement_requests pr
            WHERE pr.id = request_id AND pr.department_id = public.get_current_user_dept()
        )
    );

CREATE POLICY "Request items editable by HOD, Logistics, PM"
    ON public.procurement_request_items FOR ALL
    TO authenticated
    USING (
        public.get_current_user_role() IN ('admin_logistics', 'project_manager') OR
        EXISTS (
            SELECT 1 FROM public.procurement_requests pr
            WHERE pr.id = request_id AND pr.department_id = public.get_current_user_dept()
        )
    );

-- 6. Purchase Transactions & Proofs: Viewable by Logistics, Finance, PM
CREATE POLICY "Transactions viewable by Logistics, Finance, PM"
    ON public.purchase_transactions FOR SELECT
    TO authenticated
    USING (public.get_current_user_role() IN ('admin_logistics', 'admin_finance', 'project_manager'));

CREATE POLICY "Transactions manageable by Logistics and Finance"
    ON public.purchase_transactions FOR ALL
    TO authenticated
    USING (public.get_current_user_role() IN ('admin_logistics', 'admin_finance'));

CREATE POLICY "Purchase proofs viewable by Logistics, Finance, PM"
    ON public.purchase_proofs FOR SELECT
    TO authenticated
    USING (public.get_current_user_role() IN ('admin_logistics', 'admin_finance', 'project_manager'));

CREATE POLICY "Purchase proofs manageable by Logistics and Finance"
    ON public.purchase_proofs FOR ALL
    TO authenticated
    USING (public.get_current_user_role() IN ('admin_logistics', 'admin_finance'));

-- 7. Finance Reports & Journal: Viewable & manageable by Finance & PM
CREATE POLICY "Finance reports viewable by Finance and PM"
    ON public.finance_weekly_reports FOR SELECT
    TO authenticated
    USING (public.get_current_user_role() IN ('admin_finance', 'project_manager'));

CREATE POLICY "Finance reports manageable by Finance and PM"
    ON public.finance_weekly_reports FOR ALL
    TO authenticated
    USING (public.get_current_user_role() IN ('admin_finance', 'project_manager'));

-- 8. Notifications: Users only see their own notifications
CREATE POLICY "Notifications viewable by recipient"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (recipient_id = auth.uid());

CREATE POLICY "Notifications updatable by recipient (e.g., mark as read)"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (recipient_id = auth.uid());

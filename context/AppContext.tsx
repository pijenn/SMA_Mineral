'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Department,
  UserProfile,
  RoutineItem,
  ProcurementPeriod,
  PeriodStatus,
  ProcurementRequestItem,
  PurchaseTransaction,
  FinancialJournalEntry,
  FinanceWeeklyReport,
  AppNotification,
  UserRole,
  PriorityLevel,
  ItemLifecycleStatus,
  DeliveryStatusType,
  PurchaseProof,
} from '@/lib/types';
import { EditableImportedItem } from '@/lib/excelParser';
import { formatCurrency } from '@/lib/utils';

// Initial Fallback / Seed Constants if database table is initially blank
const INITIAL_DEPARTMENTS: Department[] = [
  { id: '325fbac3-295b-46b7-b06f-da2c16bf8204', code: 'GEOLOGY', name: 'Geology & Exploration', description: 'Exploration, grade control, sampling, and surveying' },
  { id: '81897f36-5651-4008-8369-0a6e59fb6093', code: 'PROCESSING', name: 'Ore Processing & Stockpile', description: 'Crushing, screening, stockpile management, and blending' },
  { id: '4943b2f3-16bd-4022-ae0a-e6f361dee001', code: 'HAULING', name: 'Hauling & Transportation', description: 'Pengangkutan material dan logistik armada tambang' },
  { id: 'cca03d07-f1d7-4450-9445-135275a26ca0', code: 'MAINTENANCE', name: 'Plant & Equipment Maintenance', description: 'Workshop, mechanical, electrical, and spare parts' },
  { id: 'fa312f2e-612c-4f36-957d-612c3d4b5f97', code: 'HSE', name: 'Health, Safety & Environment', description: 'K3, environmental compliance, PPE, and emergency response' },
  { id: 'a933ae0c-6748-491a-930c-5f1cda393d73', code: 'LOGISTICS', name: 'Logistics & Supply Chain', description: 'Warehouse, inventory, sourcing, and material delivery' },
  { id: '0c1b39fb-9eeb-4d8d-8bf9-ba3740ff33a4', code: 'FINANCE', name: 'Finance & Accounting', description: 'Budgeting, disbursements, invoicing, and tax accounting' },
  { id: '4768d320-0e9d-4a65-a742-97de51cab156', code: 'HRGA', name: 'HR & General Affairs', description: 'Personnel, camp management, catering, security, and facilities' },
  { id: 'e85ab2e7-bb37-4a4a-a5fa-f32dbdb3d91b', code: 'LEGAL', name: 'Legal & External Relations', description: 'Permits, community relations (CSR), and regulatory compliance' },
  { id: '0f022291-0155-42b9-81a2-a42ba40dcb20', code: 'ENG', name: 'Engineering', description: 'Mine planning, civil engineering, surveying, and design' },
  { id: '2272d2c7-029a-441e-b45b-78ecc9a92c28', code: 'FOREST', name: 'Forestry', description: 'Ganis, tata batas hutan, and forestry compliance' },
  { id: 'c5b63123-b3a5-4b39-909d-48a31f99b741', code: 'PROD', name: 'Mining & Operations', description: 'Site mining operations, heavy equipment, and extraction' },
  { id: 'a66d13c6-4870-43fc-90ce-406a15d1efcd', code: 'CIVIL', name: 'Civil & Infrastructure', description: 'Jalan tambang, jembatan, drainase, dan fasilitas umum' },
];

const INITIAL_PERIOD: ProcurementPeriod = {
  id: '00000000-0000-0000-0002-000000000001',
  year: 2026,
  week_number: 36,
  period_name: 'Minggu ke-4 (September 2026)',
  start_date: '2026-09-22',
  end_date: '2026-09-28',
  disbursed_budget: 200000000,
  previous_rollover_balance: 45500000,
  status: 'submission_open',
  notes: 'Siklus pengadaan operasional reguler minggu keempat September 2026.',
};

interface AppContextType {
  // Auth & User Management
  currentUser: UserProfile | null;
  users: UserProfile[];
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  createUserAccount: (userData: {
    username: string;
    password?: string;
    full_name: string;
    role: UserRole;
    department_id?: string;
    phone_number?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  toggleUserActive: (userId: string) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshUsers: () => Promise<void>;

  // Roles & Dept Selection
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  selectedDepartmentId: string;
  setSelectedDepartmentId: (deptId: string) => void;
  
  // Data
  departments: Department[];
  periods: ProcurementPeriod[];
  activePeriod: ProcurementPeriod;
  routineItems: RoutineItem[];
  requestItems: ProcurementRequestItem[];
  transactions: PurchaseTransaction[];
  journalEntries: FinancialJournalEntry[];
  financeReport: FinanceWeeklyReport;
  notifications: AppNotification[];
  isAppLoading: boolean;
  
  // Actions
  addRoutineItem: (item: Omit<RoutineItem, 'id' | 'created_at'>) => Promise<void>;
  submitRequestItems: (
    items: Array<Partial<ProcurementRequestItem>>
  ) => Promise<{ success: boolean; error?: string }>;
  batchUploadProcurementItems: (
    items: EditableImportedItem[]
  ) => Promise<{ success: boolean; count: number; error?: string }>;
  updateItemLogistics: (
    itemId: string,
    updates: {
      price_range_min?: number;
      price_range_max?: number;
      reference_link?: string;
      final_unit_price?: number;
      logistics_notes?: string;
      lifecycle_status?: ItemLifecycleStatus;
    }
  ) => Promise<void>;
  decreaseItemQuantity: (
    itemId: string,
    newQuantity: number,
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
  adjustItemPrice: (
    itemId: string,
    newUnitPrice: number,
    options?: {
      price_range_min?: number;
      price_range_max?: number;
      reference_link?: string;
      notes?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  approveItemUrgency: (itemId: string, approved: boolean, notes?: string) => Promise<void>;
  batchApproveUrgency: (itemIds: string[], approved: boolean, notes?: string) => Promise<void>;
  approveItemByPm: (itemId: string, approved: boolean, notes?: string) => Promise<void>;
  approveBuyByPm: (itemId: string, approved: boolean, notes?: string) => Promise<void>;
  recordPurchase: (
    txData: Omit<PurchaseTransaction, 'id' | 'created_at'>,
    itemIds: string[],
    proofData?: {
      file_url: string;
      file_name?: string;
      file_type?: string;
    }
  ) => Promise<void>;
  verifyProofByFinance: (proofId: string, approved: boolean, notes?: string) => Promise<void>;
  updateDeliveryStatus: (
    itemId: string,
    deliveryStatus: DeliveryStatusType,
    eta?: string
  ) => Promise<void>;
  confirmSiteReceipt: (itemId: string, notes?: string) => Promise<void>;
  deferItemDeficit: (itemId: string, reason: string) => Promise<void>;
  updatePeriodCash: (updates: {
    disbursed_budget?: number;
    previous_rollover_balance?: number;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  submitFinanceReport: (notes?: string) => Promise<void>;
  approveFinanceReportByPm: (notes?: string) => Promise<void>;
  switchPeriod: (periodId: string) => Promise<{ success: boolean; error?: string }>;
  createAndSwitchPeriod: (params: {
    year: number;
    week_number: number;
    period_name: string;
    start_date: string;
    end_date: string;
  }) => Promise<{ success: boolean; error?: string }>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeRole, setActiveRole] = useState<UserRole>('project_manager');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [periods, setPeriods] = useState<ProcurementPeriod[]>([INITIAL_PERIOD]);
  const [activePeriod, setActivePeriod] = useState<ProcurementPeriod>(INITIAL_PERIOD);
  const [routineItems, setRoutineItems] = useState<RoutineItem[]>([]);
  const [allRequestItems, setAllRequestItems] = useState<ProcurementRequestItem[]>([]);
  const [requestItems, setRequestItems] = useState<ProcurementRequestItem[]>([]);
  const [allTransactions, setAllTransactions] = useState<PurchaseTransaction[]>([]);
  const [transactions, setTransactions] = useState<PurchaseTransaction[]>([]);
  const [journalEntries, setJournalEntries] = useState<FinancialJournalEntry[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isAppLoading, setIsAppLoading] = useState<boolean>(false);

  // Restore saved session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sma_auth_user');
      if (saved) {
        const parsed: UserProfile = JSON.parse(saved);
        setCurrentUser(parsed);
        setActiveRole(parsed.role);
        if (parsed.department_id) {
          setSelectedDepartmentId(parsed.department_id);
        } else {
          setSelectedDepartmentId('all');
        }
      }
    } catch (e) {
      console.log('Error restoring auth session:', e);
    }
  }, []);

  // Sync activeRole & selectedDepartmentId with currentUser
  useEffect(() => {
    if (currentUser) {
      setActiveRole(currentUser.role);
      if (currentUser.department_id) {
        setSelectedDepartmentId(currentUser.department_id);
      } else {
        setSelectedDepartmentId('all');
      }
    }
  }, [currentUser]);

  // Function to refresh user profiles from Supabase
  const refreshUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (data && !error) {
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching user_profiles from Supabase:', err);
    }
  };

  // Master Data Loader from Supabase on App Mount
  const loadData = async () => {
    try {
      // 1. Fetch User Profiles
      const { data: uData } = await supabase
        .from('user_profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (uData && uData.length > 0) {
        setUsers(uData);
      }

      // 2. Fetch Departments
      const { data: deptData } = await supabase
        .from('departments')
        .select('*')
        .order('code', { ascending: true });
      if (deptData && deptData.length > 0) {
        setDepartments(deptData);
      }

      // 3. Fetch Procurement Periods
      const { data: periodList } = await supabase
        .from('procurement_periods')
        .select('*')
        .order('updated_at', { ascending: false });
      let currentActive = activePeriod;
      if (periodList && periodList.length > 0) {
        setPeriods(periodList);
        const savedPeriodId = typeof window !== 'undefined' ? localStorage.getItem('sma_active_period_id') : null;
        const matched = savedPeriodId ? periodList.find((p) => p.id === savedPeriodId) : null;
        currentActive = matched || periodList[0];
        setActivePeriod(currentActive);
      }

      // 4. Fetch Routine Items Catalog
      const { data: rData } = await supabase
        .from('routine_items')
        .select('*')
        .order('item_code', { ascending: true });
      if (rData && rData.length > 0) {
        setRoutineItems(rData);
      }

      // 5. Fetch Request Items (with joined department, period, and routine details)
      const { data: reqData, error: reqErr } = await supabase
        .from('procurement_request_items')
        .select(`
          *,
          routine_item:routine_items(*),
          request:procurement_requests(
            id,
            period_id,
            department_id,
            departments(id, code, name),
            procurement_periods(id, period_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (reqData && reqData.length > 0) {
        const mapped: ProcurementRequestItem[] = reqData.map((row: any) => {
          const unitPrice = row.final_unit_price || row.routine_item?.estimated_unit_price || 0;
          const qty = row.quantity || 1;
          const parentPeriodId = (row.origin_period_id || row.request?.period_id || currentActive.id) as string;
          return {
            ...row,
            origin_period_id: parentPeriodId,
            department_id: row.request?.department_id || row.department_id,
            department_name: row.request?.departments?.name || row.department_name,
            department_code: row.request?.departments?.code || row.department_code,
            period_name: row.request?.procurement_periods?.period_name || row.period_name,
            custom_item_name: row.custom_item_name || row.routine_item?.name,
            final_unit_price: unitPrice,
            estimated_total_price: qty * unitPrice,
          };
        });
        setAllRequestItems(mapped);
        setRequestItems(mapped.filter((i) => i.origin_period_id === currentActive.id));
      } else if (reqErr) {
        console.warn('Procurement request items fetch warning:', reqErr);
      }

      // 6. Fetch Transactions & Proofs
      const { data: txData } = await supabase
        .from('purchase_transactions')
        .select('*, proofs:purchase_proofs(*)')
        .order('purchase_date', { ascending: false });
      if (txData && txData.length > 0) {
        setAllTransactions(txData);
        setTransactions(txData.filter((t: any) => t.period_id === currentActive.id));
      }

      // 7. Fetch Journal Entries
      const { data: jData } = await supabase
        .from('financial_journal_entries')
        .select('*')
        .order('entry_date', { ascending: false });
      if (jData && jData.length > 0) {
        setJournalEntries(jData);
      }

      // 8. Fetch Notifications
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (notifData && notifData.length > 0) {
        setNotifications(notifData);
      }
    } catch (err) {
      console.log('Supabase initial load error:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter items and transactions dynamically when activePeriod changes
  useEffect(() => {
    if (activePeriod && activePeriod.id) {
      setRequestItems(
        allRequestItems.filter((i) => i.origin_period_id === activePeriod.id)
      );
      setTransactions(allTransactions.filter((t) => t.period_id === activePeriod.id));
    }
  }, [activePeriod.id, allRequestItems, allTransactions]);

  // Compute live financial totals
  const totalActualExpenditure = transactions.reduce((acc, t) => acc + t.total_amount, 0);
  const totalBudgetAvailable = activePeriod.disbursed_budget + activePeriod.previous_rollover_balance;
  const remainingBalance = totalBudgetAvailable - totalActualExpenditure;

  const [financeReport, setFinanceReport] = useState<FinanceWeeklyReport>({
    id: 'rpt-w36',
    period_id: activePeriod.id,
    disbursed_budget: activePeriod.disbursed_budget,
    previous_rollover_balance: activePeriod.previous_rollover_balance,
    total_budget_available: totalBudgetAvailable,
    total_actual_expenditure: totalActualExpenditure,
    remaining_balance: remainingBalance,
    status: 'draft',
  });

  useEffect(() => {
    setFinanceReport((prev) => ({
      ...prev,
      disbursed_budget: activePeriod.disbursed_budget,
      previous_rollover_balance: activePeriod.previous_rollover_balance,
      total_budget_available: totalBudgetAvailable,
      total_actual_expenditure: totalActualExpenditure,
      remaining_balance: remainingBalance,
    }));
  }, [transactions, activePeriod, totalBudgetAvailable, totalActualExpenditure, remainingBalance]);

  // ==========================================
  // AUTH: REAL SUPABASE LOGIN
  // ==========================================
  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanUsername = username.trim().toLowerCase();

    try {
      // 1. Query Supabase directly for the user profile row
      const { data: dbUser, error } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (error) {
        console.error('Supabase query error during login:', error);
        return {
          success: false,
          error: `Koneksi database error: ${error.message}. Pastikan script SQL migrasi telah dijalankan di Supabase.`,
        };
      }

      if (!dbUser) {
        return {
          success: false,
          error: `Akun dengan username "${username}" tidak ditemukan di database Supabase.`,
        };
      }

      if (!dbUser.is_active) {
        return {
          success: false,
          error: 'Akun ini sedang berstatus NON-AKTIF di database. Hubungi Project Manager.',
        };
      }

      // Check password
      if (dbUser.password_hash && dbUser.password_hash !== password) {
        return {
          success: false,
          error: 'Kata sandi (password) salah. Silakan periksa kembali.',
        };
      }

      // Attach department info
      const userDept = departments.find((d) => d.id === dbUser.department_id);
      const userProfile: UserProfile = {
        ...dbUser,
        department: userDept,
      };

      setCurrentUser(userProfile);
      setActiveRole(userProfile.role);
      if (userProfile.department_id) {
        setSelectedDepartmentId(userProfile.department_id);
      } else {
        setSelectedDepartmentId('all');
      }

      // Save to localStorage
      try {
        localStorage.setItem('sma_auth_user', JSON.stringify(userProfile));
      } catch (e) {
        console.log('Storage save warning:', e);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Supabase login exception:', err);
      return { success: false, error: err?.message || 'Gagal terhubung ke database Supabase.' };
    }
  };

  // Auth: Logout
  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('sma_auth_user');
    } catch (e) {
      console.log('Storage remove warning:', e);
    }
  };

  // ==========================================
  // USER MANAGEMENT: DIRECT SUPABASE CRUD
  // ==========================================
  const createUserAccount = async (userData: {
    username: string;
    password?: string;
    full_name: string;
    role: UserRole;
    department_id?: string;
    phone_number?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (currentUser?.role !== 'project_manager') {
      return { success: false, error: 'Hanya Project Manager yang berwenang membuat akun pengguna.' };
    }

    const cleanUsername = userData.username.trim().toLowerCase();

    // Check duplicate in current loaded users
    const exists = users.some((u) => u.username?.toLowerCase() === cleanUsername);
    if (exists) {
      return { success: false, error: `Username "${userData.username}" sudah digunakan di database.` };
    }

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `00000000-0000-0000-0003-${Date.now().toString().slice(-12)}`;

    const newUserPayload = {
      id: newId,
      username: cleanUsername,
      password_hash: userData.password || 'password123',
      full_name: userData.full_name,
      role: userData.role,
      department_id: userData.department_id || null,
      phone_number: userData.phone_number || null,
      is_active: true,
    };

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([newUserPayload])
        .select()
        .single();

      if (error) {
        console.error('Supabase user insert error:', error);
        return { success: false, error: `Database error: ${error.message}` };
      }

      const createdUser: UserProfile = data || {
        ...newUserPayload,
        created_at: new Date().toISOString(),
      };

      setUsers((prev) => [createdUser, ...prev]);

      // Push notification
      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: 'Akun Pengguna Baru Dibuat',
        message: `Akun untuk ${userData.full_name} (@${cleanUsername}) berhasil disimpan di database Supabase.`,
        type: 'general',
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);

      return { success: true };
    } catch (err: any) {
      console.error('Create user error:', err);
      return { success: false, error: err?.message || 'Gagal menyimpan akun ke database.' };
    }
  };

  const toggleUserActive = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser?.role !== 'project_manager') {
      return { success: false, error: 'Unauthorized' };
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'User tidak ditemukan' };

    const newActiveState = !target.is_active;

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_active: newActiveState } : u))
    );

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: newActiveState })
        .eq('id', userId);

      if (error) {
        console.error('Failed to update active state in Supabase:', error);
        // Rollback state on error
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: target.is_active } : u))
        );
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  };

  const resetUserPassword = async (userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser?.role !== 'project_manager') {
      return { success: false, error: 'Unauthorized' };
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password_hash: newPassword } : u))
    );

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ password_hash: newPassword })
        .eq('id', userId);

      if (error) {
        console.error('Failed to reset password in Supabase:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  };

  // ==========================================
  // OPERATIONAL WORKFLOW ACTIONS (SUPABASE)
  // ==========================================
  const addRoutineItem = async (itemData: Omit<RoutineItem, 'id' | 'created_at'>) => {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ri-${Date.now()}`;
    const payload = {
      ...itemData,
      id: newId,
      created_at: new Date().toISOString(),
    };

    setRoutineItems((prev) => [payload, ...prev]);

    try {
      await supabase.from('routine_items').insert([payload]);
    } catch (err) {
      console.error('Supabase routine insert error:', err);
    }

    const dept = departments.find((d) => d.id === itemData.department_id);
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'Katalog Rutin Baru Terdaftar',
      message: `${itemData.item_code} - ${itemData.name} terdaftar untuk ${dept?.name || 'Departemen'}.`,
      type: 'general',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const submitRequestItems = async (
    newItemsData: Array<Partial<ProcurementRequestItem>>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!newItemsData || newItemsData.length === 0) {
      return { success: false, error: 'Tidak ada item yang diajukan.' };
    }

    const isAll = !selectedDepartmentId || selectedDepartmentId === 'all' || selectedDepartmentId === 'ALL';
    const deptId = newItemsData[0]?.department_id || (isAll ? (currentUser?.department_id || departments[0]?.id) : selectedDepartmentId);
    const dept = departments.find((d) => d.id === deptId) || departments[0];
    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}`;

    // 1. Ensure parent procurement_requests record exists
    let reqRecordId = requestId;
    try {
      const { data: existingReq, error: checkReqErr } = await supabase
        .from('procurement_requests')
        .select('id')
        .eq('period_id', activePeriod.id)
        .eq('department_id', deptId)
        .maybeSingle();

      if (checkReqErr) {
        console.warn('Procurement request parent check error:', checkReqErr);
      }

      if (existingReq) {
        reqRecordId = existingReq.id;
      } else {
        const { data: newReq, error: insertReqErr } = await supabase
          .from('procurement_requests')
          .insert({
            id: reqRecordId,
            period_id: activePeriod.id,
            department_id: deptId,
            status: 'submitted',
          })
          .select('id')
          .single();

        if (insertReqErr) {
          console.error('Supabase parent procurement request create error:', insertReqErr);
          return { success: false, error: `Gagal membuat pengajuan induk: ${insertReqErr.message}` };
        }
        if (newReq) reqRecordId = newReq.id;
      }
    } catch (err: any) {
      console.warn('Procurement request parent check warning:', err);
      return { success: false, error: `Gagal memeriksa pengajuan induk: ${err?.message || err}` };
    }

    const created: ProcurementRequestItem[] = newItemsData.map((item, idx) => {
      const routine = routineItems.find((r) => r.id === item.routine_item_id);
      const unitPrice = item.final_unit_price || routine?.estimated_unit_price || 0;
      const qty = item.quantity || 1;
      const resolvedName = item.item_type === 'routine'
        ? (routine?.name || item.custom_item_name || 'Barang Rutin')
        : (item.custom_item_name || 'Barang Tambahan');
      const resolvedUnit = item.unit || routine?.unit || 'pcs';
      const resolvedSpec = item.specification || routine?.specification || '';

      return {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${idx}`,
        request_id: reqRecordId,
        item_type: item.item_type || 'routine',
        routine_item_id: item.item_type === 'routine' ? item.routine_item_id : undefined,
        custom_item_name: resolvedName,
        specification: resolvedSpec,
        quantity: qty,
        unit: resolvedUnit,
        priority_level: (item.priority_level as PriorityLevel) || 1,
        is_rollover: item.is_rollover || false,
        origin_period_id: activePeriod.id,
        final_unit_price: unitPrice,
        estimated_total_price: qty * unitPrice,
        pm_item_approval: 'pending',
        pm_buy_approval: 'pending',
        lifecycle_status: 'submitted',
        delivery_status: 'none',
        department_id: deptId,
        department_code: dept?.code || 'DEPT',
        department_name: dept?.name || 'Department',
        period_name: activePeriod.period_name,
        created_at: new Date().toISOString(),
      };
    });

    try {
      const dbPayload = created.map((item) => ({
        id: item.id,
        request_id: item.request_id,
        item_type: item.item_type,
        routine_item_id: item.item_type === 'routine' ? (item.routine_item_id || null) : null,
        custom_item_name: item.custom_item_name || null,
        specification: item.specification || null,
        quantity: item.quantity,
        unit: item.unit,
        priority_level: item.priority_level,
        is_rollover: item.is_rollover || false,
        origin_period_id: activePeriod.id,
        final_unit_price: item.final_unit_price || 0,
        lifecycle_status: 'submitted',
        pm_item_approval: 'pending',
        pm_buy_approval: 'pending',
        delivery_status: 'none',
      }));

      const { error: insertErr } = await supabase.from('procurement_request_items').insert(dbPayload);
      if (insertErr) {
        console.error('Supabase request items insert error:', insertErr);
        return { success: false, error: `Gagal menyimpan item ke database: ${insertErr.message}` };
      }
    } catch (err: any) {
      console.error('Supabase request items insert error:', err);
      return { success: false, error: `Kesalahan database: ${err?.message || err}` };
    }

    setAllRequestItems((prev) => [...created, ...prev]);
    setRequestItems((prev) => [...created, ...prev]);

    const urgentCount = created.filter((i) => i.priority_level === 3).length;
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'Pengajuan Barang Baru',
      message: `${dept?.name} mengajukan ${created.length} barang untuk ${activePeriod.period_name}${
        urgentCount > 0 ? ` (Termasuk ${urgentCount} barang Level 3 Urgent)` : ''
      }.`,
      type: urgentCount > 0 ? 'approval_request' : 'general',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);

    return { success: true };
  };

  const switchPeriod = async (periodId: string): Promise<{ success: boolean; error?: string }> => {
    if (activeRole !== 'project_manager' && currentUser?.role !== 'project_manager') {
      return { success: false, error: 'Hanya Project Manager yang berwenang beralih periode.' };
    }
    const target = periods.find((p) => p.id === periodId);
    if (!target) return { success: false, error: 'Periode tidak ditemukan.' };

    setIsAppLoading(true);
    setActivePeriod(target);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sma_active_period_id', target.id);
    }
    setTimeout(() => {
      setIsAppLoading(false);
    }, 250);

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'Periode Aktif Diubah',
      message: `Project Manager beralih ke periode: ${target.period_name}.`,
      type: 'general',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);

    return { success: true };
  };

  const createAndSwitchPeriod = async (params: {
    year: number;
    week_number: number;
    period_name: string;
    start_date: string;
    end_date: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (activeRole !== 'project_manager' && currentUser?.role !== 'project_manager') {
      return { success: false, error: 'Hanya Project Manager yang berwenang membuka periode baru.' };
    }

    try {
      setIsAppLoading(true);

      // 1. Calculate surplus from current active period:
      const currentAvailable = activePeriod.disbursed_budget + activePeriod.previous_rollover_balance;
      const currentSpent = allTransactions
        .filter((t) => t.period_id === activePeriod.id)
        .reduce((sum, t) => sum + t.total_amount, 0);
      const surplus = Math.max(0, currentAvailable - currentSpent);

      // 2. Check if period for this year and week_number already exists
      const { data: existingPeriod, error: checkError } = await supabase
        .from('procurement_periods')
        .select('*')
        .eq('year', params.year)
        .eq('week_number', params.week_number)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing period in Supabase:', checkError);
      }

      let finalPeriod: ProcurementPeriod;

      if (existingPeriod) {
        const updatePayload = {
          period_name: params.period_name,
          start_date: params.start_date,
          end_date: params.end_date,
          disbursed_budget: 0,
          previous_rollover_balance: surplus,
          status: 'submission_open' as PeriodStatus,
          notes: `Periode baru diaktifkan oleh Project Manager. Saldo awal dialihkan dari surplus periode sebelumnya (Rp ${surplus.toLocaleString('id-ID')}).`,
          updated_at: new Date().toISOString(),
        };

        const { data: updatedData, error: updateError } = await supabase
          .from('procurement_periods')
          .update(updatePayload)
          .eq('id', existingPeriod.id)
          .select()
          .single();

        if (updateError) {
          console.error('Failed to update existing period in Supabase:', updateError);
          setIsAppLoading(false);
          return { success: false, error: updateError.message };
        }

        finalPeriod = updatedData || { ...existingPeriod, ...updatePayload };
        setPeriods((prev) => {
          const filtered = prev.filter((p) => p.id !== existingPeriod.id);
          return [finalPeriod, ...filtered];
        });
      } else {
        const newId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `period-${Date.now()}`;

        const newPeriodPayload: ProcurementPeriod = {
          id: newId,
          year: params.year,
          week_number: params.week_number,
          period_name: params.period_name,
          start_date: params.start_date,
          end_date: params.end_date,
          disbursed_budget: 0,
          previous_rollover_balance: surplus,
          status: 'submission_open',
          notes: `Periode baru diaktifkan oleh Project Manager. Saldo awal dialihkan dari surplus periode sebelumnya (Rp ${surplus.toLocaleString('id-ID')}).`,
        };

        const { data, error } = await supabase
          .from('procurement_periods')
          .insert([newPeriodPayload])
          .select()
          .single();

        if (error) {
          console.error('Failed to insert new period in Supabase:', error);
          setIsAppLoading(false);
          return { success: false, error: error.message };
        }

        finalPeriod = data || newPeriodPayload;
        setPeriods((prev) => [finalPeriod, ...prev]);
      }

      setActivePeriod(finalPeriod);
      if (typeof window !== 'undefined' && finalPeriod?.id) {
        localStorage.setItem('sma_active_period_id', finalPeriod.id);
      }

      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: 'Periode Pengadaan Baru Diaktifkan',
        message: `${params.period_name} telah diaktifkan oleh PM. Item pengadaan di-reset dan kas dimulai dari Rp 0 + Surplus (${formatCurrency(surplus)}).`,
        type: 'general',
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);

      setIsAppLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsAppLoading(false);
      return { success: false, error: err?.message || 'Gagal membuat periode baru.' };
    }
  };

  const batchUploadProcurementItems = async (
    items: EditableImportedItem[]
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    if (!items || items.length === 0) {
      return { success: false, count: 0, error: 'Tidak ada data item untuk di-upload.' };
    }

    try {
      // 1. Group items by department_id
      const deptIds = Array.from(new Set(items.map((i) => i.department_id)));
      const deptReqMap: Record<string, string> = {};

      for (const dId of deptIds) {
        // Check if procurement_requests exists for this period & dept
        const { data: existingReq } = await supabase
          .from('procurement_requests')
          .select('id')
          .eq('period_id', activePeriod.id)
          .eq('department_id', dId)
          .maybeSingle();

        if (existingReq) {
          deptReqMap[dId] = existingReq.id;
        } else {
          const newReqId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `req-${Date.now()}-${dId.slice(0, 6)}`;
          const { data: newReq, error: reqInsertErr } = await supabase
            .from('procurement_requests')
            .insert({
              id: newReqId,
              period_id: activePeriod.id,
              department_id: dId,
              status: 'submitted',
            })
            .select('id')
            .single();

          if (reqInsertErr) {
            console.error('Error creating procurement request for dept', dId, reqInsertErr);
          }
          deptReqMap[dId] = newReq?.id || newReqId;
        }
      }

      // 2. Resolve or create routine items
      const routineItemsCreated: RoutineItem[] = [];
      const routineCodeToItemMap: Record<string, RoutineItem> = {};

      // Seed map with currently loaded routineItems
      routineItems.forEach((r) => {
        if (r.item_code) {
          routineCodeToItemMap[r.item_code.trim().toUpperCase()] = r;
        }
      });

      // Find any routine items that need resolving
      for (const item of items) {
        if (item.item_type === 'routine' && item.routine_code) {
          const codeUpper = item.routine_code.trim().toUpperCase();
          if (!routineCodeToItemMap[codeUpper]) {
            // Check in DB
            const { data: existingInDb } = await supabase
              .from('routine_items')
              .select('*')
              .eq('item_code', codeUpper)
              .maybeSingle();

            if (existingInDb) {
              routineCodeToItemMap[codeUpper] = existingInDb;
            } else {
              // Create new routine item in DB
              const newRoutineId = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `ri-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
              const routinePayload: RoutineItem = {
                id: newRoutineId,
                department_id: item.department_id,
                item_code: codeUpper,
                name: item.item_name,
                specification: item.specification || '',
                unit: item.unit || 'pcs',
                estimated_unit_price: item.final_unit_price || 0,
                status: 'active',
                created_at: new Date().toISOString(),
              };

              const { data: insertedRoutine, error: routineInsertErr } = await supabase
                .from('routine_items')
                .insert([routinePayload])
                .select()
                .single();

              if (routineInsertErr) {
                console.warn('Routine item insert warning:', routineInsertErr);
              }

              const finalRoutine = insertedRoutine || routinePayload;
              routineCodeToItemMap[codeUpper] = finalRoutine;
              routineItemsCreated.push(finalRoutine);
            }
          }
        }
      }

      // 3. Construct procurement_request_items payload
      const createdRequestItems: ProcurementRequestItem[] = [];
      const dbPayload = [];

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const reqId = deptReqMap[item.department_id];
        const dept = departments.find((d) => d.id === item.department_id);
        const isRoutine = item.item_type === 'routine';
        const codeUpper = (item.routine_code || '').trim().toUpperCase();
        const routineObj = isRoutine ? routineCodeToItemMap[codeUpper] : undefined;

        const itemId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `item-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;

        const qty = item.quantity > 0 ? item.quantity : 1;
        const unitPrice = item.final_unit_price || routineObj?.estimated_unit_price || 0;

        const dbRow = {
          id: itemId,
          request_id: reqId,
          item_type: item.item_type,
          routine_item_id: isRoutine ? (routineObj?.id || null) : null,
          custom_item_name: item.item_name,
          specification: item.specification || null,
          quantity: qty,
          unit: item.unit || 'pcs',
          priority_level: item.priority_level || 1,
          is_rollover: false,
          origin_period_id: activePeriod.id,
          final_unit_price: unitPrice,
          reference_link: item.reference_link || null,
          lifecycle_status: 'validated' as ItemLifecycleStatus,
          pm_item_approval: 'pending' as const,
          pm_buy_approval: 'pending' as const,
          delivery_status: 'none' as const,
        };

        dbPayload.push(dbRow);

        createdRequestItems.push({
          ...dbRow,
          reference_link: item.reference_link || undefined,
          routine_item_id: isRoutine ? (routineObj?.id || undefined) : undefined,
          specification: item.specification || undefined,
          estimated_total_price: qty * unitPrice,
          routine_item: routineObj,
          department_id: item.department_id,
          department_code: dept?.code || item.department_code,
          department_name: dept?.name || item.department_name,
          period_name: activePeriod.period_name,
          created_at: new Date().toISOString(),
        });
      }

      // 4. Batch insert into Supabase
      const { error: batchInsertErr } = await supabase
        .from('procurement_request_items')
        .insert(dbPayload);

      if (batchInsertErr) {
        console.error('Supabase batch upload error:', batchInsertErr);
        // Fallback: try inserting in smaller chunks of 50
        if (dbPayload.length > 50) {
          for (let i = 0; i < dbPayload.length; i += 50) {
            const chunk = dbPayload.slice(i, i + 50);
            await supabase.from('procurement_request_items').insert(chunk);
          }
        } else {
          return { success: false, count: 0, error: batchInsertErr.message };
        }
      }

      // 5. Update local React states
      if (routineItemsCreated.length > 0) {
        setRoutineItems((prev) => [...routineItemsCreated, ...prev]);
      }
      setAllRequestItems((prev) => [...createdRequestItems, ...prev]);
      setRequestItems((prev) => [...createdRequestItems, ...prev]);

      // 6. Push notification
      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: 'Impor Excel Logistik Berhasil',
        message: `${createdRequestItems.length} item logistik berhasil di-upload ke sistem untuk ${activePeriod.period_name}.`,
        type: 'general',
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);

      return { success: true, count: createdRequestItems.length };
    } catch (err: any) {
      console.error('Batch upload exception:', err);
      return { success: false, count: 0, error: err?.message || 'Gagal mengunggah item ke database.' };
    }
  };

  const updateItemLogistics = async (
    itemId: string,
    updates: {
      price_range_min?: number;
      price_range_max?: number;
      reference_link?: string;
      final_unit_price?: number;
      logistics_notes?: string;
      lifecycle_status?: ItemLifecycleStatus;
    }
  ) => {
    const target = requestItems.find((i) => i.id === itemId);
    const newUnitPrice = updates.final_unit_price !== undefined ? updates.final_unit_price : target?.final_unit_price || 0;
    const newEstimatedTotal = (target?.quantity || 1) * newUnitPrice;

    const mergedUpdates = {
      ...updates,
      final_unit_price: newUnitPrice,
      estimated_total_price: newEstimatedTotal,
      lifecycle_status: updates.lifecycle_status || target?.lifecycle_status || 'validated',
    };

    setRequestItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...mergedUpdates } : item))
    );

    try {
      const { estimated_total_price, ...dbPayload } = mergedUpdates as any;
      await supabase.from('procurement_request_items').update(dbPayload).eq('id', itemId);
    } catch (err) {
      console.error('Supabase item update error:', err);
    }
  };

  const decreaseItemQuantity = async (
    itemId: string,
    newQuantity: number,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const target = requestItems.find((i) => i.id === itemId);
    if (!target) {
      return { success: false, error: 'Item pengadaan tidak ditemukan.' };
    }

    if (newQuantity <= 0) {
      return {
        success: false,
        error: 'Kuantitas baru harus lebih dari 0. Jika ingin membatalkan/menghapus barang ini, gunakan tombol Tolak.',
      };
    }

    if (newQuantity >= target.quantity) {
      return {
        success: false,
        error: `Kuantitas baru (${newQuantity}) harus lebih kecil dari kuantitas awal (${target.quantity}).`,
      };
    }

    const unitPrice = target.final_unit_price || target.routine_item?.estimated_unit_price || 0;
    const newEstimatedTotal = newQuantity * unitPrice;
    const noteText = reason?.trim()
      ? `[Finance: Qty dikurangi dari ${target.quantity} -> ${newQuantity} ${target.unit}. Alasan: ${reason.trim()}]`
      : `[Finance: Qty dikurangi dari ${target.quantity} -> ${newQuantity} ${target.unit}]`;
    const updatedNotes = target.pm_item_approval_notes
      ? `${target.pm_item_approval_notes} | ${noteText}`
      : noteText;

    const mergedUpdates = {
      quantity: newQuantity,
      estimated_total_price: newEstimatedTotal,
      pm_item_approval_notes: updatedNotes,
    };

    setRequestItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...mergedUpdates } : item))
    );

    try {
      await supabase
        .from('procurement_request_items')
        .update({
          quantity: newQuantity,
          pm_item_approval_notes: updatedNotes,
        })
        .eq('id', itemId);
    } catch (err: any) {
      console.error('Supabase decreaseItemQuantity error:', err);
    }

    const itemName = target.routine_item?.name || target.custom_item_name || 'Barang Pengadaan';
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      department_id: target.department_id,
      title: 'Kuantitas Barang Disesuaikan oleh Finance',
      message: `Admin Finance telah mengurangi kuantitas ${itemName} (${target.department_name || 'Departemen'}) dari ${target.quantity} menjadi ${newQuantity} ${target.unit}.${reason?.trim() ? ` Alasan: "${reason.trim()}"` : ''}`,
      type: 'general',
      related_item_id: itemId,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);

    return { success: true };
  };

  const adjustItemPrice = async (
    itemId: string,
    newUnitPrice: number,
    options?: {
      price_range_min?: number;
      price_range_max?: number;
      reference_link?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    const target = requestItems.find((i) => i.id === itemId);
    if (!target) {
      return { success: false, error: 'Item pengadaan tidak ditemukan.' };
    }

    if (newUnitPrice < 0) {
      return { success: false, error: 'Harga satuan tidak boleh bernilai negatif.' };
    }

    const newEstimatedTotal = (target.quantity || 1) * newUnitPrice;
    const noteText = options?.notes?.trim()
      ? `[Logistik penyesuaian harga: ${formatCurrency(newUnitPrice)}/unit. Catatan: ${options.notes.trim()}]`
      : undefined;
    const updatedLogisticsNotes = noteText
      ? target.logistics_notes
        ? `${target.logistics_notes} | ${noteText}`
        : noteText
      : target.logistics_notes;

    const mergedUpdates: Partial<ProcurementRequestItem> = {
      final_unit_price: newUnitPrice,
      estimated_total_price: newEstimatedTotal,
      logistics_notes: updatedLogisticsNotes,
    };

    if (options?.price_range_min !== undefined) {
      mergedUpdates.price_range_min = options.price_range_min;
    }
    if (options?.price_range_max !== undefined) {
      mergedUpdates.price_range_max = options.price_range_max;
    }
    if (options?.reference_link !== undefined) {
      mergedUpdates.reference_link = options.reference_link;
    }

    // If item was draft or submitted, auto-transition to validated when price is adjusted
    if (target.lifecycle_status === 'draft' || target.lifecycle_status === 'submitted') {
      mergedUpdates.lifecycle_status = 'validated';
    }

    setRequestItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...mergedUpdates } : item))
    );

    try {
      const { estimated_total_price, ...dbPayload } = mergedUpdates as any;
      await supabase
        .from('procurement_request_items')
        .update(dbPayload)
        .eq('id', itemId);
    } catch (err: any) {
      console.error('Supabase adjustItemPrice error:', err);
    }

    const itemName = target.routine_item?.name || target.custom_item_name || 'Barang Pengadaan';
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      department_id: target.department_id,
      title: 'Penyesuaian Harga oleh Logistik',
      message: `Admin Logistik telah menyesuaikan harga ${itemName} (${target.department_name || 'Departemen'}) menjadi ${formatCurrency(newUnitPrice)} / ${target.unit}.${options?.notes?.trim() ? ` Catatan: "${options.notes.trim()}"` : ''}`,
      type: 'general',
      related_item_id: itemId,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);

    return { success: true };
  };

  const approveItemUrgency = async (itemId: string, approved: boolean, notes?: string) => {
    const updates = {
      pm_item_approval: (approved ? 'approved' : 'rejected') as 'approved' | 'rejected',
      pm_item_approval_notes: notes || undefined,
      lifecycle_status: (approved ? 'pm_item_approved' : 'pm_item_rejected') as ItemLifecycleStatus,
    };

    setRequestItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );

    try {
      await supabase.from('procurement_request_items').update(updates).eq('id', itemId);
    } catch (err) {
      console.error('Supabase approveItemUrgency error:', err);
    }
  };

  const batchApproveUrgency = async (itemIds: string[], approved: boolean, notes?: string) => {
    if (!itemIds || itemIds.length === 0) return;
    const updates = {
      pm_item_approval: (approved ? 'approved' : 'rejected') as 'approved' | 'rejected',
      pm_item_approval_notes: notes || undefined,
      lifecycle_status: (approved ? 'pm_item_approved' : 'pm_item_rejected') as ItemLifecycleStatus,
    };

    setRequestItems((prev) =>
      prev.map((item) => (itemIds.includes(item.id) ? { ...item, ...updates } : item))
    );

    try {
      await supabase.from('procurement_request_items').update(updates).in('id', itemIds);
    } catch (err) {
      console.error('Supabase batchApproveUrgency error:', err);
    }

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: approved ? 'Auto Agree Urgensi Berhasil' : 'Penolakan Massal Urgensi',
      message: `Finance telah ${approved ? 'menyetujui urgensi' : 'menolak'} ${itemIds.length} item pengadaan sekaligus.`,
      type: 'general',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const approveItemByPm = approveItemUrgency;

  const approveBuyByPm = async (itemId: string, approved: boolean, notes?: string) => {
    const updates = {
      pm_buy_approval: (approved ? 'approved' : 'deferred') as 'approved' | 'deferred',
      pm_buy_approval_notes: notes || undefined,
      lifecycle_status: (approved ? 'pm_buy_approved' : 'deferred_deficit') as ItemLifecycleStatus,
    };

    setRequestItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );

    try {
      await supabase.from('procurement_request_items').update(updates).eq('id', itemId);
    } catch (err) {
      console.error('Supabase approveBuyByPm error:', err);
    }
  };

  const recordPurchase = async (
    txData: Omit<PurchaseTransaction, 'id' | 'created_at'>,
    itemIds: string[],
    proofData?: {
      file_url: string;
      file_name?: string;
      file_type?: string;
    }
  ) => {
    const txId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`;
    
    let newProofs: PurchaseProof[] = [];
    if (proofData && proofData.file_url) {
      const proofId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proof-${Date.now()}`;
      newProofs = [
        {
          id: proofId,
          transaction_id: txId,
          file_url: proofData.file_url,
          file_name: proofData.file_name || `Kuitansi_${txData.invoice_number || txId}.jpg`,
          file_type: proofData.file_type || 'image/jpeg',
          verified_by_finance: false,
          created_at: new Date().toISOString(),
        },
      ];
    }

    const newTx: PurchaseTransaction = {
      ...txData,
      id: txId,
      proofs: newProofs,
      created_at: new Date().toISOString(),
    };

    setAllTransactions((prev) => [newTx, ...prev]);
    setTransactions((prev) => [newTx, ...prev]);

    setRequestItems((prev) =>
      prev.map((item) => {
        if (!itemIds.includes(item.id)) return item;
        return {
          ...item,
          lifecycle_status: 'purchased',
          delivery_status: 'processing',
        };
      })
    );

    const jDebit: FinancialJournalEntry = {
      id: `j-${Date.now()}-1`,
      period_id: activePeriod.id,
      transaction_id: txId,
      entry_date: txData.purchase_date,
      account_code: '5200-OPR',
      account_name: 'Beban Pengadaan Operasional Tambang',
      entry_type: 'DEBIT',
      amount: txData.total_amount,
      description: `Pembelian vendor ${txData.vendor_name} (${txData.transaction_code})`,
    };

    const jCredit: FinancialJournalEntry = {
      id: `j-${Date.now()}-2`,
      period_id: activePeriod.id,
      transaction_id: txId,
      entry_date: txData.purchase_date,
      account_code: '1110-KAS',
      account_name: 'Kas Operasional PT SMA Mandiri',
      entry_type: 'CREDIT',
      amount: txData.total_amount,
      description: `Pengeluaran kas PO ${txData.transaction_code} ke ${txData.vendor_name}`,
    };

    setJournalEntries((prev) => [jDebit, jCredit, ...prev]);

    try {
      const { error: txErr } = await supabase.from('purchase_transactions').insert([
        {
          id: newTx.id,
          period_id: newTx.period_id,
          transaction_code: newTx.transaction_code,
          vendor_name: newTx.vendor_name,
          invoice_number: newTx.invoice_number,
          purchase_date: newTx.purchase_date,
          total_amount: newTx.total_amount,
          payment_method: newTx.payment_method,
          notes: newTx.notes,
        },
      ]);
      if (txErr) console.error('Supabase transaction insert error:', txErr);

      if (newProofs.length > 0) {
        const { error: proofErr } = await supabase.from('purchase_proofs').insert(newProofs);
        if (proofErr) console.error('Supabase purchase_proofs insert error:', proofErr);
      }

      for (const id of itemIds) {
        await supabase
          .from('procurement_request_items')
          .update({ lifecycle_status: 'purchased', delivery_status: 'processing' })
          .eq('id', id);
      }
      await supabase.from('financial_journal_entries').insert([jDebit, jCredit]);
    } catch (err) {
      console.error('Supabase recordPurchase error:', err);
    }
  };

  const verifyProofByFinance = async (proofId: string, approved: boolean, notes?: string) => {
    setTransactions((prev) =>
      prev.map((tx) => ({
        ...tx,
        proofs: (tx.proofs || []).map((p) =>
          p.id === proofId
            ? {
                ...p,
                verified_by_finance: approved,
                verified_at: new Date().toISOString(),
                finance_notes: notes,
              }
            : p
        ),
      }))
    );

    try {
      await supabase
        .from('purchase_proofs')
        .update({
          verified_by_finance: approved,
          verified_at: new Date().toISOString(),
          finance_notes: notes,
        })
        .eq('id', proofId);
    } catch (err) {
      console.error('Supabase verify proof error:', err);
    }
  };

  const updateDeliveryStatus = async (
    itemId: string,
    deliveryStatus: DeliveryStatusType,
    eta?: string
  ) => {
    const isDelivered = deliveryStatus === 'delivered';
    const updates: Partial<ProcurementRequestItem> = {
      delivery_status: deliveryStatus,
      eta_delivery: eta || undefined,
      ...(isDelivered
        ? {
            received_at: new Date().toISOString(),
            lifecycle_status: 'received_at_site' as ItemLifecycleStatus,
          }
        : {}),
    };

    setRequestItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );

    try {
      await supabase.from('procurement_request_items').update(updates).eq('id', itemId);
    } catch (err) {
      console.error('Supabase update delivery error:', err);
    }
  };

  const confirmSiteReceipt = async (itemId: string, notes?: string) => {
    const updates: Partial<ProcurementRequestItem> = {
      delivery_status: 'delivered' as DeliveryStatusType,
      lifecycle_status: 'received_at_site' as ItemLifecycleStatus,
      received_at: new Date().toISOString(),
      receipt_notes: notes || 'Terkonfirmasi fisik diterima di warehouse site tambang.',
    };

    setRequestItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );

    try {
      await supabase.from('procurement_request_items').update(updates).eq('id', itemId);
    } catch (err) {
      console.error('Supabase confirm receipt error:', err);
    }
  };

  const deferItemDeficit = async (itemId: string, reason: string) => {
    const updates: Partial<ProcurementRequestItem> = {
      lifecycle_status: 'deferred_deficit' as ItemLifecycleStatus,
      pm_buy_approval_notes: reason,
      is_rollover: true,
    };

    setRequestItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );

    try {
      await supabase.from('procurement_request_items').update(updates).eq('id', itemId);
    } catch (err) {
      console.error('Supabase defer deficit error:', err);
    }
  };

  const updatePeriodCash = async (updates: {
    disbursed_budget?: number;
    previous_rollover_balance?: number;
    notes?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const newDisbursed = updates.disbursed_budget !== undefined ? updates.disbursed_budget : activePeriod.disbursed_budget;
    const newRollover = updates.previous_rollover_balance !== undefined ? updates.previous_rollover_balance : activePeriod.previous_rollover_balance;
    const newNotes = updates.notes !== undefined ? updates.notes : (activePeriod.notes || '');

    const updatedPeriod: ProcurementPeriod = {
      ...activePeriod,
      disbursed_budget: newDisbursed,
      previous_rollover_balance: newRollover,
      notes: newNotes,
    };

    // Optimistically update activePeriod
    setActivePeriod(updatedPeriod);

    try {
      const { error } = await supabase
        .from('procurement_periods')
        .update({
          disbursed_budget: newDisbursed,
          previous_rollover_balance: newRollover,
          notes: newNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activePeriod.id);

      if (error) {
        console.error('Failed to update procurement period in Supabase:', error);
        return { success: false, error: error.message };
      }

      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: 'Saldo Kas Operasional Diperbarui',
        message: `Admin Finance memperbarui total kas periode ${activePeriod.period_name}: Kas Mingguan Rp ${newDisbursed.toLocaleString('id-ID')} + Rollover Rp ${newRollover.toLocaleString('id-ID')} (Total: Rp ${(newDisbursed + newRollover).toLocaleString('id-ID')}).`,
        type: 'general',
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);

      return { success: true };
    } catch (err: any) {
      console.error('Update period cash error:', err);
      return { success: false, error: err?.message || 'Gagal menyimpan perubahan kas' };
    }
  };

  const submitFinanceReport = async (notes?: string) => {
    setFinanceReport((prev) => ({
      ...prev,
      status: 'submitted_by_finance',
      pm_approval_notes: notes || prev.pm_approval_notes,
      submitted_at: new Date().toISOString(),
    }));
  };

  const approveFinanceReportByPm = async (notes?: string) => {
    setFinanceReport((prev) => ({
      ...prev,
      status: 'approved_by_pm',
      pm_approval_notes: notes || 'Disetujui oleh Project Manager.',
      approved_at: new Date().toISOString(),
    }));
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        login,
        logout,
        createUserAccount,
        toggleUserActive,
        resetUserPassword,
        refreshUsers,
        activeRole,
        setActiveRole,
        selectedDepartmentId,
        setSelectedDepartmentId,
        departments,
        periods,
        activePeriod,
        routineItems,
        requestItems,
        transactions,
        journalEntries,
        financeReport,
        notifications,
        isAppLoading,
        addRoutineItem,
        submitRequestItems,
        batchUploadProcurementItems,
        updateItemLogistics,
        decreaseItemQuantity,
        adjustItemPrice,
        approveItemUrgency,
        batchApproveUrgency,
        approveItemByPm,
        approveBuyByPm,
        recordPurchase,
        verifyProofByFinance,
        updateDeliveryStatus,
        confirmSiteReceipt,
        deferItemDeficit,
        updatePeriodCash,
        submitFinanceReport,
        approveFinanceReportByPm,
        switchPeriod,
        createAndSwitchPeriod,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

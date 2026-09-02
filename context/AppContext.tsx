'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Department,
  UserProfile,
  RoutineItem,
  ProcurementPeriod,
  ProcurementRequestItem,
  PurchaseTransaction,
  FinancialJournalEntry,
  FinanceWeeklyReport,
  AppNotification,
  UserRole,
  PriorityLevel,
  ItemLifecycleStatus,
  DeliveryStatusType,
} from '@/lib/types';

// Initial Fallback / Seed Constants if database table is initially blank
const INITIAL_DEPARTMENTS: Department[] = [
  { id: '00000000-0000-0000-0001-000000000001', code: 'MINING', name: 'Mining & Production Operations', description: 'Operasi penambangan nikel dan overburden' },
  { id: '00000000-0000-0000-0001-000000000002', code: 'HAULING', name: 'Hauling & Ore Transport', description: 'Pengangkutan material dan logistik armada tambang' },
  { id: '00000000-0000-0000-0001-000000000003', code: 'CRUSHING', name: 'Crushing & Screening Plant', description: 'Pengolahan dan pemecahan bijih nikel' },
  { id: '00000000-0000-0000-0001-000000000004', code: 'MAINTENANCE', name: 'Heavy Equipment & Plant Maintenance', description: 'Perawatan alat berat excavator, dump truck, dan genset' },
  { id: '00000000-0000-0000-0001-000000000005', code: 'HSE', name: 'Health, Safety & Environment (K3)', description: 'Keselamatan kerja tambang, APD, dan pengelolaan lingkungan' },
  { id: '00000000-0000-0000-0001-000000000006', code: 'LOGISTICS', name: 'Supply Chain & Warehouse Site', description: 'Gudang site tambang dan ekspedisi logistik' },
  { id: '00000000-0000-0000-0001-000000000007', code: 'FINANCE', name: 'Finance, Accounting & Tax', description: 'Pengelolaan anggaran kas mingguan dan kuitansi' },
  { id: '00000000-0000-0000-0001-000000000008', code: 'HRGA', name: 'Human Resources & General Affairs', description: 'Personalia, mess tambang, konsumsi, dan umum' },
  { id: '00000000-0000-0000-0001-000000000009', code: 'IT', name: 'IT Infrastructure & Telecommunications', description: 'Jaringan radio komunikasi tambang, internet, dan server' },
  { id: '00000000-0000-0000-0001-000000000010', code: 'LAB', name: 'Quality Control & Assay Laboratory', description: 'Uji kadar nikel (Ni) dan sampling geologi' },
  { id: '00000000-0000-0000-0001-000000000011', code: 'ENV', name: 'Environmental & Mine Reclamation', description: 'Reklamasi lahan bekas tambang dan sediment trap' },
  { id: '00000000-0000-0000-0001-000000000012', code: 'SECURITY', name: 'Mine Security & Asset Protection', description: 'Pengamanan area konsesi tambang dan pos jaga' },
];

const INITIAL_PERIOD: ProcurementPeriod = {
  id: '00000000-0000-0000-0002-000000000001',
  year: 2026,
  week_number: 36,
  period_name: 'Minggu ke-36 (01 Sep - 07 Sep 2026)',
  start_date: '2026-09-01',
  end_date: '2026-09-07',
  disbursed_budget: 200000000,
  previous_rollover_balance: 45500000,
  status: 'submission_open',
  notes: 'Siklus pengadaan operasional reguler minggu pertama September 2026.',
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
  activePeriod: ProcurementPeriod;
  routineItems: RoutineItem[];
  requestItems: ProcurementRequestItem[];
  transactions: PurchaseTransaction[];
  journalEntries: FinancialJournalEntry[];
  financeReport: FinanceWeeklyReport;
  notifications: AppNotification[];
  
  // Actions
  addRoutineItem: (item: Omit<RoutineItem, 'id' | 'created_at'>) => Promise<void>;
  submitRequestItems: (items: Array<Partial<ProcurementRequestItem>>) => Promise<void>;
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
  approveItemByPm: (itemId: string, approved: boolean, notes?: string) => Promise<void>;
  approveBuyByPm: (itemId: string, approved: boolean, notes?: string) => Promise<void>;
  recordPurchase: (
    txData: Omit<PurchaseTransaction, 'id' | 'created_at'>,
    itemIds: string[]
  ) => Promise<void>;
  verifyProofByFinance: (proofId: string, approved: boolean, notes?: string) => Promise<void>;
  updateDeliveryStatus: (
    itemId: string,
    deliveryStatus: DeliveryStatusType,
    eta?: string
  ) => Promise<void>;
  confirmSiteReceipt: (itemId: string, notes?: string) => Promise<void>;
  deferItemDeficit: (itemId: string, reason: string) => Promise<void>;
  submitFinanceReport: (notes?: string) => Promise<void>;
  approveFinanceReportByPm: (notes?: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeRole, setActiveRole] = useState<UserRole>('project_manager');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('00000000-0000-0000-0001-000000000005');
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [activePeriod, setActivePeriod] = useState<ProcurementPeriod>(INITIAL_PERIOD);
  const [routineItems, setRoutineItems] = useState<RoutineItem[]>([]);
  const [requestItems, setRequestItems] = useState<ProcurementRequestItem[]>([]);
  const [transactions, setTransactions] = useState<PurchaseTransaction[]>([]);
  const [journalEntries, setJournalEntries] = useState<FinancialJournalEntry[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

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
      const { data: periodData } = await supabase
        .from('procurement_periods')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (periodData) {
        setActivePeriod(periodData);
      }

      // 4. Fetch Routine Items Catalog
      const { data: rData } = await supabase
        .from('routine_items')
        .select('*')
        .order('item_code', { ascending: true });
      if (rData && rData.length > 0) {
        setRoutineItems(rData);
      }

      // 5. Fetch Request Items
      const { data: reqData } = await supabase
        .from('procurement_request_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (reqData && reqData.length > 0) {
        setRequestItems(reqData);
      }

      // 6. Fetch Transactions & Proofs
      const { data: txData } = await supabase
        .from('purchase_transactions')
        .select('*, proofs:purchase_proofs(*)')
        .order('purchase_date', { ascending: false });
      if (txData && txData.length > 0) {
        setTransactions(txData);
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

  const submitRequestItems = async (newItemsData: Array<Partial<ProcurementRequestItem>>) => {
    const dept = departments.find((d) => d.id === selectedDepartmentId);
    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}`;

    const created: ProcurementRequestItem[] = newItemsData.map((item, idx) => {
      const routine = routineItems.find((r) => r.id === item.routine_item_id);
      const unitPrice = item.final_unit_price || routine?.estimated_unit_price || 0;
      const qty = item.quantity || 1;
      return {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${idx}`,
        request_id: requestId,
        item_type: item.item_type || 'routine',
        routine_item_id: item.routine_item_id,
        custom_item_name: item.custom_item_name,
        specification: item.specification || routine?.specification || '',
        quantity: qty,
        unit: item.unit || routine?.unit || 'pcs',
        priority_level: (item.priority_level as PriorityLevel) || 1,
        is_rollover: item.is_rollover || false,
        final_unit_price: unitPrice,
        estimated_total_price: qty * unitPrice,
        pm_item_approval: 'pending',
        pm_buy_approval: 'pending',
        lifecycle_status: 'submitted',
        delivery_status: 'none',
        department_id: selectedDepartmentId,
        department_code: dept?.code || 'DEPT',
        department_name: dept?.name || 'Department',
        period_name: activePeriod.period_name,
        created_at: new Date().toISOString(),
      };
    });

    setRequestItems((prev) => [...created, ...prev]);

    try {
      await supabase.from('procurement_request_items').insert(created);
    } catch (err) {
      console.error('Supabase request items insert error:', err);
    }

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
      lifecycle_status: updates.lifecycle_status || 'validated',
    };

    setRequestItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...mergedUpdates } : item))
    );

    try {
      await supabase.from('procurement_request_items').update(mergedUpdates).eq('id', itemId);
    } catch (err) {
      console.error('Supabase item update error:', err);
    }
  };

  const approveItemByPm = async (itemId: string, approved: boolean, notes?: string) => {
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
      console.error('Supabase approveItemByPm error:', err);
    }
  };

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
    itemIds: string[]
  ) => {
    const txId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`;
    const newTx: PurchaseTransaction = {
      ...txData,
      id: txId,
      created_at: new Date().toISOString(),
    };

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
      await supabase.from('purchase_transactions').insert([newTx]);
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
        activePeriod,
        routineItems,
        requestItems,
        transactions,
        journalEntries,
        financeReport,
        notifications,
        addRoutineItem,
        submitRequestItems,
        updateItemLogistics,
        approveItemByPm,
        approveBuyByPm,
        recordPurchase,
        verifyProofByFinance,
        updateDeliveryStatus,
        confirmSiteReceipt,
        deferItemDeficit,
        submitFinanceReport,
        approveFinanceReportByPm,
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

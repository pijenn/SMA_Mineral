'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate, formatDateTime, isAllDepartments } from '@/lib/utils';
import { PriorityBadge, LifecycleBadge, DeliveryBadge } from '@/components/ui/StatusBadge';
import {
  DollarSign,
  Receipt,
  BookOpen,
  FileCheck,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Check,
  Clock,
  ArrowRight,
  Eye,
  Wallet,
  Edit3,
  Save,
  Package,
  Search,
  Building2,
  ClipboardList,
  Coins,
  RefreshCw,
  Download,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  CheckCheck,
} from 'lucide-react';
import { generateWeeklyReportPdf } from '@/lib/pdfGenerator';

interface FinanceDashboardProps {
  activeTab?: 'budget' | 'item_approval' | 'requests' | 'receipts' | 'journals' | 'report';
  onTabChange?: (tab: 'budget' | 'item_approval' | 'requests' | 'receipts' | 'journals' | 'report') => void;
}

export function FinanceDashboard({ activeTab = 'budget', onTabChange }: FinanceDashboardProps) {
  const {
    activePeriod,
    selectedDepartmentId,
    setSelectedDepartmentId,
    departments,
    currentUser,
    requestItems,
    routineItems,
    transactions,
    journalEntries,
    financeReport,
    verifyProofByFinance,
    submitFinanceReport,
    updatePeriodCash,
    approveItemUrgency,
    batchApproveUrgency,
  } = useApp();

  const [localTab, setLocalTab] = useState<'budget' | 'item_approval' | 'requests' | 'receipts' | 'journals' | 'report'>(activeTab);
  const currentTab = onTabChange ? activeTab : localTab;
  const setTab = (t: 'budget' | 'item_approval' | 'requests' | 'receipts' | 'journals' | 'report') => {
    if (onTabChange) onTabChange(t);
    setLocalTab(t);
  };

  const [selectedProofPreview, setSelectedProofPreview] = useState<string | null>(null);
  const [reportNotes, setReportNotes] = useState('Anggaran operasional mingguan telah direkonsiliasi dengan kuitansi fisik.');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Edit Cash Modal States
  const [isEditCashModalOpen, setIsEditCashModalOpen] = useState(false);
  const [cashDisbursedInput, setCashDisbursedInput] = useState<string>(String(activePeriod.disbursed_budget || ''));
  const [cashRolloverInput, setCashRolloverInput] = useState<string>(String(activePeriod.previous_rollover_balance || '0'));
  const [cashNotesInput, setCashNotesInput] = useState<string>(activePeriod.notes || '');
  const [isSavingCash, setIsSavingCash] = useState(false);
  const [cashFeedback, setCashFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = () => {
    try {
      setIsGeneratingPdf(true);
      generateWeeklyReportPdf({
        period: activePeriod,
        financeReport,
        transactions,
        requestItems,
        routineItems,
        departments,
        currentUser,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Terjadi kesalahan saat mencetak PDF laporan mingguan.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Request View & Filter States
  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [requestPriorityFilter, setRequestPriorityFilter] = useState('ALL');
  const [requestStatusFilter, setRequestStatusFilter] = useState('ALL');

  const isAllDept = isAllDepartments(selectedDepartmentId);
  const activeDeptObj = departments.find((d) => d.id === selectedDepartmentId);

  const totalDisbursed = activePeriod.disbursed_budget;
  const rolloverSurplus = activePeriod.previous_rollover_balance;
  const totalAvailable = totalDisbursed + rolloverSurplus;
  const totalSpent = transactions.reduce((acc, t) => acc + t.total_amount, 0);
  const remainingCash = totalAvailable - totalSpent;
  const isSurplus = remainingCash >= 0;

  // Flatten all proofs
  const allProofs = transactions.flatMap((t) =>
    (t.proofs || []).map((p) => ({
      ...p,
      transaction_code: t.transaction_code,
      vendor_name: t.vendor_name,
      total_amount: t.total_amount,
      purchase_date: t.purchase_date,
    }))
  );

  const verifiedProofsCount = allProofs.filter((p) => p.verified_by_finance).length;

  // Filtered requests for Finance
  const filteredRequests = requestItems.filter((item) => {
    const routine = routineItems.find((r) => r.id === item.routine_item_id);
    const itemName = (routine?.name || item.custom_item_name || '').toLowerCase();
    const itemCode = (routine?.item_code || '').toLowerCase();
    const deptName = (item.department_name || '').toLowerCase();
    const matchesSearch =
      itemName.includes(requestSearchQuery.toLowerCase()) ||
      itemCode.includes(requestSearchQuery.toLowerCase()) ||
      deptName.includes(requestSearchQuery.toLowerCase()) ||
      (item.specification || '').toLowerCase().includes(requestSearchQuery.toLowerCase());

    const matchesDept = isAllDept || item.department_id === selectedDepartmentId;
    const matchesPriority =
      requestPriorityFilter === 'ALL' || String(item.priority_level) === requestPriorityFilter;
    const matchesStatus =
      requestStatusFilter === 'ALL' || item.lifecycle_status === requestStatusFilter;

    return matchesSearch && matchesDept && matchesPriority && matchesStatus;
  });

  const deptScopeRequests = isAllDept
    ? requestItems
    : requestItems.filter((i) => i.department_id === selectedDepartmentId);

  const totalEstimatedCost = deptScopeRequests.reduce(
    (acc, i) => acc + (i.estimated_total_price || ((i.quantity || 1) * (i.final_unit_price || 0))),
    0
  );
  const totalApprovedByPmCost = deptScopeRequests
    .filter((i) => i.pm_buy_approval === 'approved' || i.pm_item_approval === 'approved')
    .reduce((acc, i) => acc + (i.estimated_total_price || ((i.quantity || 1) * (i.final_unit_price || 0))), 0);
  const urgentRequestsCount = deptScopeRequests.filter((i) => i.priority_level === 3).length;

  const handleOpenEditCash = () => {
    setCashDisbursedInput(String(activePeriod.disbursed_budget ?? ''));
    setCashRolloverInput(String(activePeriod.previous_rollover_balance ?? '0'));
    setCashNotesInput(activePeriod.notes || '');
    setCashFeedback(null);
    setIsEditCashModalOpen(true);
  };

  const handleSaveCash = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCash(true);
    setCashFeedback(null);
    const res = await updatePeriodCash({
      disbursed_budget: Number(cashDisbursedInput) || 0,
      previous_rollover_balance: Number(cashRolloverInput) || 0,
      notes: cashNotesInput,
    });
    setIsSavingCash(false);
    if (res.success) {
      setCashFeedback({ type: 'success', message: 'Total kas operasional berhasil diperbarui di database!' });
      setTimeout(() => {
        setIsEditCashModalOpen(false);
      }, 1000);
    } else {
      setCashFeedback({ type: 'error', message: res.error || 'Gagal menyimpan perubahan kas.' });
    }
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    submitFinanceReport(reportNotes);
    setIsSubmitModalOpen(false);
  };

  // Pending Urgency Approvals Queue
  const pendingItemApprovals = deptScopeRequests.filter(
    (i) => i.lifecycle_status === 'validated' || (i.lifecycle_status === 'submitted' && i.pm_item_approval === 'pending')
  );

  // Urgency Approval Filter & Sort States
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | '1' | '2' | '3'>('ALL');
  const [pricePreset, setPricePreset] = useState<'ALL' | 'UNDER_5M' | '5M_TO_20M' | 'ABOVE_20M' | 'CUSTOM'>('ALL');
  const [minPriceInput, setMinPriceInput] = useState<string>('');
  const [maxPriceInput, setMaxPriceInput] = useState<string>('');
  const [urgencySearchQuery, setUrgencySearchQuery] = useState<string>('');
  const [urgencySortBy, setUrgencySortBy] = useState<
    'urgency_desc' | 'urgency_asc' | 'price_desc' | 'price_asc' | 'date_desc' | 'date_asc'
  >('urgency_desc');

  // Auto Agree States & Modals
  const [isAutoAgreeModalOpen, setIsAutoAgreeModalOpen] = useState(false);
  const [autoAgreeScope, setAutoAgreeScope] = useState<'filtered' | 'all'>('filtered');
  const [autoAgreeNotes, setAutoAgreeNotes] = useState('Disetujui otomatis oleh Admin Finance.');
  const [isAutoAgreeing, setIsAutoAgreeing] = useState(false);
  const [autoAgreeSuccessMsg, setAutoAgreeSuccessMsg] = useState<string | null>(null);

  // Reject Modal State for Urgency
  const [rejectUrgencyModalItem, setRejectUrgencyModalItem] = useState<{ id: string; name: string } | null>(null);
  const [rejectUrgencyReason, setRejectUrgencyReason] = useState('');
  const [isRejectingUrgency, setIsRejectingUrgency] = useState(false);

  // Check whether urgency filter is active (Filter is ON)
  const isFilterActive =
    urgencyFilter !== 'ALL' ||
    pricePreset !== 'ALL' ||
    minPriceInput.trim() !== '' ||
    maxPriceInput.trim() !== '' ||
    urgencySearchQuery.trim() !== '';

  const resetUrgencyFilters = () => {
    setUrgencyFilter('ALL');
    setPricePreset('ALL');
    setMinPriceInput('');
    setMaxPriceInput('');
    setUrgencySearchQuery('');
  };

  // Filtered Urgency items
  const filteredUrgencyItems = pendingItemApprovals.filter((item) => {
    const routine = routineItems.find((r) => r.id === item.routine_item_id);
    const itemName = (routine?.name || item.custom_item_name || '').toLowerCase();
    const itemCode = (routine?.item_code || '').toLowerCase();
    const deptName = (item.department_name || '').toLowerCase();
    const spec = (item.specification || '').toLowerCase();
    const query = urgencySearchQuery.toLowerCase().trim();

    const matchesSearch =
      !query ||
      itemName.includes(query) ||
      itemCode.includes(query) ||
      deptName.includes(query) ||
      spec.includes(query);

    const matchesUrgency = urgencyFilter === 'ALL' || String(item.priority_level) === urgencyFilter;

    const totalEstimatedCost = item.estimated_total_price || (item.quantity * (item.final_unit_price || 0));

    let matchesPrice = true;
    if (pricePreset === 'UNDER_5M') {
      matchesPrice = totalEstimatedCost < 5000000;
    } else if (pricePreset === '5M_TO_20M') {
      matchesPrice = totalEstimatedCost >= 5000000 && totalEstimatedCost <= 20000000;
    } else if (pricePreset === 'ABOVE_20M') {
      matchesPrice = totalEstimatedCost > 20000000;
    } else if (pricePreset === 'CUSTOM') {
      const min = minPriceInput ? Number(minPriceInput) : 0;
      const max = maxPriceInput ? Number(maxPriceInput) : Infinity;
      matchesPrice = totalEstimatedCost >= min && totalEstimatedCost <= max;
    }

    if (minPriceInput.trim() !== '' && pricePreset !== 'CUSTOM') {
      matchesPrice = matchesPrice && totalEstimatedCost >= (Number(minPriceInput) || 0);
    }
    if (maxPriceInput.trim() !== '' && pricePreset !== 'CUSTOM') {
      matchesPrice = matchesPrice && totalEstimatedCost <= (Number(maxPriceInput) || Infinity);
    }

    return matchesSearch && matchesUrgency && matchesPrice;
  });

  // Sorted Urgency items
  const sortedUrgencyItems = [...filteredUrgencyItems].sort((a, b) => {
    const costA = a.estimated_total_price || (a.quantity * (a.final_unit_price || 0));
    const costB = b.estimated_total_price || (b.quantity * (b.final_unit_price || 0));

    switch (urgencySortBy) {
      case 'urgency_desc':
        if (b.priority_level !== a.priority_level) {
          return b.priority_level - a.priority_level;
        }
        return costB - costA;
      case 'urgency_asc':
        if (a.priority_level !== b.priority_level) {
          return a.priority_level - b.priority_level;
        }
        return costA - costB;
      case 'price_desc':
        return costB - costA;
      case 'price_asc':
        return costA - costB;
      case 'date_desc':
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      case 'date_asc':
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      default:
        return 0;
    }
  });

  const totalFilteredUrgencyCost = filteredUrgencyItems.reduce(
    (acc, i) => acc + (i.estimated_total_price || ((i.quantity || 1) * (i.final_unit_price || 0))),
    0
  );
  const totalPendingUrgencyCost = pendingItemApprovals.reduce(
    (acc, i) => acc + (i.estimated_total_price || ((i.quantity || 1) * (i.final_unit_price || 0))),
    0
  );

  const handleOpenAutoAgreeModal = (defaultScope?: 'filtered' | 'all') => {
    setAutoAgreeScope(defaultScope || (isFilterActive ? 'filtered' : 'all'));
    setIsAutoAgreeModalOpen(true);
  };

  const handleConfirmAutoAgree = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetItems = autoAgreeScope === 'filtered' && isFilterActive ? filteredUrgencyItems : pendingItemApprovals;
    if (targetItems.length === 0) return;

    setIsAutoAgreeing(true);
    const itemIds = targetItems.map((i) => i.id);
    await batchApproveUrgency(itemIds, true, autoAgreeNotes || 'Disetujui otomatis oleh Admin Finance.');
    setIsAutoAgreeing(false);
    setIsAutoAgreeModalOpen(false);
    const totalCost = targetItems.reduce((acc, i) => acc + (i.estimated_total_price || ((i.quantity || 1) * (i.final_unit_price || 0))), 0);
    setAutoAgreeSuccessMsg(`Berhasil menyetujui ${targetItems.length} barang secara otomatis (${formatCurrency(totalCost)})!`);
    setTimeout(() => {
      setAutoAgreeSuccessMsg(null);
    }, 4500);
  };

  const handleConfirmRejectUrgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectUrgencyModalItem) return;
    setIsRejectingUrgency(true);
    await approveItemUrgency(rejectUrgencyModalItem.id, false, rejectUrgencyReason || 'Ditolak oleh Admin Finance');
    setIsRejectingUrgency(false);
    setRejectUrgencyModalItem(null);
    setRejectUrgencyReason('');
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Finance & Kas Operasional
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Accounting
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Perhitungan saldo likuiditas real-time, otorisasi total kas, monitoring request seluruh departemen, dan kuitansi fisik.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={handleOpenEditCash}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            title="Kelola & Sesuaikan Total Kas Operasional"
          >
            <Wallet className="w-4 h-4" />
            <span>Ubah Total Kas</span>
          </button>
          <button
            onClick={() => setTab('item_approval')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer relative"
            title="Persetujuan Urgensi Kebutuhan Barang"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Persetujuan Urgensi</span>
            {pendingItemApprovals.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white text-blue-700">
                {pendingItemApprovals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            <span>Kirim Laporan ke PM</span>
          </button>
        </div>
      </div>

      {/* Auto Agree Feedback Toast */}
      {autoAgreeSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{autoAgreeSuccessMsg}</span>
          </div>
          <button
            onClick={() => setAutoAgreeSuccessMsg(null)}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 5-Column KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* Card 1: Total Kas Tersedia */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center justify-between gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Kas Tersedia (Pencairan + Rollover)
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
                {formatCurrency(totalAvailable)}
              </div>
            </div>
          </div>
          <button
            onClick={handleOpenEditCash}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1c222a] dark:hover:bg-[#252d38] border border-zinc-200 dark:border-[#2e3745] text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            title="Ubah Nominal Total Kas"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-500" />
            <span>Ubah</span>
          </button>
        </div>

        {/* Card 2: Pending Urgensi Barang (Tahap 1 - Otoritas Finance) */}
        <div
          onClick={() => setTab('item_approval')}
          className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-blue-500/50 hover:bg-zinc-50 dark:hover:bg-[#181c22] cursor-pointer group"
          title="Klik untuk membuka Antrean Persetujuan Urgensi Barang"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
              Pending Urgensi Barang
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-blue-600 dark:text-blue-400">
              {pendingItemApprovals.length} Menunggu
            </div>
          </div>
        </div>

        {/* Card 3: Total Realisasi Pengeluaran */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Total Realisasi PO
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {formatCurrency(totalSpent)}
            </div>
          </div>
        </div>

        {/* Card 4: Status Saldo Likuiditas */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div
            className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
              isSurplus
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}
          >
            {isSurplus ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {isSurplus ? 'Sisa Saldo Kas' : 'Defisit Anggaran'}
            </div>
            <div
              className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${
                isSurplus ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {formatCurrency(remainingCash)}
            </div>
          </div>
        </div>

        {/* Card 5: Kuitansi Terverifikasi */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Verifikasi Kuitansi
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {verifiedProofsCount} / {allProofs.length} Valid
            </div>
          </div>
        </div>
      </div>

      {/* Module Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-[#232830] pb-3">
        <button
          onClick={() => setTab('budget')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentTab === 'budget'
              ? 'bg-emerald-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
          }`}
        >
          Likuiditas & Transaksi ({transactions.length})
        </button>
        <button
          onClick={() => setTab('item_approval')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            currentTab === 'item_approval'
              ? 'bg-emerald-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
          }`}
        >
          <span>Persetujuan Urgensi Barang</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              currentTab === 'item_approval'
                ? 'bg-slate-950/20 text-slate-950'
                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
            }`}
          >
            {pendingItemApprovals.length}
          </span>
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentTab === 'requests'
              ? 'bg-emerald-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
          }`}
        >
          Semua Request Dept ({filteredRequests.length})
        </button>
        <button
          onClick={() => setTab('receipts')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentTab === 'receipts'
              ? 'bg-emerald-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
          }`}
        >
          Kuitansi & Bukti Fisik ({allProofs.length})
        </button>
        <button
          onClick={() => setTab('journals')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentTab === 'journals'
              ? 'bg-emerald-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
          }`}
        >
          Jurnal Akuntansi Otomatis ({journalEntries.length})
        </button>
        <button
          onClick={() => setTab('report')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentTab === 'report'
              ? 'bg-emerald-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
          }`}
        >
          Laporan Rekonsiliasi PM
        </button>
      </div>

      {/* Tab: Saldo Kas & Transaksi */}
      {currentTab === 'budget' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Riwayat Transaksi & Pengeluaran Kas
              </h2>
              <span className="text-xs font-semibold text-zinc-400">
                Total {transactions.length} Transaksi
              </span>
            </div>

            <div className="divide-y divide-zinc-200 dark:divide-[#232830]">
              {transactions.length === 0 ? (
                <div className="text-center py-16 px-4 text-xs text-zinc-400">
                  Belum ada transaksi pembelian pada siklus minggu ini.
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50/60 dark:hover:bg-[#181c22] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                          {tx.transaction_code}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {formatDate(tx.purchase_date)}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-zinc-900 dark:text-white">
                        {tx.vendor_name} &bull; Inv #{tx.invoice_number}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Metode: <strong className="text-zinc-800 dark:text-zinc-200">{tx.payment_method}</strong> | {tx.notes}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(tx.total_amount)}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {tx.proofs?.length || 0} Lampiran Kuitansi
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Persetujuan Urgensi Barang (Tahap 1 - Otoritas Finance) */}
      {currentTab === 'item_approval' && (
        <div className="space-y-4">
          {/* Header Panel with Auto Agree Actions */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                    Persetujuan Urgensi Barang (Otoritas Finance)
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                      isFilterActive
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isFilterActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                      }`}
                    />
                    <span>{isFilterActive ? 'Filter Aktif (ON)' : 'Filter Nonaktif (OFF)'}</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  Verifikasi urgensi kebutuhan operasional dan estimasi biaya sebelum dilanjutkan ke tahap Otorisasi Pembelian PO oleh Project Manager.
                </p>
              </div>

              {/* Auto Agree Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
                {/* When Filter is ON: Option to Auto Agree Filtered or All */}
                {isFilterActive ? (
                  <>
                    <button
                      onClick={() => handleOpenAutoAgreeModal('filtered')}
                      disabled={filteredUrgencyItems.length === 0 || isAutoAgreeing}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                      title="Setujui otomatis semua barang yang saat ini memenuhi kriteria filter"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Auto Agree Terfilter ({filteredUrgencyItems.length})</span>
                    </button>
                    <button
                      onClick={() => handleOpenAutoAgreeModal('all')}
                      disabled={pendingItemApprovals.length === 0 || isAutoAgreeing}
                      className="px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1f242c] dark:hover:bg-[#282f3a] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-[#2d3440] text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Setujui otomatis seluruh antrean tanpa menghiraukan filter aktif"
                    >
                      <CheckCheck className="w-4 h-4 text-blue-500" />
                      <span>Auto Agree Semua ({pendingItemApprovals.length})</span>
                    </button>
                  </>
                ) : (
                  /* When Filter is OFF: Auto Agree All items in queue */
                  <button
                    onClick={() => handleOpenAutoAgreeModal('all')}
                    disabled={pendingItemApprovals.length === 0 || isAutoAgreeing}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                    title="Setujui otomatis seluruh barang yang menunggu persetujuan urgensi"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Auto Agree Semua ({pendingItemApprovals.length} Barang)</span>
                  </button>
                )}

                <button
                  onClick={() => handleOpenAutoAgreeModal()}
                  className="p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1f242c] dark:hover:bg-[#282f3a] text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-[#2d3440] transition-all cursor-pointer"
                  title="Buka Pengaturan & Panduan Auto-Agree"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter & Sorting Controls Toolbar */}
            <div className="pt-4 border-t border-zinc-200 dark:border-[#232830] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Filter & Urutkan Antrean Urgensi</span>
                </div>
                {isFilterActive && (
                  <button
                    onClick={resetUrgencyFilters}
                    className="text-xs text-red-500 hover:text-red-400 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset Semua Filter (OFF)</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Filter 1: Tingkat Urgensi */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Tingkat Urgensi
                  </label>
                  <select
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value as any)}
                    className="w-full bg-zinc-50 dark:bg-[#0d0f12] text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-[#2a313d] rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Tingkat Urgensi</option>
                    <option value="3">Level 3: Mendesak (K3 Urgent)</option>
                    <option value="2">Level 2: Sedang (Operasional)</option>
                    <option value="1">Level 1: Rutin (Normal)</option>
                  </select>
                </div>

                {/* Filter 2: Estimasi Harga Preset */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Estimasi Biaya
                  </label>
                  <select
                    value={pricePreset}
                    onChange={(e) => {
                      setPricePreset(e.target.value as any);
                      if (e.target.value !== 'CUSTOM') {
                        setMinPriceInput('');
                        setMaxPriceInput('');
                      }
                    }}
                    className="w-full bg-zinc-50 dark:bg-[#0d0f12] text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-[#2a313d] rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Rentang Biaya</option>
                    <option value="UNDER_5M">&lt; Rp 5.000.000 (Di bawah 5 Juta)</option>
                    <option value="5M_TO_20M">Rp 5.000.000 - Rp 20.000.000 (5 - 20 Juta)</option>
                    <option value="ABOVE_20M">&gt; Rp 20.000.000 (Di atas 20 Juta)</option>
                    <option value="CUSTOM">Rentang Kustom (Min - Max)</option>
                  </select>
                </div>

                {/* Sorting Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Urutkan Berdasarkan
                  </label>
                  <select
                    value={urgencySortBy}
                    onChange={(e) => setUrgencySortBy(e.target.value as any)}
                    className="w-full bg-zinc-50 dark:bg-[#0d0f12] text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-[#2a313d] rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="urgency_desc">Urgensi: Tertinggi ke Terendah (Level 3 → 1)</option>
                    <option value="urgency_asc">Urgensi: Terendah ke Tertinggi (Level 1 → 3)</option>
                    <option value="price_desc">Estimasi Biaya: Tertinggi (Mahal → Murah)</option>
                    <option value="price_asc">Estimasi Biaya: Terendah (Murah → Mahal)</option>
                    <option value="date_desc">Waktu: Pengajuan Terbaru</option>
                    <option value="date_asc">Waktu: Pengajuan Terlama</option>
                  </select>
                </div>

                {/* Search query */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Pencarian Cepat
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={urgencySearchQuery}
                      onChange={(e) => setUrgencySearchQuery(e.target.value)}
                      placeholder="Nama barang, spek, dept..."
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-[#0d0f12] text-xs text-zinc-900 dark:text-white placeholder-zinc-400 border border-zinc-200 dark:border-[#2a313d] rounded-xl focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Custom Min & Max Inputs if pricePreset === 'CUSTOM' or user enters numbers */}
              {pricePreset === 'CUSTOM' && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#0d0f12] border border-zinc-200 dark:border-[#232830] flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Rentang Harga Kustom (Rp):</span>
                  <input
                    type="number"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    placeholder="Min (cth. 1000000)"
                    className="px-3 py-1.5 bg-white dark:bg-[#14171c] text-xs text-zinc-900 dark:text-white border border-zinc-300 dark:border-[#2e3745] rounded-lg w-36 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs text-zinc-400">s/d</span>
                  <input
                    type="number"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    placeholder="Max (cth. 15000000)"
                    className="px-3 py-1.5 bg-white dark:bg-[#14171c] text-xs text-zinc-900 dark:text-white border border-zinc-300 dark:border-[#2e3745] rounded-lg w-36 focus:outline-none focus:border-emerald-500"
                  />
                  {(minPriceInput || maxPriceInput) && (
                    <button
                      onClick={() => {
                        setMinPriceInput('');
                        setMaxPriceInput('');
                      }}
                      className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
                    >
                      Hapus Range
                    </button>
                  )}
                </div>
              )}

              {/* Status Summary Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <span>
                    Menampilkan <strong className="text-zinc-800 dark:text-zinc-200">{filteredUrgencyItems.length}</strong> dari{' '}
                    <strong>{pendingItemApprovals.length}</strong> barang pending
                  </span>
                  <span>&bull;</span>
                  <span>
                    Total Nilai Estimasi:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      {formatCurrency(totalFilteredUrgencyCost)}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span>Filter Status:</span>
                  <span
                    className={`font-bold ${
                      isFilterActive ? 'text-emerald-500' : 'text-zinc-400'
                    }`}
                  >
                    {isFilterActive ? 'ON (Kriteria Terpasang)' : 'OFF (Semua Data)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* List of Pending Items for Urgency Approval */}
          <div className="bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] overflow-hidden shadow-xs">
            <div className="divide-y divide-zinc-200 dark:divide-[#232830]">
              {pendingItemApprovals.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Semua Urgensi Barang Telah Disetujui
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    Tidak ada antrean barang menunggu persetujuan urgensi saat ini. Pengadaan baru yang diajukan oleh HOD atau logistik akan muncul di sini.
                  </p>
                </div>
              ) : filteredUrgencyItems.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                    <Filter className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Tidak Ada Barang yang Cocok dengan Filter
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    Terdapat {pendingItemApprovals.length} barang di antrean, namun tidak ada yang memenuhi filter urgensi atau estimasi biaya yang sedang aktif.
                  </p>
                  <button
                    onClick={resetUrgencyFilters}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
                  >
                    Matikan Filter (Tampilkan Semua)
                  </button>
                </div>
              ) : (
                sortedUrgencyItems.map((item) => {
                  const routine = routineItems.find((r) => r.id === item.routine_item_id);
                  const itemName = routine?.name || item.custom_item_name || 'Barang Pengadaan';
                  const totalEstimatedCost = item.estimated_total_price || (item.quantity * (item.final_unit_price || 0));

                  return (
                    <div
                      key={item.id}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-[#181c22] transition-colors"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                            Dept: <strong className="text-zinc-800 dark:text-zinc-200">{item.department_name}</strong>
                          </span>
                          <PriorityBadge level={item.priority_level} showFull />
                          <LifecycleBadge status={item.lifecycle_status} />
                          {routine?.item_code && (
                            <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-[#1f242c] text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                              {routine.item_code}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                          {itemName}
                        </h4>

                        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>
                            Jumlah: <strong className="text-zinc-800 dark:text-zinc-200">{item.quantity} {item.unit}</strong>
                          </span>
                          {item.final_unit_price ? (
                            <span>
                              Harga Satuan:{' '}
                              <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                                {formatCurrency(item.final_unit_price)}
                              </strong>
                            </span>
                          ) : null}
                          <span>
                            Total Estimasi Biaya:{' '}
                            <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm">
                              {formatCurrency(totalEstimatedCost)}
                            </strong>
                          </span>
                        </div>

                        {item.specification && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                            &ldquo;{item.specification}&rdquo;
                          </div>
                        )}

                        {item.logistics_notes && (
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg inline-block">
                            Catatan Logistik: {item.logistics_notes}
                          </div>
                        )}
                      </div>

                      {/* Item Action Buttons */}
                      <div className="flex items-center gap-2 self-end md:self-auto shrink-0 pt-2 md:pt-0">
                        <button
                          onClick={() => setRejectUrgencyModalItem({ id: item.id, name: itemName })}
                          className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Tolak
                        </button>
                        <button
                          onClick={() => approveItemUrgency(item.id, true)}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Setujui Urgensi</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Request Pengadaan Seluruh Departemen */}
      {currentTab === 'requests' && (
        <div className="space-y-4">
          {/* Header & Dept Scope Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <ClipboardList className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Monitoring Request Pengadaan Departemen
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {isAllDept ? 'Semua Departemen (12 Dept)' : `Dept: ${activeDeptObj?.name || 'Terpilih'}`}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Pengawasan alokasi anggaran, status otorisasi PM, dan rincian item pengadaan seluruh departemen tambang PT SMA.
              </p>
            </div>

            {/* Quick Department Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <Building2 className="w-4 h-4 text-zinc-400" />
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">Departemen:</span>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="bg-zinc-50 dark:bg-[#0d0f12] text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-[#2a313d] rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">Semua Departemen (12 Dept)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.code}] {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4 Mini Metric Cards for Requests */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs">
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Pengajuan Item</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {deptScopeRequests.length} Item
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs">
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Estimasi Nilai</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(totalEstimatedCost)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs">
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Telah Disetujui PM</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                {formatCurrency(totalApprovedByPmCost)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs">
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Prioritas Level 3 (K3)</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-red-500 mt-1">
                {urgentRequestsCount} Item Urgent
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={requestSearchQuery}
                onChange={(e) => setRequestSearchQuery(e.target.value)}
                placeholder="Cari nama barang, kode item, spesifikasi, atau departemen..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={requestPriorityFilter}
                onChange={(e) => setRequestPriorityFilter(e.target.value)}
                className="bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs font-semibold px-3 py-2.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">Semua Prioritas</option>
                <option value="3">Level 3 (Urgent / K3)</option>
                <option value="2">Level 2 (Operasional)</option>
                <option value="1">Level 1 (Rutin)</option>
              </select>

              <select
                value={requestStatusFilter}
                onChange={(e) => setRequestStatusFilter(e.target.value)}
                className="bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs font-semibold px-3 py-2.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="submitted">Diajukan</option>
                <option value="validated">Tervalidasi Logistik</option>
                <option value="pm_buy_approved">Disetujui Beli (PM)</option>
                <option value="purchased">Dibeli / PO Terbit</option>
                <option value="received_at_site">Tiba di Site</option>
                <option value="deferred_deficit">Tertunda Defisit</option>
              </select>
            </div>
          </div>

          {/* Table / List of Request Items */}
          <div className="bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Daftar Permintaan Pengadaan ({filteredRequests.length} Item)
              </h3>
              <span className="text-xs text-zinc-400 font-semibold">
                Periode: {activePeriod.period_name}
              </span>
            </div>

            <div className="divide-y divide-zinc-200 dark:divide-[#232830]">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-2">
                  <Package className="w-10 h-10 text-zinc-400 mx-auto" />
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Tidak Ada Pengajuan Ditemukan
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Tidak ada data barang yang sesuai dengan filter atau kata kunci pencarian.
                  </p>
                </div>
              ) : (
                filteredRequests.map((item) => {
                  const routine = routineItems.find((r) => r.id === item.routine_item_id);
                  const itemName = routine?.name || item.custom_item_name || 'Barang Operasional';
                  const itemCode = routine?.item_code || 'ADDITIONAL';
                  const unitPrice = item.final_unit_price || routine?.estimated_unit_price || 0;
                  const totalPrice = (item.quantity || 1) * unitPrice;

                  return (
                    <div
                      key={item.id}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-zinc-50/60 dark:hover:bg-[#181c22] transition-colors"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {itemCode}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            [{item.department_code || 'DEPT'}] {item.department_name || 'Departemen'}
                          </span>
                          <PriorityBadge level={item.priority_level} showFull />
                          <LifecycleBadge status={item.lifecycle_status} />
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                          {itemName}
                        </h4>

                        {item.specification && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Spesifikasi: {item.specification}
                          </p>
                        )}

                        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                          <span>
                            Volume: <strong className="text-zinc-800 dark:text-zinc-200">{item.quantity} {item.unit}</strong>
                          </span>
                          <span>
                            Harga Satuan:{' '}
                            <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                              {formatCurrency(unitPrice)}
                            </strong>
                          </span>
                          <span>
                            Total Estimasi:{' '}
                            <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                              {formatCurrency(totalPrice)}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Right: Stepper / Approval Details */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                        <div className="text-left sm:text-right text-xs space-y-1">
                          <div>
                            Approval PM:{' '}
                            <span
                              className={`font-bold ${
                                item.pm_buy_approval === 'approved'
                                  ? 'text-emerald-500'
                                  : item.pm_item_approval === 'approved'
                                  ? 'text-blue-500'
                                  : 'text-amber-500'
                              }`}
                            >
                              {item.pm_buy_approval === 'approved'
                                ? 'Disetujui Beli'
                                : item.pm_item_approval === 'approved'
                                ? 'Disetujui Urgensi'
                                : 'Menunggu Approval'}
                            </span>
                          </div>
                          {item.delivery_status && item.delivery_status !== 'none' && (
                            <DeliveryBadge status={item.delivery_status} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Verifikasi Kuitansi */}
      {currentTab === 'receipts' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Antrean Verifikasi Kuitansi Fisik & Nota
              </h2>
              <span className="text-xs font-semibold text-zinc-400">
                {verifiedProofsCount} / {allProofs.length} Terverifikasi
              </span>
            </div>

            <div className="divide-y divide-zinc-200 dark:divide-[#232830]">
              {allProofs.length === 0 ? (
                <div className="text-center py-16 px-4 text-xs text-zinc-400">
                  Belum ada bukti kuitansi diunggah oleh logistik.
                </div>
              ) : (
                allProofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50/60 dark:hover:bg-[#181c22] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Thumbnail */}
                      <img
                        src={proof.file_url}
                        alt="Bukti Kuitansi"
                        className="w-16 h-16 rounded-xl object-cover border border-zinc-300 dark:border-[#232830] cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedProofPreview(proof.file_url)}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {proof.transaction_code}
                          </span>
                          <span className="text-xs text-zinc-400">
                            &bull; {proof.vendor_name}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Nominal Transaksi: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(proof.total_amount)}</strong>
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          File: {proof.file_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {proof.verified_by_finance ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                          <Check className="w-3.5 h-3.5" />
                          <span>Terverifikasi Valid</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => verifyProofByFinance(proof.id, true, 'Kuitansi fisik sesuai dan valid')}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Verifikasi Kuitansi</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Jurnal Akuntansi */}
      {currentTab === 'journals' && (
        <div className="bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#232830]">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Buku Jurnal Umum (General Ledger Otomatis)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-[#101317] border-b border-zinc-200 dark:border-[#232830] text-zinc-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Keterangan / Akun</th>
                  <th className="p-4">Kode Akun</th>
                  <th className="p-4 text-right">Debit</th>
                  <th className="p-4 text-right">Kredit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-[#232830]">
                {journalEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-50/60 dark:hover:bg-[#181c22]">
                    <td className="p-4 font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      <div>{formatDate(entry.entry_date)}</div>
                    </td>
                    <td className="p-4 text-zinc-900 dark:text-white font-medium">
                      <div>{entry.description}</div>
                      <div className="text-[10px] text-zinc-400 font-normal">{entry.account_name}</div>
                    </td>
                    <td className="p-4 font-mono text-zinc-500">
                      {entry.account_code}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-zinc-900 dark:text-white">
                      {entry.entry_type === 'DEBIT' ? formatCurrency(entry.amount) : '-'}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-zinc-900 dark:text-white">
                      {entry.entry_type === 'CREDIT' ? formatCurrency(entry.amount) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Laporan Rekap PM */}
      {currentTab === 'report' && (
        <div className="p-6 bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Status Laporan Keuangan Mingguan (Rekap PM)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Laporan realisasi pengadaan dan kas mingguan yang diserahkan untuk otorisasi Project Manager.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                title="Unduh Laporan Mingguan & Invoice (PDF)"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'Mencetak PDF...' : 'Unduh PDF Laporan'}</span>
              </button>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  financeReport.status === 'approved_by_pm'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}
              >
                Status: {financeReport.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] space-y-2 text-xs">
            <div>
              Total Pencairan Kas: <strong>{formatCurrency(totalDisbursed)}</strong>
            </div>
            <div>
              Total Pengeluaran: <strong>{formatCurrency(totalSpent)}</strong>
            </div>
            <div>
              Sisa Saldo Kas: <strong>{formatCurrency(remainingCash)}</strong>
            </div>
            {financeReport.pm_approval_notes && (
              <div className="pt-2 text-zinc-500">
                Catatan PM: <em>&ldquo;{financeReport.pm_approval_notes}&rdquo;</em>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Preview Image */}
      {selectedProofPreview && (
        <div
          onClick={() => setSelectedProofPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer"
        >
          <div className="max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-zinc-700 bg-[#14171c] p-2">
            <img
              src={selectedProofPreview}
              alt="Preview Nota"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Modal Submit Report to PM */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">
              Kirim Laporan Kas ke Project Manager
            </h3>
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Catatan Rekonsiliasi Kas
                </label>
                <textarea
                  rows={3}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="w-full p-3 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-[#232830]">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Kirim ke PM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit / Otorisasi Total Kas */}
      {isEditCashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-[#232830] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                    Ubah Total Kas Operasional
                  </h3>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {activePeriod.period_name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditCashModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Summary Banner */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-[10px] text-zinc-400 font-medium">Kas Berjalan</div>
                <div className="font-bold font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {formatCurrency(totalAvailable)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 font-medium">Total Realisasi PO</div>
                <div className="font-bold font-mono text-blue-500 mt-0.5">
                  {formatCurrency(totalSpent)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 font-medium">Sisa Kas Saat Ini</div>
                <div className={`font-bold font-mono mt-0.5 ${isSurplus ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(remainingCash)}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveCash} className="space-y-4">
              {/* Field 1: Pencairan Kas Mingguan */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Nominal Pencairan Kas Mingguan (Disbursed Budget)
                  </label>
                  <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(Number(cashDisbursedInput) || 0)}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={cashDisbursedInput}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                    setCashDisbursedInput(cleanVal);
                  }}
                  onKeyDown={(e) => {
                    if (['.', ',', '-', '+', 'e', 'E'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="Masukkan nominal kas spesifik (contoh: 15750000)..."
                  className="w-full p-3 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                  * Bebas input nominal spesifik berapa saja (hanya angka 0-9, tanpa titik atau koma).
                </p>
                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-zinc-400 font-semibold mr-1">Preset Cepat:</span>
                  {[100000000, 150000000, 200000000, 250000000, 300000000, 500000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCashDisbursedInput(String(preset))}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        Number(cashDisbursedInput) === preset
                          ? 'bg-emerald-500 text-slate-950 ring-1 ring-emerald-500'
                          : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1f252e] dark:hover:bg-[#28313e] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-[#2d3644]'
                      }`}
                    >
                      {preset / 1000000} Jt
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 2: Saldo Rollover Minggu Sebelumnya */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Saldo Surplus Rollover dari Periode Lalu (Rp)
                  </label>
                  <span className="text-[11px] font-mono font-bold text-zinc-600 dark:text-zinc-300">
                    {formatCurrency(Number(cashRolloverInput) || 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={cashRolloverInput}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                      setCashRolloverInput(cleanVal);
                    }}
                    onKeyDown={(e) => {
                      if (['.', ',', '-', '+', 'e', 'E'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="Masukkan saldo rollover (contoh: 2500000)..."
                    className="flex-1 p-2.5 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setCashRolloverInput('0')}
                    className="px-3 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1f252e] dark:hover:bg-[#28313e] text-xs font-semibold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-[#2d3644] cursor-pointer"
                  >
                    Nol-kan (0)
                  </button>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                  <span>Total Kas Tersedia Baru:</span>
                  <strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(Number(cashDisbursedInput || 0) + Number(cashRolloverInput || 0))}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400 text-[11px]">
                  <span>Total Pengeluaran PO Berjalan:</span>
                  <span className="font-mono text-red-500">-{formatCurrency(totalSpent)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-emerald-500/20 text-zinc-800 dark:text-zinc-200 font-bold">
                  <span>Estimasi Saldo Kas Akhir:</span>
                  <span className={`font-mono text-xs ${
                    (Number(cashDisbursedInput || 0) + Number(cashRolloverInput || 0)) - totalSpent >= 0
                      ? 'text-emerald-500'
                      : 'text-red-500'
                  }`}>
                    {formatCurrency((Number(cashDisbursedInput || 0) + Number(cashRolloverInput || 0)) - totalSpent)}
                  </span>
                </div>
              </div>

              {/* Field 3: Catatan Perubahan Kas */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Catatan / Keterangan Penyesuaian Kas
                </label>
                <textarea
                  rows={2}
                  value={cashNotesInput}
                  onChange={(e) => setCashNotesInput(e.target.value)}
                  placeholder="Contoh: Penambahan pagu likuiditas operasional kas minggu ke-36..."
                  className="w-full p-2.5 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Feedback Alert */}
              {cashFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    cashFeedback.type === 'success'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                  }`}
                >
                  {cashFeedback.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{cashFeedback.message}</span>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-[#232830]">
                <button
                  type="button"
                  onClick={() => setIsEditCashModalOpen(false)}
                  disabled={isSavingCash}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingCash}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                  {isSavingCash ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan & Terapkan Kas</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto Agree Modal */}
      {isAutoAgreeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-[#232830] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                    Auto Agree Urgensi Pengadaan
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Otorisasi persetujuan massal cepat oleh Admin Finance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoAgreeModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAutoAgree} className="space-y-4">
              {/* Target Scope Selection: Filter ON vs Filter OFF */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Pilih Cakupan Auto-Agree:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Filtered items (Filter ON) */}
                  <div
                    onClick={() => setAutoAgreeScope('filtered')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      autoAgreeScope === 'filtered'
                        ? 'bg-emerald-500/10 border-emerald-500 text-zinc-900 dark:text-white ring-1 ring-emerald-500'
                        : 'bg-zinc-50 dark:bg-[#0e1115] border-zinc-200 dark:border-[#232830] text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">Item Terfilter Saja</span>
                      <span className={`w-2 h-2 rounded-full ${isFilterActive ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                    </div>
                    <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {filteredUrgencyItems.length} Barang
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      Nilai: {formatCurrency(totalFilteredUrgencyCost)}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      {isFilterActive ? '(Mode Filter ON aktif)' : '(Filter nonaktif / sama)'}
                    </div>
                  </div>

                  {/* Option 2: All items in queue (Filter OFF / Semua) */}
                  <div
                    onClick={() => setAutoAgreeScope('all')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      autoAgreeScope === 'all'
                        ? 'bg-emerald-500/10 border-emerald-500 text-zinc-900 dark:text-white ring-1 ring-emerald-500'
                        : 'bg-zinc-50 dark:bg-[#0e1115] border-zinc-200 dark:border-[#232830] text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">Semua Antrean Pending</span>
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                    <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
                      {pendingItemApprovals.length} Barang
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      Nilai: {formatCurrency(totalPendingUrgencyCost)}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      (Mode Filter OFF / Seluruh antrean)
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary of what will be approved */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] space-y-2">
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Ringkasan Eksekusi:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {autoAgreeScope === 'filtered' && isFilterActive ? filteredUrgencyItems.length : pendingItemApprovals.length} Barang
                  </span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                  <span>Total Estimasi Biaya:</span>
                  <strong className="font-mono text-zinc-900 dark:text-white">
                    {formatCurrency(
                      autoAgreeScope === 'filtered' && isFilterActive ? totalFilteredUrgencyCost : totalPendingUrgencyCost
                    )}
                  </strong>
                </div>
                <p className="text-[11px] text-zinc-400 italic pt-1 border-t border-zinc-200 dark:border-[#1e232b]">
                  Seluruh barang terpilih akan diubah statusnya menjadi <strong>Disetujui Urgensi</strong> dan diteruskan ke tahap Otorisasi Pembelian oleh Project Manager.
                </p>
              </div>

              {/* Approval Notes */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Catatan Persetujuan Finance (Opsional)
                </label>
                <input
                  type="text"
                  value={autoAgreeNotes}
                  onChange={(e) => setAutoAgreeNotes(e.target.value)}
                  placeholder="Contoh: Disetujui otomatis oleh Admin Finance..."
                  className="w-full p-2.5 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-[#232830]">
                <button
                  type="button"
                  onClick={() => setIsAutoAgreeModalOpen(false)}
                  disabled={isAutoAgreeing}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    isAutoAgreeing ||
                    (autoAgreeScope === 'filtered' && isFilterActive
                      ? filteredUrgencyItems.length === 0
                      : pendingItemApprovals.length === 0)
                  }
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                  {isAutoAgreeing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses Auto Agree...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        Eksekusi Auto Agree ({autoAgreeScope === 'filtered' && isFilterActive ? filteredUrgencyItems.length : pendingItemApprovals.length} Barang)
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Urgency Reason Modal */}
      {rejectUrgencyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Tolak Urgensi Barang
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                Item: <strong>{rejectUrgencyModalItem.name}</strong>
              </p>
            </div>
            <form onSubmit={handleConfirmRejectUrgency} className="space-y-4">
              <textarea
                rows={3}
                required
                placeholder="Tuliskan alasan penolakan urgensi untuk departemen pemohon..."
                value={rejectUrgencyReason}
                onChange={(e) => setRejectUrgencyReason(e.target.value)}
                className="w-full p-3 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-red-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectUrgencyModalItem(null)}
                  disabled={isRejectingUrgency}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isRejectingUrgency}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  {isRejectingUrgency ? 'Memproses...' : 'Konfirmasi Tolak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

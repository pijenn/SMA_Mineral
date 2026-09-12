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
} from 'lucide-react';
import { generateWeeklyReportPdf } from '@/lib/pdfGenerator';

interface FinanceDashboardProps {
  activeTab?: 'budget' | 'requests' | 'receipts' | 'journals' | 'report';
  onTabChange?: (tab: 'budget' | 'requests' | 'receipts' | 'journals' | 'report') => void;
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
  } = useApp();

  const [localTab, setLocalTab] = useState<'budget' | 'requests' | 'receipts' | 'journals' | 'report'>(activeTab);
  const currentTab = onTabChange ? activeTab : localTab;
  const setTab = (t: 'budget' | 'requests' | 'receipts' | 'journals' | 'report') => {
    if (onTabChange) onTabChange(t);
    setLocalTab(t);
  };

  const [selectedProofPreview, setSelectedProofPreview] = useState<string | null>(null);
  const [reportNotes, setReportNotes] = useState('Anggaran operasional mingguan telah direkonsiliasi dengan kuitansi fisik.');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Edit Cash Modal States
  const [isEditCashModalOpen, setIsEditCashModalOpen] = useState(false);
  const [cashDisbursedInput, setCashDisbursedInput] = useState<number>(activePeriod.disbursed_budget);
  const [cashRolloverInput, setCashRolloverInput] = useState<number>(activePeriod.previous_rollover_balance);
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
    setCashDisbursedInput(activePeriod.disbursed_budget);
    setCashRolloverInput(activePeriod.previous_rollover_balance);
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
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            <span>Kirim Laporan ke PM</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
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

        {/* Card 2: Total Realisasi Pengeluaran */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Total Realisasi Pembelian (PO)
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {formatCurrency(totalSpent)}
            </div>
          </div>
        </div>

        {/* Card 3: Status Saldo Likuiditas */}
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
              {isSurplus ? 'Sisa Saldo Kas (Surplus)' : 'Defisit Anggaran Kas'}
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

        {/* Card 4: Kuitansi Terverifikasi */}
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
                  type="number"
                  min="0"
                  step="1000000"
                  value={cashDisbursedInput}
                  onChange={(e) => setCashDisbursedInput(Number(e.target.value) || 0)}
                  placeholder="Masukkan nominal kas mingguan (Rp)..."
                  className="w-full p-3 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-zinc-400 font-semibold mr-1">Preset Cepat:</span>
                  {[100000000, 150000000, 200000000, 250000000, 300000000, 500000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCashDisbursedInput(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        cashDisbursedInput === preset
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
                    type="number"
                    min="0"
                    step="500000"
                    value={cashRolloverInput}
                    onChange={(e) => setCashRolloverInput(Number(e.target.value) || 0)}
                    placeholder="Masukkan saldo rollover (Rp)..."
                    className="flex-1 p-2.5 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setCashRolloverInput(0)}
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
    </div>
  );
}

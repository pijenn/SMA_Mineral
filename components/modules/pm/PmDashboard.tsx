'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ProcurementRequestItem, PriorityLevel } from '@/lib/types';
import { formatCurrency, formatDate, isAllDepartments } from '@/lib/utils';
import { PriorityBadge, LifecycleBadge, DeliveryBadge } from '@/components/ui/StatusBadge';
import { LiveStepper } from '@/components/ui/LiveStepper';
import { UserManagementModal } from './UserManagementModal';
import { generateWeeklyReportPdf } from '@/lib/pdfGenerator';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileCheck,
  Check,
  Layers,
  ArrowRight,
  Sparkles,
  Users,
  Wallet,
  Download,
  FileText,
  Printer,
  Building2,
  Receipt,
} from 'lucide-react';

interface PmDashboardProps {
  activeTab?: 'item_approval' | 'buy_approval' | 'rollover' | 'final_report';
  onTabChange?: (tab: 'item_approval' | 'buy_approval' | 'rollover' | 'final_report') => void;
}

export function PmDashboard({ activeTab = 'item_approval', onTabChange }: PmDashboardProps) {
  const {
    activePeriod,
    selectedDepartmentId,
    departments,
    currentUser,
    requestItems,
    routineItems,
    transactions,
    financeReport,
    approveItemByPm,
    approveBuyByPm,
    approveFinanceReportByPm,
  } = useApp();

  const [localTab, setLocalTab] = useState<'item_approval' | 'buy_approval' | 'rollover' | 'final_report'>(activeTab);
  const currentTab = onTabChange ? activeTab : localTab;
  const setTab = (t: 'item_approval' | 'buy_approval' | 'rollover' | 'final_report') => {
    if (onTabChange) onTabChange(t);
    setLocalTab(t);
  };

  const [rejectModalItem, setRejectModalItem] = useState<{ id: string; type: 'item' | 'buy' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Total metrics
  const totalDisbursed = activePeriod.disbursed_budget;
  const totalAvailable = totalDisbursed + activePeriod.previous_rollover_balance;
  const totalSpent = transactions.reduce((acc, t) => acc + t.total_amount, 0);
  const remainingCash = totalAvailable - totalSpent;
  const isSurplus = remainingCash >= 0;

  // Filter purchased items for reports
  const purchasedItems = requestItems.filter((item) => {
    const isPurchasedStatus =
      item.lifecycle_status === 'purchased' ||
      item.lifecycle_status === 'processing_delivery' ||
      item.lifecycle_status === 'in_transit' ||
      item.lifecycle_status === 'received_at_site';
    const hasDelivery = item.delivery_status && item.delivery_status !== 'none';
    return isPurchasedStatus || hasDelivery;
  });

  const displayPurchasedItems =
    purchasedItems.length > 0
      ? purchasedItems
      : requestItems.filter(
          (item) => item.pm_buy_approval === 'approved' || item.lifecycle_status === 'pm_buy_approved'
        );

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

  // Department scope check
  const isAllDept = isAllDepartments(selectedDepartmentId);
  const deptItems = isAllDept
    ? requestItems
    : requestItems.filter((i) => i.department_id === selectedDepartmentId);

  // Queues
  const pendingItemApprovals = deptItems.filter(
    (i) => i.lifecycle_status === 'validated' || (i.lifecycle_status === 'submitted' && i.pm_item_approval === 'pending')
  );

  const pendingBuyApprovals = deptItems.filter(
    (i) => i.lifecycle_status === 'finance_budgeted' || (i.pm_item_approval === 'approved' && i.pm_buy_approval === 'pending')
  );

  const backlogItems = deptItems.filter(
    (i) => i.lifecycle_status === 'deferred_deficit' || i.lifecycle_status === 'deferred_next_week' || i.is_rollover
  );

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalItem) return;

    if (rejectModalItem.type === 'item') {
      approveItemByPm(rejectModalItem.id, false, rejectReason);
    } else {
      approveBuyByPm(rejectModalItem.id, false, rejectReason);
    }

    setRejectModalItem(null);
    setRejectReason('');
  };

  const handleAllocateRollover = (itemId: string) => {
    approveBuyByPm(itemId, true, 'Dialokasikan menggunakan saldo surplus kas mingguan.');
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Project Manager Panel
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Otoritas Eksekutif
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Approval 2-tahap (urgensi barang & otorisasi beli), alokasi surplus saldo kas, dan manajemen akun staf.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            title="Unduh Laporan Mingguan & Invoice Pengadaan (PDF)"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Mencetak PDF...' : 'Unduh PDF Laporan'}</span>
          </button>

          <button
            onClick={() => setIsUserMgmtOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Kelola Akun Pengguna</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Anggaran Tersedia */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Total Likuiditas Kas
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {formatCurrency(totalAvailable)}
            </div>
          </div>
        </div>

        {/* Card 2: Pending Approval Barang (Stage 1) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Pending Urgensi Barang
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {pendingItemApprovals.length} Menunggu
            </div>
          </div>
        </div>

        {/* Card 3: Pending Otorisasi Beli (Stage 2) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Pending Otorisasi Beli (PO)
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {pendingBuyApprovals.length} Menunggu
            </div>
          </div>
        </div>

        {/* Card 4: Sisa Kas Real-time */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div
            className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
              isSurplus
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}
          >
            {isSurplus ? <TrendingUp className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {isSurplus ? 'Sisa Saldo Kas (Surplus)' : 'Defisit Anggaran'}
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
      </div>

      {/* Quick Action Banner Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          Aksi Cepat Project Manager
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setIsUserMgmtOpen(true)}
            className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] flex items-center justify-between gap-4 cursor-pointer group hover:border-purple-500/50 hover:bg-zinc-50 dark:hover:bg-[#181c22] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-purple-500 transition-colors">
                  Kelola Akun & Hak Akses Pengguna
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Buat akun baru atau ubah role departemen di database Supabase.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all shrink-0" />
          </div>

          <div
            onClick={() => setTab('rollover')}
            className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] flex items-center justify-between gap-4 cursor-pointer group hover:border-emerald-500/50 hover:bg-zinc-50 dark:hover:bg-[#181c22] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                  Alokasi Surplus Saldo Kas ({formatCurrency(remainingCash > 0 ? remainingCash : 0)})
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Gunakan surplus sisa kas untuk membiayai item yang tertunda defisit.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0" />
          </div>
        </div>
      </div>

      {/* Module Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-[#232830] pb-3">
        <button
          onClick={() => setTab('item_approval')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentTab === 'item_approval'
              ? 'bg-emerald-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
          }`}
        >
          Persetujuan Urgensi Barang ({pendingItemApprovals.length})
        </button>
        <button
          onClick={() => setTab('buy_approval')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentTab === 'buy_approval'
              ? 'bg-emerald-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
          }`}
        >
          Otorisasi Pembelian PO ({pendingBuyApprovals.length})
        </button>
        <button
          onClick={() => setTab('rollover')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentTab === 'rollover'
              ? 'bg-emerald-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
          }`}
        >
          Alokasi Surplus & Rollover ({backlogItems.length})
        </button>
        <button
          onClick={() => setTab('final_report')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentTab === 'final_report'
              ? 'bg-emerald-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
          }`}
        >
          Sign-Off Laporan Mingguan
        </button>
      </div>

      {/* Tab: Persetujuan Urgensi Barang (Stage 1) */}
      {currentTab === 'item_approval' && (
        <div className="bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Antrean Persetujuan Urgensi Kebutuhan (Tahap 1)
            </h2>
            <span className="text-xs font-semibold text-zinc-400">
              {pendingItemApprovals.length} Barang Menunggu
            </span>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-[#232830]">
            {pendingItemApprovals.length === 0 ? (
              <div className="text-center py-16 px-4 text-xs text-zinc-400">
                Tidak ada antrean barang menunggu persetujuan urgensi.
              </div>
            ) : (
              pendingItemApprovals.map((item) => {
                const routine = routineItems.find((r) => r.id === item.routine_item_id);
                const itemName = routine?.name || item.custom_item_name || 'Barang Tambang';
                const totalEstimatedCost = item.estimated_total_price || (item.quantity * (item.final_unit_price || 0));

                return (
                  <div
                    key={item.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50/60 dark:hover:bg-[#181c22] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                          Dept: <strong className="text-zinc-800 dark:text-zinc-200">{item.department_name}</strong>
                        </span>
                        <PriorityBadge level={item.priority_level} showFull />
                        <LifecycleBadge status={item.lifecycle_status} />
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                        {itemName}
                      </h4>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-x-4">
                        <span>
                          Jumlah: <strong className="text-zinc-800 dark:text-zinc-200">{item.quantity} {item.unit}</strong>
                        </span>
                        <span>
                          Estimasi Biaya:{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                            {formatCurrency(totalEstimatedCost)}
                          </strong>
                        </span>
                        {item.specification && (
                          <span className="italic text-zinc-400">&ldquo;{item.specification}&rdquo;</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      <button
                        onClick={() => setRejectModalItem({ id: item.id, type: 'item' })}
                        className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => approveItemByPm(item.id, true)}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Setujui Barang</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab: Otorisasi Pembelian PO (Stage 2) */}
      {currentTab === 'buy_approval' && (
        <div className="bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Otorisasi Pembelian & Pencairan Kas ke Vendor (Tahap 2)
            </h2>
            <span className="text-xs font-semibold text-zinc-400">
              {pendingBuyApprovals.length} Barang Siap Eksekusi
            </span>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-[#232830]">
            {pendingBuyApprovals.length === 0 ? (
              <div className="text-center py-16 px-4 text-xs text-zinc-400">
                Tidak ada antrean barang menunggu otorisasi pembelian.
              </div>
            ) : (
              pendingBuyApprovals.map((item) => {
                const routine = routineItems.find((r) => r.id === item.routine_item_id);
                const itemName = routine?.name || item.custom_item_name || 'Barang Tambang';
                const totalCost = (item.quantity || 1) * (item.final_unit_price || 0);

                return (
                  <div
                    key={item.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50/60 dark:hover:bg-[#181c22] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                          Dept: <strong className="text-zinc-800 dark:text-zinc-200">{item.department_name}</strong>
                        </span>
                        <PriorityBadge level={item.priority_level} showFull />
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                        {itemName}
                      </h4>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-x-4">
                        <span>
                          Jumlah: <strong className="text-zinc-800 dark:text-zinc-200">{item.quantity} {item.unit}</strong>
                        </span>
                        <span>
                          Harga Deal Sourcing:{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                            {formatCurrency(item.final_unit_price || 0)} / {item.unit}
                          </strong>
                        </span>
                        <span>
                          Total PO:{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                            {formatCurrency(totalCost)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      <button
                        onClick={() => setRejectModalItem({ id: item.id, type: 'buy' })}
                        className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Hold / Tolak
                      </button>
                      <button
                        onClick={() => approveBuyByPm(item.id, true)}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Otorisasi Beli (PM Sign)</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab: Alokasi Surplus Rollover */}
      {currentTab === 'rollover' && (
        <div className="bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Daftar Barang Tertunda (Backlog Defisit Kas)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Surplus Kas Tersedia: <strong className="text-emerald-500 font-mono">{formatCurrency(remainingCash > 0 ? remainingCash : 0)}</strong>
              </p>
            </div>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-[#232830]">
            {backlogItems.length === 0 ? (
              <div className="text-center py-16 px-4 text-xs text-zinc-400">
                Tidak ada barang yang tertunda karena defisit kas.
              </div>
            ) : (
              backlogItems.map((item) => {
                const routine = routineItems.find((r) => r.id === item.routine_item_id);
                const itemName = routine?.name || item.custom_item_name || 'Barang Tambang';
                const totalCost = (item.quantity || 1) * (item.final_unit_price || 0);

                return (
                  <div
                    key={item.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50/60 dark:hover:bg-[#181c22] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                          Dept: <strong className="text-zinc-800 dark:text-zinc-200">{item.department_name}</strong>
                        </span>
                        <PriorityBadge level={item.priority_level} showFull />
                        <LifecycleBadge status={item.lifecycle_status} />
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                        {itemName}
                      </h4>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Kebutuhan Biaya: <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{formatCurrency(totalCost)}</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAllocateRollover(item.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Alokasikan Kas Sekarang</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab: Sign-Off Laporan Mingguan */}
      {currentTab === 'final_report' && (
        <div className="space-y-6">
          {/* Main Card Header & Action */}
          <div className="p-5 sm:p-6 bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                  Laporan Mingguan & Rekapitulasi Kas (Weekly Invoice)
                </h2>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-bold border ${
                    financeReport.status === 'approved_by_pm'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : financeReport.status === 'submitted_by_finance'
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}
                >
                  {financeReport.status === 'approved_by_pm'
                    ? 'DISETUJUI OLEH PM'
                    : financeReport.status === 'submitted_by_finance'
                    ? 'DIAJUKAN FINANCE'
                    : 'DRAFT LAPORAN'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Periode:{' '}
                <strong className="text-zinc-800 dark:text-zinc-200">
                  {activePeriod.period_name || `Minggu ke-${activePeriod.week_number} (${activePeriod.year})`}
                </strong>{' '}
                ({formatDate(activePeriod.start_date)} - {formatDate(activePeriod.end_date)})
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'Mencetak PDF...' : 'Unduh PDF Laporan Mingguan'}</span>
              </button>

              {financeReport.status !== 'approved_by_pm' ? (
                <button
                  onClick={() => approveFinanceReportByPm('Disetujui dan diverifikasi oleh Project Manager')}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Otorisasi & Tanda Tangan PM</span>
                </button>
              ) : (
                <span className="px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Telah Ditandatangani PM</span>
                </span>
              )}
            </div>
          </div>

          {/* 3-Column Financial & Surplus Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Kas Likuid Tersedia</div>
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white mt-1">
                {formatCurrency(totalAvailable)}
              </div>
              <div className="text-[11px] text-zinc-400 mt-2 space-y-0.5">
                <div>Pencairan Kas: <strong>{formatCurrency(totalDisbursed)}</strong></div>
                <div>Rollover Lalu: <strong>{formatCurrency(activePeriod.previous_rollover_balance)}</strong></div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Grand Total Realisasi Belanja</div>
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-red-600 dark:text-red-400 mt-1">
                {formatCurrency(totalSpent)}
              </div>
              <div className="text-[11px] text-zinc-400 mt-2 space-y-0.5">
                <div>Terealisasi: <strong>{displayPurchasedItems.length} Item Barang</strong></div>
                <div>Transaksi PO: <strong>{transactions.length} Faktur / Kuitansi</strong></div>
              </div>
            </div>

            <div
              className={`p-5 rounded-2xl border shadow-xs ${
                isSurplus
                  ? 'bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500/30'
                  : 'bg-red-500/5 dark:bg-red-950/10 border-red-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Sisa Saldo Kas (Surplus)</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isSurplus
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  }`}
                >
                  {isSurplus ? 'SURPLUS KAS' : 'DEFISIT KAS'}
                </span>
              </div>
              <div
                className={`text-xl sm:text-2xl font-bold font-mono tracking-tight mt-1 ${
                  isSurplus ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {isSurplus ? `+ ${formatCurrency(remainingCash)}` : `- ${formatCurrency(Math.abs(remainingCash))}`}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
                {isSurplus
                  ? 'Sisa kas dapat di-rollover ke minggu depan atau dialokasikan untuk backlog permohonan.'
                  : 'Pengeluaran melebihi kas tersedia, membutuhkan injeksi anggaran tambahan.'}
              </div>
            </div>
          </div>

          {/* Rincian Barang yang Dibeli (Invoice Itemized Table) */}
          <div className="bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#232830] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  <span>Rincian Barang Realisasi Pengadaan (Weekly Invoice Items)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Daftar seluruh item yang dibeli beserta departemen pemohon, kuantitas, harga, dan subtotal yang masuk dalam faktur mingguan.
                </p>
              </div>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1f242c] dark:hover:bg-[#282e38] text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Cetak Invoice PDF</span>
              </button>
            </div>

            {displayPurchasedItems.length === 0 ? (
              <div className="text-center py-16 px-4 text-xs text-zinc-400">
                Belum ada data barang yang dibeli pada periode ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-[#0e1115] text-zinc-500 dark:text-zinc-400 uppercase text-[11px] font-bold border-b border-zinc-200 dark:border-[#232830]">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Departemen Pemohon</th>
                      <th className="py-3 px-4">Nama Barang & Spesifikasi</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Harga Satuan</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                      <th className="py-3 px-4 text-center">Status Pengiriman</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-[#232830]">
                    {displayPurchasedItems.map((item, idx) => {
                      const routine = routineItems.find((r) => r.id === item.routine_item_id);
                      const itemName = item.custom_item_name || routine?.name || 'Barang Tambang';
                      const subtotal = (item.quantity || 1) * (item.final_unit_price || 0);

                      return (
                        <tr key={item.id} className="hover:bg-zinc-50/60 dark:hover:bg-[#181c22] transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono text-zinc-400">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              [{item.department_code || 'DEPT'}] {item.department_name || 'Departemen'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-zinc-900 dark:text-white">{itemName}</div>
                            {item.specification && (
                              <div className="text-[11px] text-zinc-400 mt-0.5">
                                Spek: {item.specification}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-zinc-800 dark:text-zinc-200">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-zinc-600 dark:text-zinc-300">
                            {formatCurrency(item.final_unit_price || 0)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900 dark:text-white">
                            {formatCurrency(subtotal)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {item.delivery_status && item.delivery_status !== 'none' ? (
                              <DeliveryBadge status={item.delivery_status} />
                            ) : (
                              <span className="text-[11px] text-zinc-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-zinc-50 dark:bg-[#0e1115] border-t-2 border-zinc-200 dark:border-[#232830] font-bold">
                    <tr>
                      <td colSpan={3} className="py-3.5 px-4 text-right uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                        Grand Total Realisasi Pengadaan:
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-zinc-800 dark:text-zinc-200">
                        {displayPurchasedItems.reduce((acc, i) => acc + (i.quantity || 1), 0)} Unit
                      </td>
                      <td className="py-3.5 px-4"></td>
                      <td className="py-3.5 px-4 text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(totalSpent)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* PO Transactions List (if transactions exist) */}
          {transactions.length > 0 && (
            <div className="bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#232830]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Daftar Transaksi PO & Kuitansi (Purchase Orders)
                </h3>
              </div>
              <div className="divide-y divide-zinc-200 dark:divide-[#232830]">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold font-mono text-zinc-900 dark:text-white">{tx.transaction_code}</div>
                      <div className="text-zinc-500">
                        Vendor: <strong>{tx.vendor_name}</strong> | Tanggal: {formatDate(tx.purchase_date)} | Metode: {tx.payment_method?.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-zinc-900 dark:text-white">{formatCurrency(tx.total_amount)}</div>
                      <span className="text-[11px] text-zinc-400">{tx.proofs?.length || 0} Lampiran Kuitansi</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sign-Off & Verification Notes */}
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Otorisasi & Catatan Pengesahan
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830]">
                <div className="font-bold text-zinc-700 dark:text-zinc-300">Verifikator Finance:</div>
                <div className="text-zinc-500 mt-1">Siti Nurhaliza, S.E. (Finance Supervisor)</div>
                <div className="text-[11px] text-emerald-500 mt-1 font-semibold">Tervalidasi Sistem Finance</div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830]">
                <div className="font-bold text-zinc-700 dark:text-zinc-300">Otorisasi Project Manager:</div>
                <div className="text-zinc-500 mt-1">{currentUser?.full_name || 'Bambang Wijaya, S.T.'} (Project Manager)</div>
                <div className="text-[11px] mt-1 font-semibold">
                  {financeReport.status === 'approved_by_pm' ? (
                    <span className="text-emerald-500">Telah Ditandatangani & Diotorisasi</span>
                  ) : (
                    <span className="text-amber-500">Menunggu Tanda Tangan PM</span>
                  )}
                </div>
              </div>
            </div>
            {financeReport.pm_approval_notes && (
              <div className="text-xs text-zinc-500 pt-1">
                Catatan PM: <em>&ldquo;{financeReport.pm_approval_notes}&rdquo;</em>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">
              Alasan Penolakan / Hold Pengajuan
            </h3>
            <form onSubmit={handleConfirmReject} className="space-y-4">
              <textarea
                rows={3}
                required
                placeholder="Tuliskan alasan penolakan untuk HOD / Logistik..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-red-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                >
                  Konfirmasi Tolak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      <UserManagementModal isOpen={isUserMgmtOpen} onClose={() => setIsUserMgmtOpen(false)} />
    </div>
  );
}

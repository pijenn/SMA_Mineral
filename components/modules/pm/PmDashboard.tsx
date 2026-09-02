'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ProcurementRequestItem, PriorityLevel } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PriorityBadge, LifecycleBadge, DeliveryBadge } from '@/components/ui/StatusBadge';
import { LiveStepper } from '@/components/ui/LiveStepper';
import { UserManagementModal } from './UserManagementModal';
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
} from 'lucide-react';

interface PmDashboardProps {
  activeTab?: 'item_approval' | 'buy_approval' | 'rollover' | 'final_report';
  onTabChange?: (tab: 'item_approval' | 'buy_approval' | 'rollover' | 'final_report') => void;
}

export function PmDashboard({ activeTab = 'item_approval', onTabChange }: PmDashboardProps) {
  const {
    activePeriod,
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

  // Total metrics
  const totalDisbursed = activePeriod.disbursed_budget;
  const totalAvailable = totalDisbursed + activePeriod.previous_rollover_balance;
  const totalSpent = transactions.reduce((acc, t) => acc + t.total_amount, 0);
  const remainingCash = totalAvailable - totalSpent;
  const isSurplus = remainingCash >= 0;

  // Queues
  const pendingItemApprovals = requestItems.filter(
    (i) => i.lifecycle_status === 'validated' || (i.lifecycle_status === 'submitted' && i.pm_item_approval === 'pending')
  );

  const pendingBuyApprovals = requestItems.filter(
    (i) => i.lifecycle_status === 'finance_budgeted' || (i.pm_item_approval === 'approved' && i.pm_buy_approval === 'pending')
  );

  const backlogItems = requestItems.filter(
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
        <div className="flex items-center gap-3">
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
        <div className="p-6 bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Sign-Off Laporan Keuangan & Pengadaan
            </h2>
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

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] space-y-2 text-xs">
            <div>Total Pencairan: <strong>{formatCurrency(totalDisbursed)}</strong></div>
            <div>Total Pengeluaran: <strong>{formatCurrency(totalSpent)}</strong></div>
            <div>Sisa Saldo Kas: <strong>{formatCurrency(remainingCash)}</strong></div>
            {financeReport.pm_approval_notes && (
              <div className="text-zinc-500 pt-2">
                Catatan: <em>&ldquo;{financeReport.pm_approval_notes}&rdquo;</em>
              </div>
            )}
          </div>

          {financeReport.status !== 'approved_by_pm' && (
            <button
              onClick={() => approveFinanceReportByPm('Disetujui dan diverifikasi oleh Project Manager')}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              <span>Otorisasi & Tanda Tangani Laporan (PM Sign-off)</span>
            </button>
          )}
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

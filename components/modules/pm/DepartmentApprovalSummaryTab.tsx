'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  summarizeApprovedItemsByDepartment,
  generateDepartmentApprovalExcel,
  ApprovalSummaryScope,
  DepartmentApprovalSummary,
} from '@/lib/excelGenerator';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PriorityBadge, LifecycleBadge, DeliveryBadge } from '@/components/ui/StatusBadge';
import {
  FileSpreadsheet,
  Download,
  Building2,
  Layers,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Info,
  Package,
} from 'lucide-react';

interface DepartmentApprovalSummaryTabProps {
  onNavigateToFinalReport?: () => void;
  onNavigateToBuyApproval?: () => void;
}

export function DepartmentApprovalSummaryTab({
  onNavigateToFinalReport,
  onNavigateToBuyApproval,
}: DepartmentApprovalSummaryTabProps) {
  const {
    activePeriod,
    requestItems,
    departments,
    routineItems,
    currentUser,
  } = useApp();

  const [scope, setScope] = useState<ApprovalSummaryScope>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeEmptyDepts, setIncludeEmptyDepts] = useState(false);
  const [expandedDeptIds, setExpandedDeptIds] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState(false);

  // Compute department summary data
  const summaryResult = useMemo(() => {
    return summarizeApprovedItemsByDepartment({
      requestItems,
      departments,
      routineItems,
      scope,
      includeEmptyDepartments: includeEmptyDepts,
    });
  }, [requestItems, departments, routineItems, scope, includeEmptyDepts]);

  // Filter rows by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return summaryResult.rows;
    const q = searchQuery.toLowerCase().trim();
    return summaryResult.rows.filter(
      (r) =>
        r.department_name.toLowerCase().includes(q) ||
        r.department_code.toLowerCase().includes(q) ||
        r.items.some((it) => (it.custom_item_name || '').toLowerCase().includes(q))
    );
  }, [summaryResult.rows, searchQuery]);

  const toggleExpand = (deptId: string) => {
    setExpandedDeptIds((prev) => ({
      ...prev,
      [deptId]: !prev[deptId],
    }));
  };

  const handleDownloadExcel = () => {
    try {
      setIsExporting(true);
      generateDepartmentApprovalExcel({
        period: activePeriod,
        summaryRows: summaryResult.rows,
        grandTotalItems: summaryResult.grandTotalItems,
        grandTotalQuantity: summaryResult.grandTotalQuantity,
        grandTotalBudget: summaryResult.grandTotalBudget,
        currentUser,
        scope,
        routineItems,
      });
    } catch (err) {
      console.error('Error exporting Excel:', err);
      alert('Terjadi kesalahan saat mengunduh file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Primary Export Button */}
      <div className="p-5 sm:p-6 bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
              Rekap Approval Pengadaan Per Departemen (Weekly Dept Summary)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Sebelum Laporan Mingguan
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ringkasan akumulasi seluruh barang yang telah disetujui oleh Project Manager (PM) sebelum proses Sign-Off Laporan Mingguan.{' '}
            <strong className="text-zinc-700 dark:text-zinc-300">
              Format Kolom: DEPT NAME | TOTAL ITEM THEY REQUEST | TOTAL BUDGET
            </strong>
          </p>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 pt-0.5 flex flex-wrap items-center gap-2">
            <span>Periode Aktif:</span>
            <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">
              {activePeriod.period_name || `Minggu ke-${activePeriod.week_number} (${activePeriod.year})`}
            </strong>
            <span className="text-zinc-400">
              ({formatDate(activePeriod.start_date)} - {formatDate(activePeriod.end_date)})
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center shrink-0">
          <button
            onClick={handleDownloadExcel}
            disabled={isExporting || summaryResult.grandTotalItems === 0}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            title="Unduh Rekap Excel (Sheet 1: Ringkasan Dept, Sheet 2: Rincian Item)"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Membuat File Excel...' : 'Unduh Rekap Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Departemen Pemohon Disetujui */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Departemen Disetujui
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {summaryResult.totalApprovedDepartments} Departemen
            </div>
            <div className="text-[11px] text-zinc-400">
              dari total {departments.length} departemen
            </div>
          </div>
        </div>

        {/* Card 2: Total Item Disetujui */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Total Item Disetujui
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {summaryResult.grandTotalItems} Item Diajukan
            </div>
            <div className="text-[11px] text-zinc-400">
              {summaryResult.grandTotalQuantity} unit kuantitas fisik
            </div>
          </div>
        </div>

        {/* Card 3: Total Kuantitas Fisik */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Kuantitas Fisik Akumulatif
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {summaryResult.grandTotalQuantity} Unit
            </div>
            <div className="text-[11px] text-zinc-400">
              siap pengadaan / operasional
            </div>
          </div>
        </div>

        {/* Card 4: Total Anggaran Disetujui PM */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Total Anggaran Disetujui (PM)
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summaryResult.grandTotalBudget)}
            </div>
            <div className="text-[11px] text-zinc-400">
              grand total komitmen anggaran
            </div>
          </div>
        </div>
      </div>

      {/* Filter, Search & Scope Controls */}
      <div className="p-4 bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Cari nama departemen, kode, atau nama barang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Approval Scope Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830]">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Filter:</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ApprovalSummaryScope)}
              className="bg-transparent font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Disetujui PM (PO & Urgensi)</option>
              <option value="buy_only">Hanya Otorisasi Beli (Buy Approved)</option>
              <option value="urgency_only">Hanya Persetujuan Urgensi (Item Approved)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={includeEmptyDepts}
              onChange={(e) => setIncludeEmptyDepts(e.target.checked)}
              className="rounded accent-emerald-600"
            />
            <span>Semua 12 Dept</span>
          </label>
        </div>
      </div>

      {/* Format Notice Banner */}
      <div className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/15 border border-emerald-500/20 flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
        <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Struktur Kolom File Excel:</strong> Sheet 1 diformat khusus sesuai kebutuhan pelaporan eksekutif:{' '}
          <code className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
            DEPT NAME
          </code>{' '}
          |{' '}
          <code className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
            TOTAL ITEM THEY REQUEST
          </code>{' '}
          |{' '}
          <code className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
            TOTAL BUDGET
          </code>
          . Dilengkapi Sheet 2 berisikan audit rincian setiap item barang yang disetujui.
        </div>
      </div>

      {/* Main Interactive Summary Table */}
      <div className="bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#232830] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" />
              <span>Tabel Ringkasan Permohonan Disetujui PM Per Departemen</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Menampilkan {filteredRows.length} departemen dengan total {summaryResult.grandTotalItems} item yang disetujui PM.
            </p>
          </div>

          <button
            onClick={handleDownloadExcel}
            disabled={isExporting || summaryResult.grandTotalItems === 0}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
        </div>

        {filteredRows.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 dark:bg-[#181c22] flex items-center justify-center text-zinc-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              Belum Ada Item yang Disetujui PM pada Periode Ini
            </div>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Silakan lakukan otorisasi persetujuan pembelian (Buy Approval) atau persetujuan urgensi terlebih dahulu pada menu PM Panel.
            </p>
            {onNavigateToBuyApproval && (
              <button
                onClick={onNavigateToBuyApproval}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Buka Otorisasi Pembelian (PO)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-[#0e1115] text-zinc-500 dark:text-zinc-400 uppercase text-[11px] font-bold border-b border-zinc-200 dark:border-[#232830]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">DEPT NAME</th>
                  <th className="py-3 px-4 text-center">TOTAL ITEM THEY REQUEST</th>
                  <th className="py-3 px-4 text-center">TOTAL KUANTITAS</th>
                  <th className="py-3 px-4 text-right">TOTAL BUDGET</th>
                  <th className="py-3 px-4 text-center w-36">% DARI TOTAL</th>
                  <th className="py-3 px-4 text-center w-28">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-[#232830]">
                {filteredRows.map((row, idx) => {
                  const isExpanded = !!expandedDeptIds[row.department_id];
                  const budgetPercentage =
                    summaryResult.grandTotalBudget > 0
                      ? (row.total_budget / summaryResult.grandTotalBudget) * 100
                      : 0;

                  return (
                    <React.Fragment key={row.department_id || idx}>
                      <tr className="hover:bg-zinc-50/60 dark:hover:bg-[#181c22] transition-colors">
                        {/* No */}
                        <td className="py-3.5 px-4 text-center font-mono text-zinc-400">
                          {idx + 1}
                        </td>

                        {/* DEPT NAME */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                              {row.department_code}
                            </span>
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {row.department_name}
                            </span>
                          </div>
                        </td>

                        {/* TOTAL ITEM THEY REQUEST */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-mono">
                            {row.total_items_requested} Item
                          </span>
                        </td>

                        {/* TOTAL KUANTITAS */}
                        <td className="py-3.5 px-4 text-center font-mono font-medium text-zinc-700 dark:text-zinc-300">
                          {row.total_quantity} Unit
                        </td>

                        {/* TOTAL BUDGET */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                          {formatCurrency(row.total_budget)}
                        </td>

                        {/* % DARI TOTAL */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                              <span>{budgetPercentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-zinc-100 dark:bg-[#1d222b] h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(2, budgetPercentage))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Expand / Collapse Rincian */}
                        <td className="py-3.5 px-4 text-center">
                          {row.items.length > 0 ? (
                            <button
                              onClick={() => toggleExpand(row.department_id)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1f242c] dark:hover:bg-[#282e38] text-zinc-700 dark:text-zinc-300 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                              title="Tampilkan daftar barang yang disetujui untuk departemen ini"
                            >
                              <span>{isExpanded ? 'Tutup' : 'Lihat'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Nested Accordion for Item Details */}
                      {isExpanded && row.items.length > 0 && (
                        <tr>
                          <td colSpan={7} className="p-0 bg-zinc-50/70 dark:bg-[#0e1115]/70 border-y border-zinc-200 dark:border-[#232830]">
                            <div className="p-4 sm:p-5 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>
                                    Daftar Barang Disetujui PM &mdash; [{row.department_code}] {row.department_name} ({row.items.length} Item)
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono text-zinc-400">
                                  Subtotal Dept: {formatCurrency(row.total_budget)}
                                </span>
                              </div>

                              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-[#232830] bg-white dark:bg-[#14171c]">
                                <table className="w-full text-left text-[11px]">
                                  <thead className="bg-zinc-100 dark:bg-[#181c22] text-zinc-500 font-bold border-b border-zinc-200 dark:border-[#232830]">
                                    <tr>
                                      <th className="py-2.5 px-3 text-center w-8">#</th>
                                      <th className="py-2.5 px-3">Nama Barang & Spesifikasi</th>
                                      <th className="py-2.5 px-3 text-center">Prioritas</th>
                                      <th className="py-2.5 px-3 text-center">Kuantitas</th>
                                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                                      <th className="py-2.5 px-3 text-right">Total Subtotal</th>
                                      <th className="py-2.5 px-3 text-center">Status Approval</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-200 dark:divide-[#232830]">
                                    {row.items.map((it, itemIdx) => {
                                      const routine = routineItems.find((r) => r.id === it.routine_item_id);
                                      const itemName = it.custom_item_name || routine?.name || 'Barang Tambang';
                                      const unitPrice =
                                        it.final_unit_price ||
                                        (it.estimated_total_price && it.quantity
                                          ? it.estimated_total_price / it.quantity
                                          : routine?.estimated_unit_price || 0);
                                      const itemSubtotal = (it.quantity || 1) * unitPrice;

                                      return (
                                        <tr key={it.id || itemIdx} className="hover:bg-zinc-50 dark:hover:bg-[#181c22]">
                                          <td className="py-2.5 px-3 text-center text-zinc-400 font-mono">
                                            {itemIdx + 1}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <div className="font-bold text-zinc-900 dark:text-white">
                                              {itemName}
                                            </div>
                                            {it.specification && (
                                              <div className="text-[10px] text-zinc-400">
                                                Spek: {it.specification}
                                              </div>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <PriorityBadge level={it.priority_level} showFull />
                                          </td>
                                          <td className="py-2.5 px-3 text-center font-bold font-mono text-zinc-800 dark:text-zinc-200">
                                            {it.quantity} {it.unit}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-mono text-zinc-600 dark:text-zinc-400">
                                            {formatCurrency(unitPrice)}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(itemSubtotal)}
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            {it.pm_buy_approval === 'approved' ? (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                Buy Approved
                                              </span>
                                            ) : it.pm_item_approval === 'approved' ? (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                Item Approved
                                              </span>
                                            ) : (
                                              <LifecycleBadge status={it.lifecycle_status} />
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              {/* Grand Total Footer */}
              <tfoot className="bg-zinc-50 dark:bg-[#0e1115] border-t-2 border-zinc-200 dark:border-[#232830] font-bold">
                <tr>
                  <td colSpan={2} className="py-3.5 px-4 text-right uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    GRAND TOTAL PERMOHONAN DISETUJUI PM:
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-sm text-purple-600 dark:text-purple-400">
                    {summaryResult.grandTotalItems} Item
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-sm text-zinc-800 dark:text-zinc-200">
                    {summaryResult.grandTotalQuantity} Unit
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(summaryResult.grandTotalBudget)}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-xs text-zinc-500">
                    100.0%
                  </td>
                  <td className="py-3.5 px-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Bottom Step-forward Navigation Card (Connecting to Weekly Report) */}
      <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
          <div className="font-bold text-zinc-800 dark:text-zinc-200">
            Selesai Meninjau Rekapitulasi Approval Departemen?
          </div>
          <div className="mt-0.5">
            Anda dapat langsung melanjutkan ke tahap evaluasi dan penandatanganan Laporan Mingguan (Weekly Report).
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadExcel}
            disabled={isExporting || summaryResult.grandTotalItems === 0}
            className="px-4 py-2 rounded-xl bg-white dark:bg-[#14171c] hover:bg-zinc-100 dark:hover:bg-[#181c22] border border-zinc-200 dark:border-[#232830] text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Unduh Excel Ringkasan</span>
          </button>

          {onNavigateToFinalReport && (
            <button
              onClick={onNavigateToFinalReport}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Lanjut ke Sign-Off Laporan Mingguan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

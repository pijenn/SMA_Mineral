'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
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
} from 'lucide-react';

interface FinanceDashboardProps {
  activeTab?: 'budget' | 'receipts' | 'journals' | 'report';
  onTabChange?: (tab: 'budget' | 'receipts' | 'journals' | 'report') => void;
}

export function FinanceDashboard({ activeTab = 'budget', onTabChange }: FinanceDashboardProps) {
  const {
    activePeriod,
    transactions,
    journalEntries,
    financeReport,
    verifyProofByFinance,
    submitFinanceReport,
  } = useApp();

  const [localTab, setLocalTab] = useState<'budget' | 'receipts' | 'journals' | 'report'>(activeTab);
  const currentTab = onTabChange ? activeTab : localTab;
  const setTab = (t: 'budget' | 'receipts' | 'journals' | 'report') => {
    if (onTabChange) onTabChange(t);
    setLocalTab(t);
  };

  const [selectedProofPreview, setSelectedProofPreview] = useState<string | null>(null);
  const [reportNotes, setReportNotes] = useState('Anggaran operasional mingguan telah direkonsiliasi dengan kuitansi fisik.');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

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
            Perhitungan saldo likuiditas real-time, verifikasi kuitansi fisik, dan jurnal akuntansi otomatis.
          </p>
        </div>

        {/* Top Action */}
        <div className="flex items-center gap-3">
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
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
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
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Status Laporan Keuangan Mingguan
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
    </div>
  );
}

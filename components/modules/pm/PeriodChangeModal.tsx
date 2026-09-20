'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { ProcurementPeriod } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  X,
  Calendar,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  Plus,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface PeriodChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MONTH_OPTIONS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

const WEEK_OPTIONS = [
  { value: 1, label: 'Minggu 1 (Week 1)' },
  { value: 2, label: 'Minggu 2 (Week 2)' },
  { value: 3, label: 'Minggu 3 (Week 3)' },
  { value: 4, label: 'Minggu 4 (Week 4)' },
  { value: 5, label: 'Minggu 5 (Week 5)' },
];

const YEAR_OPTIONS = [2025, 2026, 2027, 2028, 2029, 2030];

export function PeriodChangeModal({ isOpen, onClose }: PeriodChangeModalProps) {
  const {
    activePeriod,
    periods,
    financeReport,
    switchPeriod,
    createAndSwitchPeriod,
    activeRole,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'create' | 'switch'>('create');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Derived week number in year (1 to 52)
  const calculatedWeekOfYear = useMemo(() => {
    return Math.min(52, Math.max(1, (selectedMonth - 1) * 4 + selectedWeek));
  }, [selectedMonth, selectedWeek]);

  const monthLabel = useMemo(() => {
    return MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label || 'Bulan';
  }, [selectedMonth]);

  const [customPeriodName, setCustomPeriodName] = useState<string>(
    `Minggu ke-${selectedWeek} (${monthLabel} ${selectedYear})`
  );

  // Sync default name when week, month, year changes
  React.useEffect(() => {
    setCustomPeriodName(`Minggu ke-${selectedWeek} (${monthLabel} ${selectedYear})`);
  }, [selectedWeek, selectedMonth, selectedYear, monthLabel]);

  // Calculate days in selected month
  const lastDayOfMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Derived dates for the chosen week/month
  const startDateStr = useMemo(() => {
    const day = Math.min(lastDayOfMonth, (selectedWeek - 1) * 7 + 1);
    const mStr = String(selectedMonth).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${selectedYear}-${mStr}-${dStr}`;
  }, [selectedYear, selectedMonth, selectedWeek, lastDayOfMonth]);

  const endDateStr = useMemo(() => {
    const day = selectedWeek === 5 ? lastDayOfMonth : Math.min(lastDayOfMonth, selectedWeek * 7);
    const mStr = String(selectedMonth).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${selectedYear}-${mStr}-${dStr}`;
  }, [selectedYear, selectedMonth, selectedWeek, lastDayOfMonth]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Calculate current surplus
  const currentSurplus = Math.max(0, financeReport.remaining_balance);

  if (!isOpen) return null;

  const handleCreateNewPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRole !== 'project_manager' && currentUser?.role !== 'project_manager') {
      setErrorMsg('Hanya Project Manager yang berwenang mengubah periode.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await createAndSwitchPeriod({
      year: selectedYear,
      week_number: calculatedWeekOfYear,
      period_name: customPeriodName.trim(),
      start_date: startDateStr,
      end_date: endDateStr,
    });

    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMsg(result.error || 'Gagal membuat periode baru.');
    }
  };

  const handleSwitchExistingPeriod = async (periodId: string) => {
    if (periodId === activePeriod.id) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    const result = await switchPeriod(periodId);
    setIsSubmitting(false);
    if (result.success) {
      onClose();
    } else {
      setErrorMsg(result.error || 'Gagal beralih periode.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-[#12151a] rounded-2xl shadow-2xl flex flex-col border border-zinc-200 dark:border-[#232830] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between bg-zinc-50 dark:bg-[#0e1115]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-zinc-900 dark:text-white">
                  Kelola Siklus Periode Pengadaan
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Khusus PM
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Atur minggu, bulan, dan tahun operasional. Pengubahan periode mereset item pengadaan dan mengalihkan saldo kas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#1c222a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-[#232830] bg-white dark:bg-[#12151a] px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'create'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Buka Periode Baru (Reset Item & Kas 0 + Surplus)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('switch')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'switch'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Pilih Periode Terdaftar ({periods.length})</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="m-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: CREATE NEW PERIOD */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateNewPeriod} className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[70vh]">
            {/* Week, Month, Year Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Week Selection */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Pilih Minggu (Week):
                </label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white font-bold focus:outline-none focus:border-purple-500"
                >
                  {WEEK_OPTIONS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Selection */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Pilih Bulan:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white font-bold focus:outline-none focus:border-purple-500"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selection */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Pilih Tahun:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white font-bold focus:outline-none focus:border-purple-500"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Period Name Preview & Edit */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Nama Label Periode:
              </label>
              <input
                type="text"
                value={customPeriodName}
                onChange={(e) => setCustomPeriodName(e.target.value)}
                placeholder="Contoh: Minggu ke-1 (Oktober 2026)"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
                required
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Nama ini akan ditampilkan pada Navbar, laporan keuangan, dan seluruh dokumen cetak PDF.
              </p>
            </div>

            {/* Cash & Surplus Roll-over Calculation Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-zinc-900 dark:text-white">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>Kalkulasi Saldo Kas Periode Baru (Otomatis)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830]">
                  <span className="text-[11px] text-zinc-500 block">Surplus Periode Ini:</span>
                  <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(currentSurplus)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830]">
                  <span className="text-[11px] text-zinc-500 block">Alokasi Kas Baru:</span>
                  <span className="text-sm font-mono font-bold text-zinc-800 dark:text-zinc-200">
                    Rp 0 (Reset)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <span className="text-[11px] text-purple-700 dark:text-purple-300 block font-semibold">
                    Saldo Awal Baru:
                  </span>
                  <span className="text-sm font-mono font-extrabold text-purple-700 dark:text-purple-300">
                    {formatCurrency(currentSurplus)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Aturan Reset:</strong> Mengaktifkan periode baru akan mengosongkan item pengadaan pada dashboard (reset ke daftar baru untuk periode ini) dan menetapkan kas awal sebesar <strong>Rp 0 + Surplus ({formatCurrency(currentSurplus)})</strong>.
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-[#232830] text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-[#1c222a] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-purple-600/25 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengaktifkan Periode...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aktifkan Periode Baru Ini</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: SWITCH EXISTING PERIOD */}
        {activeTab === 'switch' && (
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Pilih dari daftar periode yang pernah dibuka sebelumnya. Data barang dan transaksi akan beralih sesuai periode yang dipilih:
            </p>

            <div className="space-y-2">
              {periods.map((p: ProcurementPeriod) => {
                const isActive = p.id === activePeriod.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSwitchExistingPeriod(p.id)}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isActive
                        ? 'bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300 shadow-sm'
                        : 'bg-white dark:bg-[#0e1115] border-zinc-200 dark:border-[#232830] hover:border-purple-500/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white">
                          {p.period_name}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white">
                            Sedang Aktif
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-3">
                        <span>Tahun: {p.year} (W{p.week_number})</span>
                        <span>&bull;</span>
                        <span>Kas: {formatCurrency(p.disbursed_budget)}</span>
                        <span>&bull;</span>
                        <span>Surplus: {formatCurrency(p.previous_rollover_balance)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isActive || isSubmitting}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-purple-600 text-white cursor-default'
                            : 'bg-zinc-100 dark:bg-[#1a1f26] text-zinc-700 dark:text-zinc-300 hover:bg-purple-600 hover:text-white'
                        }`}
                      >
                        {isActive ? 'Aktif' : 'Beralih'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-[#232830] text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-[#1c222a] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

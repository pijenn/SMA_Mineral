'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { parseLogisticExcel, EditableImportedItem } from '@/lib/excelParser';
import { ItemCategoryType, PriorityLevel } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plus,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
  DollarSign,
  Package,
  RotateCcw,
  Check,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExcelImportModal({ isOpen, onClose }: ExcelImportModalProps) {
  const { departments, activePeriod, batchUploadProcurementItems } = useApp();

  const [step, setStep] = useState<'upload' | 'edit' | 'success'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [items, setItems] = useState<EditableImportedItem[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResultCount, setUploadResultCount] = useState<number>(0);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process ArrayBuffer
  const processExcelBuffer = async (buffer: ArrayBuffer, name: string) => {
    setIsProcessingFile(true);
    setUploadError(null);
    try {
      const parsed = parseLogisticExcel(buffer, departments);
      if (parsed.length === 0) {
        setUploadError('Tidak ada baris data barang yang berhasil dibaca dari file Excel.');
        setIsProcessingFile(false);
        return;
      }
      setItems(parsed);
      setFileName(name);
      setStep('edit');
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Error parsing excel:', err);
      setUploadError(err?.message || 'Gagal memproses file Excel.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    await processExcelBuffer(buffer, file.name);
  };

  const handleLoadSampleFile = async () => {
    setIsProcessingFile(true);
    setUploadError(null);
    try {
      let res = await fetch('/DATABASE%20LOGISTIK%202026%20(1).xlsx');
      let loadedFileName = 'DATABASE LOGISTIK 2026 (1).xlsx';
      if (!res.ok) {
        res = await fetch('/Data%20Logistik%20SMA.xlsx');
        loadedFileName = 'Data Logistik SMA.xlsx';
      }
      if (!res.ok) throw new Error('File contoh tidak ditemukan.');
      const buffer = await res.arrayBuffer();
      await processExcelBuffer(buffer, loadedFileName);
    } catch (err: any) {
      console.error('Error loading sample file:', err);
      setUploadError('Gagal memuat file dokumen internal logistik.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Field edit handlers
  const handleUpdateItem = (
    tempId: string,
    field: keyof EditableImportedItem,
    value: any
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;

        const updated = { ...item, [field]: value };

        // If department changed, update department_code and department_name
        if (field === 'department_id') {
          const matchedDept = departments.find((d) => d.id === value);
          if (matchedDept) {
            updated.department_code = matchedDept.code;
            updated.department_name = matchedDept.name;
          }
        }

        // If switching from additional to routine and routine_code is empty, suggest one
        if (field === 'item_type' && value === 'routine' && !updated.routine_code) {
          updated.routine_code = `R-${updated.department_code}-${String(Math.floor(Math.random() * 900) + 100)}`;
        }

        return updated;
      })
    );
  };

  const handleDeleteItem = (tempId: string) => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  const handleAddNewRow = () => {
    const defaultDept = departments[0];
    const newRow: EditableImportedItem = {
      tempId: `manual-${Date.now()}`,
      originalNo: items.length + 1,
      department_id: defaultDept?.id || '',
      department_code: defaultDept?.code || 'DEPT',
      department_name: defaultDept?.name || 'General',
      raw_dept_section: defaultDept?.name || 'General',
      item_name: '',
      item_type: 'routine',
      routine_code: `R-${defaultDept?.code || 'GEN'}-${String(items.length + 1).padStart(3, '0')}`,
      specification: '',
      quantity: 1,
      unit: 'pcs',
      priority_level: 1,
      final_unit_price: 0,
      reference_link: '',
    };
    setItems((prev) => [newRow, ...prev]);
  };

  const handleAutoGenerateRoutineCodes = () => {
    const deptCounters: Record<string, number> = {};
    setItems((prev) =>
      prev.map((item) => {
        if (item.item_type === 'routine' && !item.routine_code.trim()) {
          const dept = item.department_code || 'GEN';
          deptCounters[dept] = (deptCounters[dept] || 0) + 1;
          const seq = String(deptCounters[dept]).padStart(3, '0');
          return {
            ...item,
            routine_code: `R-${dept}-${seq}`,
          };
        }
        return item;
      })
    );
  };

  // Validation
  const invalidRoutineItems = useMemo(() => {
    return items.filter(
      (item) => item.item_type === 'routine' && !item.routine_code.trim()
    );
  }, [items]);

  const isValid = items.length > 0 && invalidRoutineItems.length === 0;

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.specification.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.routine_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.department_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.reference_link && item.reference_link.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDept =
        selectedDeptFilter === 'ALL' || item.department_id === selectedDeptFilter;

      const matchesType =
        selectedTypeFilter === 'ALL' || item.item_type === selectedTypeFilter;

      return matchesSearch && matchesDept && matchesType;
    });
  }, [items, searchQuery, selectedDeptFilter, selectedTypeFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  // Metrics
  const totalEstimatedAmount = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.quantity * curr.final_unit_price, 0);
  }, [items]);

  const routineCount = items.filter((i) => i.item_type === 'routine').length;
  const additionalCount = items.filter((i) => i.item_type === 'additional').length;

  // Unique departments present in items
  const activeDeptCounts = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((i) => {
      map[i.department_id] = (map[i.department_id] || 0) + 1;
    });
    return map;
  }, [items]);

  // Submit to Database
  const handleConfirmUpload = async () => {
    if (!isValid) return;
    setIsUploading(true);
    setUploadError(null);

    const result = await batchUploadProcurementItems(items);
    setIsUploading(false);

    if (result.success) {
      setUploadResultCount(result.count);
      setStep('success');
    } else {
      setUploadError(result.error || 'Terjadi kesalahan saat mengunggah data ke database.');
    }
  };

  const handleReset = () => {
    setItems([]);
    setFileName('');
    setStep('upload');
    setUploadError(null);
    setCurrentPage(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-6xl max-h-[94vh] bg-white dark:bg-[#12151a] rounded-2xl shadow-2xl flex flex-col border border-zinc-200 dark:border-[#232830] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between bg-zinc-50 dark:bg-[#0e1115]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-zinc-900 dark:text-white">
                  Impor Data Logistik Excel
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {step === 'upload' ? 'Tahap 1: Upload' : step === 'edit' ? 'Tahap 2: Review & Edit' : 'Selesai'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Konversi otomatis XLSX ke input terstruktur. Admin dapat mereview dan mengubah data sebelum konfirmasi.
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

        {/* STEP 1: UPLOAD SCREEN */}
        {step === 'upload' && (
          <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6">
            {uploadError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Drag & Drop Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-300 dark:border-[#2a313d] hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-zinc-50/50 dark:bg-[#101317]/50 hover:bg-emerald-500/5 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {isProcessingFile ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <UploadCloud className="w-8 h-8" />
                )}
              </div>
              <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
                Pilih atau Tarik File Excel (.xlsx) ke sini
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mb-4">
                Sistem secara otomatis membaca pembatas departemen (Explorasi, QAQC, Engineering, Maintenance, Produksi, Ganis, HRGA, HSE) dan memetakan status belanja.
              </p>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-zinc-200 dark:bg-[#1e232b] text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Format: .xlsx / .xls
                </span>
              </div>
            </div>

            {/* Preset / Sample File Helper */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Gunakan File Database Logistik 2026
                  </h5>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Buka dan proses langsung file berkas <strong>DATABASE LOGISTIK 2026 (1).xlsx</strong> (597+ item dengan vendor & kode barang).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLoadSampleFile}
                disabled={isProcessingFile}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isProcessingFile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Membaca Data...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Buka DATABASE LOGISTIK 2026 (1).xlsx</span>
                  </>
                )}
              </button>
            </div>

            {/* Legend / Mapping Guide */}
            <div className="p-4 rounded-xl bg-zinc-100/70 dark:bg-[#101317] border border-zinc-200 dark:border-[#232830] text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
              <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-500" />
                <span>Aturan Pemetaan Departemen & Kolom:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#20252e]">
                  <span className="font-semibold text-zinc-900 dark:text-white">EKSPLORASI</span> &rarr; Geology
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#20252e]">
                  <span className="font-semibold text-zinc-900 dark:text-white">SURVEY</span> &rarr; Engineering
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#20252e]">
                  <span className="font-semibold text-zinc-900 dark:text-white">CIVIL</span> &rarr; Civil & Infra
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#20252e]">
                  <span className="font-semibold text-zinc-900 dark:text-white">QAQC</span> &rarr; Processing
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#20252e]">
                  <span className="font-semibold text-zinc-900 dark:text-white">ENGINEERING</span> &rarr; Engineering
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#20252e]">
                  <span className="font-semibold text-zinc-900 dark:text-white">MAINTENANCE</span> &rarr; Maintenance
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#20252e]">
                  <span className="font-semibold text-zinc-900 dark:text-white">PRODUKSI</span> &rarr; Mining & Operasional
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#20252e]">
                  <span className="font-semibold text-zinc-900 dark:text-white">GANIS</span> &rarr; Forestry
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#20252e]">
                  <span className="font-semibold text-zinc-900 dark:text-white">HCGA / HRGA</span> &rarr; HRGA
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#20252e]">
                  <span className="font-semibold text-zinc-900 dark:text-white">HSE / OBAT</span> &rarr; HSE
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 pt-1">
                &bull; Kolom <strong>DAFTAR VENDOR</strong> otomatis disimpan ke field <strong>reference_link</strong>.<br />
                &bull; Kolom <strong>KODE BARANG</strong> (misal: EXP-001) langsung dipetakan menjadi <strong>Kode Rutin</strong>.<br />
                &bull; Status Belanja kosong dengan Kode Barang otomatis berstatus <strong>Routine (Bulanan)</strong>.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: EDITABLE TABLE VIEW */}
        {step === 'edit' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Top KPI Metrics Bar */}
            <div className="px-4 py-3 sm:px-6 bg-zinc-50/80 dark:bg-[#0e1115]/80 border-b border-zinc-200 dark:border-[#232830] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-500 dark:text-zinc-400">File:</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[160px] sm:max-w-xs">{fileName}</span>
                </div>
                <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700 hidden sm:block"></div>
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-bold text-zinc-900 dark:text-white">{items.length}</span>
                  <span className="text-zinc-500">Total Item</span>
                </div>
                <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700 hidden sm:block"></div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 font-bold">
                    {routineCount} Rutin
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-bold">
                    {additionalCount} Tambahan
                  </span>
                </div>
                <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700 hidden sm:block"></div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-zinc-500">Total Nilai:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalEstimatedAmount)}
                  </span>
                </div>
              </div>

              {/* Status Pill */}
              <div>
                {invalidRoutineItems.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {invalidRoutineItems.length} item rutin butuh Kode Rutin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5" />
                    Semua Input Valid & Siap Di-upload
                  </span>
                )}
              </div>
            </div>

            {/* Toolbar Filter Controls */}
            <div className="p-3 sm:px-6 bg-white dark:bg-[#12151a] border-b border-zinc-200 dark:border-[#232830] flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Cari nama barang / kode..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Department Filter */}
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => {
                    setSelectedDeptFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Semua Departemen ({items.length})</option>
                  {departments.map((d) => {
                    const cnt = activeDeptCounts[d.id] || 0;
                    if (cnt === 0) return null;
                    return (
                      <option key={d.id} value={d.id}>
                        {d.name} ({cnt})
                      </option>
                    );
                  })}
                </select>

                {/* Type Filter */}
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => {
                    setSelectedTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Semua Tipe</option>
                  <option value="routine">Routine (Bulanan)</option>
                  <option value="additional">Additional (Kondisional)</option>
                </select>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2">
                {invalidRoutineItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoGenerateRoutineCodes}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Buat kode unik R-[DEPT]-xxx otomatis untuk barang rutin yang belum berkode"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Lengkapi Kode Rutin Otomatis</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleAddNewRow}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1a1f26] dark:hover:bg-[#222933] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-[#2d3440] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#1a1f26] flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Upload file lain"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ganti File</span>
                </button>
              </div>
            </div>

            {/* Validation Alert Banner if missing routine codes */}
            {invalidRoutineItems.length > 0 && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/40 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    Item belanja bertipe <strong>Routine</strong> wajib memiliki <strong>Kode Rutin</strong>. Kolom dengan garis kuning/merah perlu diisi sebelum dapat di-upload ke database.
                  </span>
                </div>
                <button
                  onClick={handleAutoGenerateRoutineCodes}
                  className="text-amber-700 dark:text-amber-300 font-bold underline hover:no-underline ml-2 cursor-pointer"
                >
                  Isi Otomatis Sekarang
                </button>
              </div>
            )}

            {/* The Main High-Density Editable Table */}
            <div className="flex-1 overflow-auto bg-zinc-50/30 dark:bg-[#0c0e12]/30">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-zinc-100 dark:bg-[#161a21] border-b border-zinc-200 dark:border-[#232830] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3 w-36">Departemen</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Nama Barang</th>
                    <th className="py-2.5 px-3 w-36">Daftar Vendor</th>
                    <th className="py-2.5 px-3 w-28">Status Belanja</th>
                    <th className="py-2.5 px-3 w-32">
                      Kode Rutin <span className="text-amber-500">*</span>
                    </th>
                    <th className="py-2.5 px-3 min-w-[130px]">Spesifikasi</th>
                    <th className="py-2.5 px-3 w-16">Jumlah</th>
                    <th className="py-2.5 px-3 w-20">Satuan</th>
                    <th className="py-2.5 px-3 w-24">Prioritas</th>
                    <th className="py-2.5 px-3 w-28 text-right">Harga Satuan (Rp)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Total (Rp)</th>
                    <th className="py-2.5 px-3 w-10 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-[#1d222b]">
                  {paginatedItems.map((item, idx) => {
                    const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                    const isRoutine = item.item_type === 'routine';
                    const hasMissingRoutineCode = isRoutine && !item.routine_code.trim();

                    return (
                      <tr
                        key={item.tempId}
                        className={`transition-colors hover:bg-zinc-50 dark:hover:bg-[#141820] ${
                          hasMissingRoutineCode
                            ? 'bg-amber-500/5 dark:bg-amber-500/5'
                            : ''
                        }`}
                      >
                        {/* No */}
                        <td className="py-2 px-3 text-center text-zinc-400 font-mono text-[11px]">
                          {globalIdx}
                        </td>

                        {/* Department Select */}
                        <td className="py-2 px-2">
                          <select
                            value={item.department_id}
                            onChange={(e) =>
                              handleUpdateItem(item.tempId, 'department_id', e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded-lg text-xs bg-white dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 truncate"
                          >
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Item Name */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={(e) =>
                              handleUpdateItem(item.tempId, 'item_name', e.target.value)
                            }
                            placeholder="Nama barang..."
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white font-semibold focus:outline-none focus:border-emerald-500"
                            required
                          />
                        </td>

                        {/* Vendor (reference_link) */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.reference_link || ''}
                            onChange={(e) =>
                              handleUpdateItem(item.tempId, 'reference_link', e.target.value)
                            }
                            placeholder="Vendor / Toko..."
                            className="w-full px-2 py-1.5 rounded-lg text-xs bg-white dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 truncate"
                          />
                        </td>

                        {/* Item Type (Routine vs Additional) */}
                        <td className="py-2 px-2">
                          <select
                            value={item.item_type}
                            onChange={(e) =>
                              handleUpdateItem(
                                item.tempId,
                                'item_type',
                                e.target.value as ItemCategoryType
                              )
                            }
                            className={`w-full px-2 py-1.5 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer ${
                              isRoutine
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            }`}
                          >
                            <option value="routine">Routine (Bulanan)</option>
                            <option value="additional">Additional (Kondisional)</option>
                          </select>
                        </td>

                        {/* Routine Code Input (Mandatory if Routine!) */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.routine_code}
                            disabled={!isRoutine}
                            onChange={(e) =>
                              handleUpdateItem(
                                item.tempId,
                                'routine_code',
                                e.target.value.toUpperCase()
                              )
                            }
                            placeholder={isRoutine ? 'Contoh: R-GEO-001' : '(Tidak wajib)'}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all focus:outline-none ${
                              !isRoutine
                                ? 'bg-zinc-100 dark:bg-[#101317] border border-zinc-200 dark:border-[#1d222b] text-zinc-400 cursor-not-allowed'
                                : hasMissingRoutineCode
                                ? 'bg-amber-500/10 dark:bg-amber-950/30 border-2 border-amber-500 text-amber-700 dark:text-amber-300 placeholder-amber-400 focus:border-amber-600'
                                : 'bg-white dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white focus:border-emerald-500'
                            }`}
                          />
                        </td>

                        {/* Specification */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.specification}
                            onChange={(e) =>
                              handleUpdateItem(item.tempId, 'specification', e.target.value)
                            }
                            placeholder="Spesifikasi / ukuran..."
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500"
                          />
                        </td>

                        {/* Quantity */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItem(
                                item.tempId,
                                'quantity',
                                Math.max(1, Number(e.target.value) || 1)
                              )
                            }
                            className="w-full px-2 py-1.5 rounded-lg text-xs text-center font-mono font-bold bg-white dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                          />
                        </td>

                        {/* Unit */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) =>
                              handleUpdateItem(item.tempId, 'unit', e.target.value)
                            }
                            placeholder="Pcs"
                            className="w-full px-2 py-1.5 rounded-lg text-xs bg-white dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                          />
                        </td>

                        {/* Priority Level */}
                        <td className="py-2 px-2">
                          <select
                            value={item.priority_level}
                            onChange={(e) =>
                              handleUpdateItem(
                                item.tempId,
                                'priority_level',
                                Number(e.target.value) as PriorityLevel
                              )
                            }
                            className="w-full px-2 py-1.5 rounded-lg text-xs bg-white dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white font-semibold focus:outline-none focus:border-emerald-500"
                          >
                            <option value={1}>1: Rutin (C1)</option>
                            <option value={2}>2: Sedang (C2)</option>
                            <option value={3}>3: Mendesak (C3)</option>
                          </select>
                        </td>

                        {/* Final Unit Price */}
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={item.final_unit_price}
                            onChange={(e) =>
                              handleUpdateItem(
                                item.tempId,
                                'final_unit_price',
                                Math.max(0, Number(e.target.value) || 0)
                              )
                            }
                            className="w-full px-2 py-1.5 rounded-lg text-xs text-right font-mono font-bold bg-white dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                          />
                        </td>

                        {/* Calculated Subtotal */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-zinc-700 dark:text-zinc-300">
                          {formatCurrency(item.quantity * item.final_unit_price)}
                        </td>

                        {/* Delete Button */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.tempId)}
                            className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Hapus baris ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedItems.length === 0 && (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-zinc-400">
                        Tidak ada barang yang cocok dengan pencarian / filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-3 sm:px-6 bg-zinc-50 dark:bg-[#0e1115] border-t border-zinc-200 dark:border-[#232830] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-zinc-500 dark:text-zinc-400">
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredItems.length)} dari{' '}
                {filteredItems.length} item {items.length !== filteredItems.length && `(Difilter dari ${items.length})`}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-[#232830] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#1a1f26] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 font-mono font-bold text-zinc-800 dark:text-zinc-200">
                    Halaman {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-[#232830] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#1a1f26] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Footer Actions */}
            <div className="p-4 sm:px-6 border-t border-zinc-200 dark:border-[#232830] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#12151a]">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Target Periode: <strong className="text-zinc-800 dark:text-zinc-200">{activePeriod.period_name}</strong>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-[#232830] text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-[#1c222a] transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleConfirmUpload}
                  disabled={!isValid || isUploading}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengunggah ke Database...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Konfirmasi & Upload ke Database ({items.length} Item)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION VIEW */}
        {step === 'success' && (
          <div className="p-8 sm:p-12 flex-1 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md">
              <h4 className="text-xl font-extrabold text-zinc-900 dark:text-white">
                Impor Data Logistik Berhasil!
              </h4>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Sebanyak <strong>{uploadResultCount} barang logistik</strong> telah berhasil disimpan ke database dan ditautkan ke pengajuan departemen untuk{' '}
                <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{activePeriod.period_name}</span>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
              <div>&bull; Status data: <strong>Tervalidasi (Validated)</strong> oleh Admin Logistik</div>
              <div>&bull; Barang rutin baru didaftarkan ke katalog master departemen</div>
              <div>&bull; Siap dilanjutkan ke approval Project Manager & Purchase Order</div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <span>Selesai & Buka Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

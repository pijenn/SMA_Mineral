'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { ItemCategoryType, PriorityLevel, RoutineItem } from '@/lib/types';
import { formatCurrency, isAllDepartments } from '@/lib/utils';
import { X, Plus, Trash2, Tag, AlertTriangle, Sparkles, Search, Calendar, AlertCircle } from 'lucide-react';

interface RequestItemFormRow {
  id: string;
  item_type: ItemCategoryType;
  routine_item_id?: string;
  custom_item_name?: string;
  specification: string;
  quantity: number;
  unit: string;
  priority_level: PriorityLevel;
  estimated_unit_price: number;
}

export function RequestModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { currentUser, selectedDepartmentId, departments, routineItems, activePeriod, submitRequestItems } = useApp();
  const isAll = isAllDepartments(selectedDepartmentId);
  const activeDeptId = currentUser?.department_id || (!isAll ? selectedDepartmentId : (departments[0]?.id || ''));
  const currentDept = departments.find((d) => d.id === activeDeptId);
  const deptRoutineItems = useMemo(() => {
    return routineItems.filter((r) => r.department_id === activeDeptId && r.status === 'active');
  }, [routineItems, activeDeptId]);

  const [rows, setRows] = useState<RequestItemFormRow[]>(() => {
    if (deptRoutineItems.length > 0) {
      const first = deptRoutineItems[0];
      return [
        {
          id: `row-${Date.now()}`,
          item_type: 'routine',
          routine_item_id: first.id,
          specification: first.specification || '',
          quantity: 1,
          unit: first.unit || 'pcs',
          priority_level: 1,
          estimated_unit_price: first.estimated_unit_price || 0,
        },
      ];
    }
    return [
      {
        id: `row-${Date.now()}`,
        item_type: 'additional',
        routine_item_id: undefined,
        custom_item_name: '',
        specification: '',
        quantity: 1,
        unit: 'pcs',
        priority_level: 1,
        estimated_unit_price: 0,
      },
    ];
  });

  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync rows whenever modal opens or department routine items load
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSearchFilters({});
      setIsSubmitting(false);

      if (deptRoutineItems.length > 0) {
        const first = deptRoutineItems[0];
        setRows([
          {
            id: `row-${Date.now()}`,
            item_type: 'routine',
            routine_item_id: first.id,
            specification: first.specification || '',
            quantity: 1,
            unit: first.unit || 'pcs',
            priority_level: 1,
            estimated_unit_price: first.estimated_unit_price || 0,
          },
        ]);
      } else {
        setRows([
          {
            id: `row-${Date.now()}`,
            item_type: 'additional',
            routine_item_id: undefined,
            custom_item_name: '',
            specification: '',
            quantity: 1,
            unit: 'pcs',
            priority_level: 1,
            estimated_unit_price: 0,
          },
        ]);
      }
    }
  }, [isOpen, activeDeptId, deptRoutineItems.length]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    if (deptRoutineItems.length > 0) {
      const defaultRoutine = deptRoutineItems[0];
      setRows((prev) => [
        ...prev,
        {
          id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          item_type: 'routine',
          routine_item_id: defaultRoutine.id,
          specification: defaultRoutine.specification || '',
          quantity: 1,
          unit: defaultRoutine.unit || 'pcs',
          priority_level: 1,
          estimated_unit_price: defaultRoutine.estimated_unit_price || 0,
        },
      ]);
    } else {
      setRows((prev) => [
        ...prev,
        {
          id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          item_type: 'additional',
          routine_item_id: undefined,
          custom_item_name: '',
          specification: '',
          quantity: 1,
          unit: 'pcs',
          priority_level: 1,
          estimated_unit_price: 0,
        },
      ]);
    }
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRoutineChange = (rowId: string, routineId: string) => {
    const selected = deptRoutineItems.find((r) => r.id === routineId);
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          routine_item_id: routineId,
          specification: selected?.specification || '',
          unit: selected?.unit || 'pcs',
          estimated_unit_price: selected?.estimated_unit_price || 0,
        };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.length === 0) return;

    // Validate rows
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.item_type === 'routine') {
        if (!r.routine_item_id) {
          setErrorMsg(`Barang #${i + 1}: Silakan pilih barang rutin dari katalog.`);
          return;
        }
      } else {
        if (!r.custom_item_name || !r.custom_item_name.trim()) {
          setErrorMsg(`Barang #${i + 1}: Nama barang tambahan tidak boleh kosong.`);
          return;
        }
      }

      if (!r.unit || !r.unit.trim()) {
        setErrorMsg(`Barang #${i + 1}: Satuan barang tidak boleh kosong.`);
        return;
      }

      if (!r.quantity || Number(r.quantity) <= 0) {
        setErrorMsg(`Barang #${i + 1}: Jumlah (Qty) harus lebih dari 0.`);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = rows.map((r) => {
        const unitPrice = Number(r.estimated_unit_price || 0);
        const qty = Number(r.quantity);
        return {
          department_id: activeDeptId,
          item_type: r.item_type,
          routine_item_id: r.item_type === 'routine' ? r.routine_item_id : undefined,
          custom_item_name: r.item_type === 'additional' ? r.custom_item_name?.trim() : undefined,
          specification: r.specification?.trim() || '',
          quantity: qty,
          unit: r.unit.trim(),
          priority_level: r.priority_level,
          final_unit_price: unitPrice,
          estimated_total_price: qty * unitPrice,
        };
      });

      const res = await submitRequestItems(payload);
      if (res && !res.success) {
        setErrorMsg(res.error || 'Gagal mengirimkan pengajuan barang ke logistik.');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan saat menyimpan pengajuan.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#14171c] rounded-2xl shadow-2xl flex flex-col border border-zinc-200 dark:border-[#232830] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between bg-zinc-50 dark:bg-[#101317]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Form Pengajuan Barang Mingguan
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {currentDept?.name || currentDept?.code || 'Departemen'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {activePeriod.period_name}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Pilih Barang Rutin (kode tersimpan otomatis) atau Barang Tambahan non-rutin. Tentukan skala prioritas 1 s/d 3.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#1c222a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            {rows.map((row, idx) => {
              const rowFilter = (searchFilters[row.id] || '').trim().toLowerCase();
              const filteredRoutineItems = rowFilter
                ? deptRoutineItems.filter((ri) =>
                    ri.item_code.toLowerCase().includes(rowFilter) ||
                    ri.name.toLowerCase().includes(rowFilter) ||
                    (ri.specification && ri.specification.toLowerCase().includes(rowFilter))
                  )
                : deptRoutineItems;

              const selectedRoutine = deptRoutineItems.find((r) => r.id === row.routine_item_id);

              return (
                <div
                  key={row.id}
                  className="p-5 rounded-xl border border-zinc-200 dark:border-[#232830] bg-zinc-50/50 dark:bg-[#0e1115] space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#232830]">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      Barang #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Item Type Switcher */}
                      <div className="flex items-center gap-1 bg-zinc-200 dark:bg-[#181c22] p-1 rounded-xl text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            const first = deptRoutineItems[0];
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? {
                                      ...r,
                                      item_type: 'routine',
                                      routine_item_id: first?.id || '',
                                      specification: first?.specification || '',
                                      unit: first?.unit || 'pcs',
                                      custom_item_name: undefined,
                                      estimated_unit_price: first?.estimated_unit_price || 0,
                                    }
                                  : r
                              )
                            );
                          }}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            row.item_type === 'routine'
                              ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                          }`}
                        >
                          Barang Rutin ({deptRoutineItems.length})
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? {
                                      ...r,
                                      item_type: 'additional',
                                      routine_item_id: undefined,
                                      custom_item_name: '',
                                      unit: 'pcs',
                                      estimated_unit_price: 0,
                                    }
                                  : r
                              )
                            )
                          }
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            row.item_type === 'additional'
                              ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                          }`}
                        >
                          Barang Tambahan (Non-Rutin)
                        </button>
                      </div>

                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Form Fields */}
                  {row.item_type === 'routine' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        {/* Search & Select Routine Item */}
                        <div className="sm:col-span-6 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                              Cari & Pilih dari Master Katalog Rutin:
                            </label>
                            <span className="text-[10px] text-zinc-400">
                              {deptRoutineItems.length} Katalog Tersedia
                            </span>
                          </div>

                          {/* Search Input for Items - Always available */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                              type="text"
                              placeholder="Ketik untuk mencari nama atau kode barang..."
                              value={searchFilters[row.id] || ''}
                              onChange={(e) => {
                                const q = e.target.value;
                                setSearchFilters((prev) => ({ ...prev, [row.id]: q }));
                                if (q.trim()) {
                                  const matches = deptRoutineItems.filter((ri) =>
                                    ri.item_code.toLowerCase().includes(q.toLowerCase()) ||
                                    ri.name.toLowerCase().includes(q.toLowerCase()) ||
                                    (ri.specification && ri.specification.toLowerCase().includes(q.toLowerCase()))
                                  );
                                  if (matches.length > 0 && (!row.routine_item_id || !matches.some((m) => m.id === row.routine_item_id))) {
                                    handleRoutineChange(row.id, matches[0].id);
                                  }
                                }
                              }}
                              className="w-full pl-9 pr-8 py-2 bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#262c36] text-zinc-900 dark:text-white text-xs rounded-xl focus:outline-none focus:border-emerald-500"
                            />
                            {searchFilters[row.id] && (
                              <button
                                type="button"
                                onClick={() => setSearchFilters((prev) => ({ ...prev, [row.id]: '' }))}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer p-0.5"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Select Dropdown */}
                          <select
                            value={row.routine_item_id || ''}
                            onChange={(e) => handleRoutineChange(row.id, e.target.value)}
                            required={row.item_type === 'routine'}
                            className="w-full bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
                          >
                            {deptRoutineItems.length === 0 ? (
                              <option value="">(Belum ada katalog rutin untuk departemen ini)</option>
                            ) : filteredRoutineItems.length === 0 ? (
                              <option value="" disabled>(Tidak ada barang sesuai kata kunci &ldquo;{searchFilters[row.id]}&rdquo;)</option>
                            ) : (
                              <>
                                {!row.routine_item_id && (
                                  <option value="" disabled>-- Pilih Barang Rutin --</option>
                                )}
                                {filteredRoutineItems.map((ri) => (
                                  <option key={ri.id} value={ri.id}>
                                    [{ri.item_code}] {ri.name} ({formatCurrency(ri.estimated_unit_price)} / {ri.unit})
                                  </option>
                                ))}
                              </>
                            )}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                            Jumlah (Qty):
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, quantity: Math.max(1, Number(e.target.value)) } : r))
                              )
                            }
                            className="w-full bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                            required
                          />
                        </div>

                        {/* Unit */}
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                            Satuan:
                          </label>
                          <input
                            type="text"
                            placeholder="pcs, unit, liter, roll"
                            value={row.unit}
                            onChange={(e) =>
                              setRows((prev) => (prev.map((r) => (r.id === row.id ? { ...r, unit: e.target.value } : r))))
                            }
                            className="w-full bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                            required
                          />
                        </div>
                      </div>

                      {/* Pricing preview info strip for routine item */}
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex flex-wrap items-center justify-between gap-2">
                        <span>
                          Harga Acuan Katalog: <strong className="font-mono">{formatCurrency(row.estimated_unit_price)}</strong> per {row.unit}
                        </span>
                        <span>
                          Subtotal Estimasi: <strong className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency((row.quantity || 1) * (row.estimated_unit_price || 0))}</strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Additional (Non-Rutin) Item Form with Price Input */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        {/* Custom Item Name */}
                        <div className="sm:col-span-5">
                          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                            Nama Barang Tambahan (Non-Rutin):
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Palu Geologi Estwing E3-22P / Pompa Air"
                            value={row.custom_item_name || ''}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, custom_item_name: e.target.value } : r))
                              )
                            }
                            className="w-full bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                            required
                          />
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                            Jumlah (Qty):
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, quantity: Math.max(1, Number(e.target.value)) } : r))
                              )
                            }
                            className="w-full bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                            required
                          />
                        </div>

                        {/* Unit */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                            Satuan:
                          </label>
                          <input
                            type="text"
                            placeholder="pcs, set, roll"
                            value={row.unit}
                            onChange={(e) =>
                              setRows((prev) => (prev.map((r) => (r.id === row.id ? { ...r, unit: e.target.value } : r))))
                            }
                            className="w-full bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                            required
                          />
                        </div>

                        {/* Estimated Price Input for Non-Rutin */}
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                            Estimasi Harga Satuan (Rp):
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="1000"
                            placeholder="Contoh: 250000"
                            value={row.estimated_unit_price || ''}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? { ...r, estimated_unit_price: Math.max(0, Number(e.target.value)) }
                                    : r
                                )
                              )
                            }
                            className="w-full bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white text-xs font-mono font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Pricing subtotal strip for non-rutin item */}
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex flex-wrap items-center justify-between gap-2">
                        <span>
                          Estimasi Harga Satuan: <strong className="font-mono">{formatCurrency(row.estimated_unit_price || 0)}</strong> per {row.unit}
                        </span>
                        <span>
                          Total Estimasi Subtotal: <strong className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatCurrency((row.quantity || 1) * (row.estimated_unit_price || 0))}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Priority & Specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Tingkat Prioritas Kebutuhan:
                      </label>
                      <select
                        value={row.priority_level}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, priority_level: Number(e.target.value) as PriorityLevel } : r
                            )
                          )
                        }
                        className="w-full bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                      >
                        <option value={1}>Level 1 - Rutin / Terjadwal</option>
                        <option value={2}>Level 2 - Kebutuhan Operasional Cepat</option>
                        <option value={3}>Level 3 - Kritis / Stop Produksi / K3</option>
                      </select>
                    </div>

                    <div className="sm:col-span-8">
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Spesifikasi Detail / Part Number:
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Seri 5000psi, ukuran drat 3/4 inch, brand Parker"
                        value={row.specification}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, specification: e.target.value } : r))
                          )
                        }
                        className="w-full bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl border border-dashed border-zinc-300 dark:border-[#2a323e] hover:border-emerald-500 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Baris Pengajuan Barang</span>
          </button>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-[#232830]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-white disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan ke Logistik...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Kirimkan ke Logistik ({rows.length} Barang)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

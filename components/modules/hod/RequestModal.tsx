'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ItemCategoryType, PriorityLevel, RoutineItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { X, Plus, Trash2, Tag, AlertTriangle, Sparkles } from 'lucide-react';

interface RequestItemFormRow {
  id: string;
  item_type: ItemCategoryType;
  routine_item_id?: string;
  custom_item_name?: string;
  specification: string;
  quantity: number;
  unit: string;
  priority_level: PriorityLevel;
}

export function RequestModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { currentUser, selectedDepartmentId, departments, routineItems, submitRequestItems } = useApp();
  const activeDeptId = currentUser?.department_id || selectedDepartmentId;
  const currentDept = departments.find((d) => d.id === activeDeptId);
  const deptRoutineItems = routineItems.filter((r) => r.department_id === activeDeptId && r.status === 'active');

  const [rows, setRows] = useState<RequestItemFormRow[]>([
    {
      id: 'row-1',
      item_type: 'routine',
      routine_item_id: deptRoutineItems[0]?.id || '',
      specification: deptRoutineItems[0]?.specification || '',
      quantity: 1,
      unit: deptRoutineItems[0]?.unit || 'pcs',
      priority_level: 1,
    },
  ]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    const defaultRoutine = deptRoutineItems[0];
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        item_type: 'routine',
        routine_item_id: defaultRoutine?.id || '',
        specification: defaultRoutine?.specification || '',
        quantity: 1,
        unit: defaultRoutine?.unit || 'pcs',
        priority_level: 1,
      },
    ]);
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
        };
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.length === 0) return;

    submitRequestItems(
      rows.map((r) => ({
        item_type: r.item_type,
        routine_item_id: r.item_type === 'routine' ? r.routine_item_id : undefined,
        custom_item_name: r.item_type === 'additional' ? r.custom_item_name : undefined,
        specification: r.specification,
        quantity: Number(r.quantity),
        unit: r.unit,
        priority_level: r.priority_level,
      }))
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#14171c] rounded-2xl shadow-2xl flex flex-col border border-zinc-200 dark:border-[#232830] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between bg-zinc-50 dark:bg-[#101317]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Form Pengajuan Barang Mingguan
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {currentDept?.name}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Pilih Barang Rutin (kode tersimpan otomatis) atau Barang Tambahan non-rutin. Tentukan skala prioritas 1 s/d 3.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#1c222a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div className="space-y-4">
            {rows.map((row, idx) => (
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
                        onClick={() =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.id === row.id
                                ? {
                                    ...r,
                                    item_type: 'routine',
                                    routine_item_id: deptRoutineItems[0]?.id || '',
                                    unit: deptRoutineItems[0]?.unit || 'pcs',
                                  }
                                : r
                            )
                          )
                        }
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          row.item_type === 'routine'
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        Barang Rutin
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, item_type: 'additional', custom_item_name: '' } : r
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
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {row.item_type === 'routine' ? (
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Pilih dari Master Katalog Rutin:
                      </label>
                      <select
                        value={row.routine_item_id}
                        onChange={(e) => handleRoutineChange(row.id, e.target.value)}
                        className="w-full bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                      >
                        {deptRoutineItems.length === 0 ? (
                          <option value="">(Belum ada katalog rutin untuk departemen ini)</option>
                        ) : (
                          deptRoutineItems.map((ri) => (
                            <option key={ri.id} value={ri.id}>
                              [{ri.item_code}] {ri.name} (~{formatCurrency(ri.estimated_unit_price)})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  ) : (
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Nama Barang Tambahan:
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Pompa Air Celup 3-Inch Tsurumi"
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
                  )}

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
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            className="w-full py-3 rounded-xl border border-dashed border-zinc-300 dark:border-[#2a323e] hover:border-emerald-500 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Baris Pengajuan Barang</span>
          </button>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-[#232830]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Kirimkan ke Logistik ({rows.length} Barang)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

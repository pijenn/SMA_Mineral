'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Tag, PlusCircle } from 'lucide-react';

export function RoutineCatalogModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { currentUser, selectedDepartmentId, departments, addRoutineItem } = useApp();
  const activeDeptId = currentUser?.department_id || selectedDepartmentId;
  const currentDept = departments.find((d) => d.id === activeDeptId);

  const [itemCode, setItemCode] = useState(`R-${currentDept?.code || 'GEN'}-${String(Math.floor(Math.random() * 900) + 100)}`);
  const [name, setName] = useState('');
  const [specification, setSpecification] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [estimatedPrice, setEstimatedPrice] = useState(100000);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !itemCode.trim()) return;

    addRoutineItem({
      department_id: activeDeptId,
      item_code: itemCode.toUpperCase(),
      name,
      specification,
      unit,
      estimated_unit_price: Number(estimatedPrice),
      status: 'active',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-[#14171c] rounded-2xl shadow-2xl border border-zinc-200 dark:border-[#232830] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between bg-zinc-50 dark:bg-[#101317]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Pendaftaran Barang Katalog Rutin
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Departemen: {currentDept?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#1c222a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Kode Unik Barang:
            </label>
            <input
              type="text"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              placeholder="Contoh: R-HSE-005"
              className="w-full bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white font-mono text-xs rounded-xl px-3 py-2.5 uppercase font-bold focus:outline-none focus:border-emerald-500"
              required
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              Kode unik mempermudah pelacakan riwayat belanja berulang antar-periode.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Nama Barang Rutin:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Helm Safety Putih ANSI Z89.1"
              className="w-full bg-white dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Satuan Standar:
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs, drum, box, pair"
                className="w-full bg-white dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Estimasi Harga Satuan (Rp):
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={estimatedPrice}
                onChange={(e) => setEstimatedPrice(Number(e.target.value))}
                className="w-full bg-white dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white text-xs font-bold font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Spesifikasi Teknis Standar:
            </label>
            <textarea
              rows={2}
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              placeholder="Material, standar sertifikasi K3, ukuran, dll..."
              className="w-full bg-white dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-zinc-900 dark:text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-zinc-200 dark:border-[#232830] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Simpan ke Master Katalog</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

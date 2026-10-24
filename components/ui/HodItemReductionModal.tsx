'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  formatCurrency,
  parseHodReductionFromNotes,
  cleanSystemNotes,
} from '@/lib/utils';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Building2,
  Package,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function HodItemReductionModal() {
  const {
    currentUser,
    activeRole,
    selectedDepartmentId,
    requestItems,
    respondToItemReduction,
  } = useApp();

  const [processingItemId, setProcessingItemId] = useState<string | null>(null);
  const [resolvedInSession, setResolvedInSession] = useState<string[]>([]);

  const isHodRole = activeRole === 'hod';

  const pendingReductions = useMemo(() => {
    if (!currentUser || !isHodRole) return [];

    const allPending = requestItems
      .map((item) => {
        const meta = parseHodReductionFromNotes(item.id, item.pm_item_approval_notes);
        if (!meta) return null;
        if (resolvedInSession.includes(`${item.id}-${meta.timestamp}`)) return null;
        return { item, meta };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    if (allPending.length === 0) return [];

    // Filter to the HoD's department if assigned, or selectedDepartmentId if viewing a specific dept
    const targetDeptId =
      currentUser.department_id ||
      (selectedDepartmentId !== 'all' ? selectedDepartmentId : undefined);

    if (targetDeptId) {
      const deptSpecific = allPending.filter(
        ({ item }) => item.department_id === targetDeptId
      );
      if (deptSpecific.length > 0) return deptSpecific;
    }

    // If current HoD account is a general HoD or testing across departments, show all pending reductions
    return allPending;
  }, [
    currentUser,
    isHodRole,
    selectedDepartmentId,
    requestItems,
    resolvedInSession,
  ]);

  if (!currentUser || !isHodRole || pendingReductions.length === 0) {
    return null;
  }

  const handleDecision = async (
    itemId: string,
    timestamp: number,
    decision: 'postpone_next_week' | 'reduce_without_delay'
  ) => {
    setProcessingItemId(itemId);
    try {
      const res = await respondToItemReduction(itemId, decision);
      if (res.success) {
        setResolvedInSession((prev) => [...prev, `${itemId}-${timestamp}`]);
      }
    } finally {
      setProcessingItemId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 px-6 py-4 text-white">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0 border border-white/25">
              <AlertCircle className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  Konfirmasi Head of Department (HoD)
                </span>
                <span className="text-[11px] font-semibold text-blue-100">
                  {pendingReductions.length} Barang Dikurangi oleh Finance
                </span>
              </div>
              <h3 className="text-base font-bold mt-1">
                Pemberitahuan Pengurangan Kuantitas Barang oleh Finance
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Admin Finance telah mengurangi jumlah barang yang diajukan karena penyesuaian anggaran atau alasan operasional lainnya. Silakan pilih tindak lanjut untuk sisa barang yang dikurangi.
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-3 bg-blue-50/80 border-b border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            Anda dapat memilih <span className="font-bold">Tunda ke Minggu Depan</span> (sistem akan otomatis membuat pengajuan baru sebesar jumlah yang dikurangi untuk periode minggu depan) atau <span className="font-bold">Kurangi Saja Tanpa Ditunda</span>.
          </div>
        </div>

        {/* Items List */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/60">
          {pendingReductions.map(({ item, meta }) => {
            const itemName =
              item.routine_item?.name || item.custom_item_name || 'Barang Pengadaan';
            const unitPrice =
              item.final_unit_price || item.routine_item?.estimated_unit_price || 0;
            const isProcessing = processingItemId === item.id;
            const cleanNotes = cleanSystemNotes(item.pm_item_approval_notes);

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Item Header */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-sm text-slate-900">
                      {itemName}
                    </span>
                    {item.specification && (
                      <span className="text-xs text-slate-500">
                        ({item.specification})
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    <Building2 className="w-3 h-3" />
                    {item.department_name || item.department_code || 'Departemen'}
                  </span>
                </div>

                {/* Quantity Breakdown */}
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Pengajuan Awal HoD
                      </p>
                      <p className="text-base font-bold text-slate-800 mt-0.5">
                        {meta.originalQuantity} {item.unit}
                      </p>
                      {unitPrice > 0 && (
                        <p className="text-[11px] text-slate-500">
                          Est: {formatCurrency(meta.originalQuantity * unitPrice)}
                        </p>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                        Disetujui Minggu Ini
                      </p>
                      <p className="text-base font-bold text-emerald-800 mt-0.5">
                        {meta.newQuantity} {item.unit}
                      </p>
                      {unitPrice > 0 && (
                        <p className="text-[11px] text-emerald-700">
                          Est: {formatCurrency(meta.newQuantity * unitPrice)}
                        </p>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                        Jumlah Dikurangi (Selisih)
                      </p>
                      <p className="text-base font-bold text-amber-900 mt-0.5">
                        -{meta.reducedQuantity} {item.unit}
                      </p>
                      {unitPrice > 0 && (
                        <p className="text-[11px] text-amber-700">
                          Nilai: {formatCurrency(meta.reducedQuantity * unitPrice)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reason from Finance */}
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg px-3.5 py-2.5 text-xs text-slate-700">
                    <span className="font-bold text-amber-900">
                      Alasan Pengurangan Finance:{' '}
                    </span>
                    <span>
                      {meta.reason || cleanNotes || 'Penyesuaian alokasi anggaran mingguan oleh Finance.'}
                    </span>
                  </div>

                  {/* Two Options for HoD */}
                  <div className="pt-1">
                    <p className="text-xs font-bold text-slate-700 mb-2.5">
                      Pilih Keputusan Tindak Lanjut HoD untuk Sisa {meta.reducedQuantity} {item.unit}:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() =>
                          handleDecision(item.id, meta.timestamp, 'postpone_next_week')
                        }
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-left shadow-sm transition-all disabled:opacity-50 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                          <CalendarClock className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold">
                              Tunda ke Minggu Depan
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                          <p className="text-[11px] text-blue-100 mt-0.5 leading-snug">
                            Otomatis ajukan sisa{' '}
                            <span className="font-bold text-white">
                              {meta.reducedQuantity} {item.unit}
                            </span>{' '}
                            untuk pengadaan minggu depan.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() =>
                          handleDecision(item.id, meta.timestamp, 'reduce_without_delay')
                        }
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-slate-300 text-left transition-all disabled:opacity-50 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4 text-slate-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900">
                              Kurangi Saja Tanpa Ditunda
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Terima jumlah{' '}
                            <span className="font-bold text-slate-700">
                              {meta.newQuantity} {item.unit}
                            </span>{' '}
                            minggu ini tanpa membuat pengajuan tunda.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

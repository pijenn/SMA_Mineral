'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  formatCurrency,
  parsePriceAlertFromNotes,
  cleanSystemNotes,
  getLifecycleStatusMeta,
} from '@/lib/utils';
import {
  Bell,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Building2,
  Package,
  X,
} from 'lucide-react';

export default function PriceChangeAlertModal() {
  const {
    currentUser,
    activeRole,
    requestItems,
    acknowledgePriceChangeAlerts,
  } = useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dismissedInSession, setDismissedInSession] = useState<string[]>([]);

  const isTargetRole =
    activeRole === 'project_manager' || activeRole === 'admin_finance';

  const pendingAlerts = useMemo(() => {
    if (!currentUser || !isTargetRole) return [];

    return requestItems
      .map((item) => {
        const meta = parsePriceAlertFromNotes(item.id, item.logistics_notes);
        if (!meta) return null;
        const isUnacknowledged =
          activeRole === 'project_manager' ? !meta.pmAck : !meta.finAck;
        if (!isUnacknowledged) return null;
        if (dismissedInSession.includes(`${activeRole}-${item.id}-${meta.timestamp}`)) {
          return null;
        }
        return {
          item,
          meta,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [currentUser, isTargetRole, activeRole, requestItems, dismissedInSession]);

  if (!currentUser || !isTargetRole || pendingAlerts.length === 0) {
    return null;
  }

  const roleLabel =
    activeRole === 'project_manager' ? 'Project Manager (PM)' : 'Admin Finance';

  const handleAcknowledgeAll = async () => {
    setIsSubmitting(true);
    try {
      const ids = pendingAlerts.map((a) => a.item.id);
      await acknowledgePriceChangeAlerts(
        activeRole as 'project_manager' | 'admin_finance',
        ids
      );
      setDismissedInSession((prev) => [
        ...prev,
        ...pendingAlerts.map((a) => `${activeRole}-${a.item.id}-${a.meta.timestamp}`),
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcknowledgeSingle = async (itemId: string, timestamp: number) => {
    setIsSubmitting(true);
    try {
      await acknowledgePriceChangeAlerts(
        activeRole as 'project_manager' | 'admin_finance',
        [itemId]
      );
      setDismissedInSession((prev) => [...prev, `${activeRole}-${itemId}-${timestamp}`]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalNetDiff = pendingAlerts.reduce((acc, { item, meta }) => {
    const qty = item.quantity || meta.quantity || 1;
    return acc + (meta.newUnitPrice - meta.oldUnitPrice) * qty;
  }, 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-6 py-4 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0 border border-white/25">
              <Bell className="w-6 h-6 text-amber-100 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  Notifikasi Perubahan Harga • {roleLabel}
                </span>
                <span className="text-[11px] font-semibold text-amber-100">
                  {pendingAlerts.length} Barang Mengalami Perubahan Harga
                </span>
              </div>
              <h3 className="text-base font-bold mt-1">
                Pemberitahuan Penyesuaian Harga Pembelian oleh Logistik
              </h3>
              <p className="text-xs text-amber-100 mt-0.5">
                Terdapat perubahan harga satuan aktual (lebih tinggi / lebih rendah) pada barang pengadaan yang telah disetujui / dibeli oleh Logistik.
              </p>
            </div>
          </div>
          <button
            onClick={handleAcknowledgeAll}
            disabled={isSubmitting}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Tutup & Konfirmasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Banner */}
        <div className="px-6 py-3 bg-amber-50/90 border-b border-amber-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Periksa selisih harga di bawah ini untuk memastikan kesesuaian anggaran & jurnal kas operasional.
            </span>
          </div>
          <div className="font-bold text-slate-800 bg-white px-3 py-1 rounded-lg border border-amber-200">
            Selisih Total Bersih:{' '}
            <span
              className={
                totalNetDiff > 0
                  ? 'text-rose-600'
                  : totalNetDiff < 0
                  ? 'text-emerald-600'
                  : 'text-slate-700'
              }
            >
              {totalNetDiff > 0 ? '+' : ''}
              {formatCurrency(totalNetDiff)}
            </span>
          </div>
        </div>

        {/* Alert Items List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
          {pendingAlerts.map(({ item, meta }) => {
            const itemName =
              item.routine_item?.name || item.custom_item_name || 'Barang Pengadaan';
            const qty = item.quantity || meta.quantity || 1;
            const oldTotal = meta.oldUnitPrice * qty;
            const newTotal = meta.newUnitPrice * qty;
            const unitDiff = meta.newUnitPrice - meta.oldUnitPrice;
            const totalDiff = newTotal - oldTotal;
            const isHigher = unitDiff > 0;
            const pctDiff =
              meta.oldUnitPrice > 0
                ? Math.abs((unitDiff / meta.oldUnitPrice) * 100).toFixed(1)
                : null;
            const cleanLogNotes = cleanSystemNotes(item.logistics_notes);

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-500" />
                    <span className="font-bold text-sm text-slate-900">
                      {itemName}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                      {qty} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      <Building2 className="w-3 h-3" />
                      {item.department_name || item.department_code || 'Departemen'}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {getLifecycleStatusMeta(item.lifecycle_status).label}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Price Comparison Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Harga Awal Disetujui
                      </p>
                      <p className="text-sm font-bold text-slate-700 mt-0.5 line-through decoration-slate-400">
                        {formatCurrency(meta.oldUnitPrice)}{' '}
                        <span className="text-[11px] font-normal text-slate-500">
                          / {item.unit}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Total: <span className="font-semibold">{formatCurrency(oldTotal)}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center py-1">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          isHigher
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isHigher ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isHigher ? 'Harga Naik' : 'Harga Turun'}
                          {pctDiff ? ` (${isHigher ? '+' : '-'}${pctDiff}%)` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mt-1">
                        <span>Selisih:</span>
                        <span className={isHigher ? 'text-rose-600' : 'text-emerald-600'}>
                          {isHigher ? '+' : ''}
                          {formatCurrency(totalDiff)}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-lg border ${
                        isHigher
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-emerald-50/50 border-emerald-200'
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                        Harga Aktual Logistik
                      </p>
                      <p
                        className={`text-sm font-bold mt-0.5 ${
                          isHigher ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(meta.newUnitPrice)}{' '}
                        <span className="text-[11px] font-normal text-slate-500">
                          / {item.unit}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-700 mt-0.5">
                        Total Baru:{' '}
                        <span className="font-bold">{formatCurrency(newTotal)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Reason / Notes */}
                  {(meta.reason || cleanLogNotes) && (
                    <div className="text-xs bg-amber-50/70 border border-amber-200/70 rounded-lg px-3 py-2 text-slate-700">
                      <span className="font-semibold text-amber-900">
                        Keterangan Logistik:{' '}
                      </span>
                      {meta.reason || cleanLogNotes}
                    </div>
                  )}

                  {pendingAlerts.length > 1 && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleAcknowledgeSingle(item.id, meta.timestamp)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Tandai Sudah Dibaca
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Notifikasi ini muncul otomatis saat {roleLabel} masuk ke sistem.
          </p>
          <button
            onClick={handleAcknowledgeAll}
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Menyimpan Konfirmasi...'
                : `Konfirmasi & Tutup Notifikasi (${pendingAlerts.length})`}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

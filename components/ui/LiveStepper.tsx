'use client';

import React from 'react';
import { ItemLifecycleStatus, DeliveryStatusType } from '@/lib/types';
import { Check, Clock, Truck, Package, ShieldCheck, AlertCircle } from 'lucide-react';

interface LiveStepperProps {
  status: ItemLifecycleStatus;
  deliveryStatus?: DeliveryStatusType;
  eta?: string;
  receivedAt?: string;
  isCompact?: boolean;
}

interface StepDefinition {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDefinition[] = [
  {
    id: 'submit',
    title: '1. Diajukan (Submitted)',
    description: 'Permintaan mingguan dibuat oleh HOD',
    icon: Clock,
  },
  {
    id: 'validate',
    title: '2. Logistik (Sourcing)',
    description: 'Pengecekan harga & verifikasi vendor',
    icon: Package,
  },
  {
    id: 'approve',
    title: '3. Approval Finance',
    description: 'Persetujuan urgensi barang oleh Finance',
    icon: ShieldCheck,
  },
  {
    id: 'buy',
    title: '4. Otorisasi PM & PO',
    description: 'Otorisasi beli oleh PM & eksekusi pembelian',
    icon: Check,
  },
  {
    id: 'transit',
    title: '5. Pengiriman',
    description: 'Barang dalam perjalanan ke site tambang',
    icon: Truck,
  },
  {
    id: 'received',
    title: '6. Tiba di Site',
    description: 'Konfirmasi fisik barang diterima di site',
    icon: Check,
  },
];

export function getStepIndex(status: ItemLifecycleStatus, deliveryStatus?: DeliveryStatusType): number {
  switch (status) {
    case 'draft':
      return 0;
    case 'submitted':
    case 'needs_revision':
      return 1;
    case 'validated':
      return 2;
    case 'pm_item_approved':
    case 'finance_budgeted':
    case 'pm_buy_approved':
      return 3;
    case 'deferred_deficit':
    case 'deferred_next_week':
      return 2;
    case 'purchased':
    case 'processing_delivery':
      if (deliveryStatus === 'in_transit') return 5;
      if (deliveryStatus === 'delivered') return 6;
      return 4;
    case 'in_transit':
      return 5;
    case 'received_at_site':
      return 6;
    default:
      return 1;
  }
}

export function LiveStepper({
  status,
  deliveryStatus = 'none',
  eta,
  receivedAt,
  isCompact = false,
}: LiveStepperProps) {
  const currentStep = getStepIndex(status, deliveryStatus);
  const isDeferred = status === 'deferred_deficit' || status === 'deferred_next_week';
  const isRejected = status === 'pm_item_rejected';

  if (isCompact) {
    return (
      <div className="flex items-center gap-1.5 py-1">
        {STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const isComplete = stepNum <= currentStep;
          const isCurrent = stepNum === currentStep;

          let colorClass = 'bg-zinc-200 text-zinc-600 dark:bg-[#1f242c] dark:text-zinc-400 border border-zinc-300 dark:border-[#2d3440]';
          if (isComplete) {
            colorClass = 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-xs';
          } else if (isCurrent) {
            colorClass = 'bg-blue-600 text-white font-bold border-blue-500 ring-2 ring-blue-500/20';
          }
          if (isDeferred && stepNum === 3) {
            colorClass = 'bg-amber-500 text-slate-950 border-amber-600';
          }
          if (isRejected && stepNum === 3) {
            colorClass = 'bg-red-500 text-white border-red-600';
          }

          return (
            <React.Fragment key={step.id}>
              <div
                title={`${step.title}: ${step.description}`}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${colorClass}`}
              >
                {isComplete && stepNum < 6 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : stepNum}
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-3 rounded-full ${
                    stepNum < currentStep ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-[#252b35]'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-zinc-50 dark:bg-[#0e1115] rounded-xl border border-zinc-200 dark:border-[#232830] shadow-xs">
      {isDeferred && (
        <div className="mb-3 flex items-center gap-2.5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
          <span>
            <strong className="font-bold">Ditunda (Rollover Defisit):</strong> Barang ini dialihkan ke minggu depan karena limit anggaran tunai. Tetap diprioritaskan pada antrean berikutnya.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const isComplete = stepNum <= currentStep;
          const isCurrent = stepNum === currentStep;

          let stateClass = 'border border-zinc-200 dark:border-[#232830] bg-white dark:bg-[#14171c] text-zinc-500';
          let iconBg = 'bg-zinc-100 dark:bg-[#1e232b] text-zinc-500 dark:text-zinc-400';

          if (isComplete) {
            stateClass = 'border border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 shadow-xs';
            iconBg = 'bg-emerald-500 text-slate-950';
          } else if (isCurrent) {
            stateClass = 'border border-blue-500/50 bg-blue-500/5 dark:bg-blue-500/10 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20';
            iconBg = 'bg-blue-600 text-white';
          }

          const IconComponent = step.icon;

          return (
            <div
              key={step.id}
              className={`flex flex-col p-3 rounded-xl transition-all ${stateClass}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${iconBg}`}>
                  {isComplete && stepNum < 6 ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <IconComponent className="w-3.5 h-3.5" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isComplete
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : isCurrent
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      : 'bg-zinc-100 dark:bg-[#1e232b] text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {isComplete ? 'Selesai' : isCurrent ? 'Diproses' : 'Menunggu'}
                </span>
              </div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white mb-0.5">
                {step.title}
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                {step.description}
              </p>

              {stepNum === 5 && eta && (
                <div className="mt-2 text-[10px] font-bold text-purple-600 dark:text-purple-300 bg-purple-500/10 p-1 rounded border border-purple-500/20">
                  ETA: {eta}
                </div>
              )}

              {stepNum === 6 && receivedAt && (
                <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 p-1 rounded border border-emerald-500/20">
                  Diterima: {new Date(receivedAt).toLocaleDateString('id-ID')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

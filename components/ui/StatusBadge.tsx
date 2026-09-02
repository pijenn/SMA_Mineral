import React from 'react';
import { PriorityLevel, ItemLifecycleStatus, DeliveryStatusType } from '@/lib/types';
import { getPriorityMeta, getLifecycleStatusMeta, getDeliveryStatusMeta } from '@/lib/utils';

export function PriorityBadge({ level, showFull = false }: { level: PriorityLevel; showFull?: boolean }) {
  const meta = getPriorityMeta(level);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border-2 ${meta.badgeClass}`}
    >
      <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
      <span>{showFull ? meta.label : meta.shortLabel}</span>
    </span>
  );
}

export function LifecycleBadge({ status }: { status: ItemLifecycleStatus }) {
  const meta = getLifecycleStatusMeta(status);
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border-2 ${meta.color}`}>
      {meta.label}
    </span>
  );
}

export function DeliveryBadge({ status }: { status: DeliveryStatusType }) {
  const meta = getDeliveryStatusMeta(status);
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border-2 ${meta.color}`}>
      {meta.label}
    </span>
  );
}

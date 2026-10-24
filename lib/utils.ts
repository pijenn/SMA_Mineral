import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PriorityLevel, ItemLifecycleStatus, DeliveryStatusType } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isAllDepartments(deptId?: string | null): boolean {
  if (!deptId) return true;
  const lower = deptId.trim().toLowerCase();
  return lower === 'all' || lower === 'semua' || lower === '';
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function getPriorityMeta(level: PriorityLevel) {
  switch (level) {
    case 3:
      return {
        label: 'Level 3 - Urgent / K3',
        shortLabel: 'L3: Urgent',
        badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
        dotClass: 'bg-red-500',
      };
    case 2:
      return {
        label: 'Level 2 - Operasional',
        shortLabel: 'L2: Operasional',
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        dotClass: 'bg-amber-500',
      };
    case 1:
    default:
      return {
        label: 'Level 1 - Rutin Normal',
        shortLabel: 'L1: Rutin',
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        dotClass: 'bg-blue-500',
      };
  }
}

export function getLifecycleStatusMeta(status: ItemLifecycleStatus) {
  switch (status) {
    case 'draft':
      return { label: 'Draft', color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20' };
    case 'submitted':
      return { label: 'Diajukan (Antrean Logistik)', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
    case 'needs_revision':
      return { label: 'Perlu Revisi', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' };
    case 'validated':
      return { label: 'Tervalidasi (Menunggu Approval Finance)', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
    case 'pm_item_approved':
      return { label: 'Disetujui Urgensi (Menunggu PM Buy)', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' };
    case 'pm_item_rejected':
      return { label: 'Ditolak Urgensi Finance', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' };
    case 'finance_budgeted':
      return { label: 'Alokasi Finance (Siap Beli)', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' };
    case 'pm_buy_approved':
      return { label: 'Otorisasi PM & Proses Checkout', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
    case 'deferred_deficit':
      return { label: 'Tertunda (Defisit Kas)', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
    case 'purchased':
      return { label: 'Dibeli / PO Terbit', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' };
    case 'processing_delivery':
      return { label: 'Packing & Warehouse', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' };
    case 'in_transit':
      return { label: 'Dalam Pengiriman ke Site', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' };
    case 'received_at_site':
      return { label: 'Tiba di Site Tambang', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
    case 'deferred_next_week':
      return { label: 'Rollover Minggu Depan', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' };
    default:
      return { label: status, color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20' };
  }
}

export function getDeliveryStatusMeta(status: DeliveryStatusType) {
  switch (status) {
    case 'delivered':
      return { label: 'Tiba di Site', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    case 'in_transit':
      return { label: 'Dalam Perjalanan', color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20' };
    case 'processing':
      return { label: 'Sedang Diproses', color: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20' };
    case 'delayed':
      return { label: 'Tertunda / Kendala', color: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20' };
    case 'none':
    default:
      return { label: 'Belum Dikirim', color: 'text-zinc-500 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20' };
  }
}

// ============================================================================
// SYSTEM METADATA TAG HELPERS (FOR PRICE CHANGE & QUANTITY REDUCTION ALERTS)
// ============================================================================

export function cleanSystemNotes(notes?: string | null): string {
  if (!notes) return '';
  return notes
    .replace(/\[\[PRICE_ALERT:[^\]]*\]\]/g, '')
    .replace(/\[\[HOD_REDUCTION_PENDING:[^\]]*\]\]/g, '')
    .replace(/\[\[HOD_REDUCTION_RESOLVED:[^\]]*\]\]/g, '')
    .replace(/\s*\|\s*\|\s*/g, ' | ')
    .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
    .trim();
}

export interface PriceChangeAlertMeta {
  alertId: string;
  itemId: string;
  oldUnitPrice: number;
  newUnitPrice: number;
  quantity: number;
  pmAck: boolean;
  finAck: boolean;
  reason: string;
  timestamp: number;
}

export function serializePriceAlertTag(meta: PriceChangeAlertMeta): string {
  const safeReason = encodeURIComponent(meta.reason || '');
  return `[[PRICE_ALERT:id=${meta.alertId};old=${meta.oldUnitPrice};new=${meta.newUnitPrice};qty=${meta.quantity};pm_ack=${meta.pmAck ? 1 : 0};fin_ack=${meta.finAck ? 1 : 0};reason=${safeReason};ts=${meta.timestamp}]]`;
}

export function parsePriceAlertFromNotes(
  itemId: string,
  logisticsNotes?: string | null
): PriceChangeAlertMeta | null {
  if (!logisticsNotes) return null;
  const match = logisticsNotes.match(/\[\[PRICE_ALERT:([^\]]+)\]\]/);
  if (!match || !match[1]) return null;

  const kv: Record<string, string> = {};
  match[1].split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      kv[k] = v;
    }
  });

  const oldUnitPrice = Number(kv.old ?? 0);
  const newUnitPrice = Number(kv.new ?? 0);
  if (isNaN(oldUnitPrice) || isNaN(newUnitPrice) || oldUnitPrice === newUnitPrice) {
    return null;
  }

  let decodedReason = '';
  try {
    decodedReason = decodeURIComponent(kv.reason || '');
  } catch {
    decodedReason = kv.reason || '';
  }

  return {
    alertId: kv.id || `pa-${itemId}`,
    itemId,
    oldUnitPrice,
    newUnitPrice,
    quantity: Number(kv.qty || 1),
    pmAck: kv.pm_ack === '1',
    finAck: kv.fin_ack === '1',
    reason: decodedReason,
    timestamp: Number(kv.ts || Date.now()),
  };
}

export function upsertPriceAlertInNotes(
  existingNotes: string | undefined | null,
  humanNote: string | undefined,
  meta: PriceChangeAlertMeta
): string {
  const stripped = (existingNotes || '').replace(/\[\[PRICE_ALERT:[^\]]*\]\]/g, '').replace(/\s*\|\s*$/, '').trim();
  const tag = serializePriceAlertTag(meta);
  const withHuman = humanNote
    ? stripped
      ? `${stripped} | ${humanNote}`
      : humanNote
    : stripped;
  return withHuman ? `${withHuman} ${tag}` : tag;
}

export function markPriceAlertAckInNotes(
  existingNotes: string | undefined | null,
  itemId: string,
  role: 'project_manager' | 'admin_finance'
): string {
  if (!existingNotes) return '';
  const parsed = parsePriceAlertFromNotes(itemId, existingNotes);
  if (!parsed) return existingNotes;
  const updated: PriceChangeAlertMeta = {
    ...parsed,
    pmAck: role === 'project_manager' ? true : parsed.pmAck,
    finAck: role === 'admin_finance' ? true : parsed.finAck,
  };
  const stripped = existingNotes.replace(/\[\[PRICE_ALERT:[^\]]*\]\]/g, '').trim();
  const tag = serializePriceAlertTag(updated);
  return stripped ? `${stripped} ${tag}` : tag;
}

export interface HodReductionAlertMeta {
  alertId: string;
  itemId: string;
  originalQuantity: number;
  newQuantity: number;
  reducedQuantity: number;
  reason: string;
  timestamp: number;
}

export function serializeHodReductionTag(meta: HodReductionAlertMeta): string {
  const safeReason = encodeURIComponent(meta.reason || '');
  return `[[HOD_REDUCTION_PENDING:id=${meta.alertId};orig=${meta.originalQuantity};new=${meta.newQuantity};diff=${meta.reducedQuantity};reason=${safeReason};ts=${meta.timestamp}]]`;
}

export function parseHodReductionFromNotes(
  itemId: string,
  approvalNotes?: string | null
): HodReductionAlertMeta | null {
  if (!approvalNotes) return null;
  const match = approvalNotes.match(/\[\[HOD_REDUCTION_PENDING:([^\]]+)\]\]/);
  if (!match || !match[1]) return null;

  const kv: Record<string, string> = {};
  match[1].split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      kv[k] = v;
    }
  });

  const originalQuantity = Number(kv.orig ?? 0);
  const newQuantity = Number(kv.new ?? 0);
  const reducedQuantity = Number(kv.diff ?? originalQuantity - newQuantity);
  if (isNaN(reducedQuantity) || reducedQuantity <= 0) {
    return null;
  }

  let decodedReason = '';
  try {
    decodedReason = decodeURIComponent(kv.reason || '');
  } catch {
    decodedReason = kv.reason || '';
  }

  return {
    alertId: kv.id || `hr-${itemId}`,
    itemId,
    originalQuantity,
    newQuantity,
    reducedQuantity,
    reason: decodedReason,
    timestamp: Number(kv.ts || Date.now()),
  };
}

export function upsertHodReductionInNotes(
  existingNotes: string | undefined | null,
  humanNote: string | undefined,
  meta: HodReductionAlertMeta
): string {
  const stripped = (existingNotes || '')
    .replace(/\[\[HOD_REDUCTION_PENDING:[^\]]*\]\]/g, '')
    .replace(/\s*\|\s*$/, '')
    .trim();
  const tag = serializeHodReductionTag(meta);
  const withHuman = humanNote
    ? stripped
      ? `${stripped} | ${humanNote}`
      : humanNote
    : stripped;
  return withHuman ? `${withHuman} ${tag}` : tag;
}

export function resolveHodReductionInNotes(
  existingNotes: string | undefined | null,
  resolutionNote: string,
  action: 'postponed' | 'accepted',
  reducedQty: number
): string {
  const stripped = (existingNotes || '')
    .replace(/\[\[HOD_REDUCTION_PENDING:[^\]]*\]\]/g, '')
    .replace(/\[\[HOD_REDUCTION_RESOLVED:[^\]]*\]\]/g, '')
    .replace(/\s*\|\s*$/, '')
    .trim();
  const resolvedTag = `[[HOD_REDUCTION_RESOLVED:action=${action};diff=${reducedQty};ts=${Date.now()}]]`;
  const combined = stripped ? `${stripped} | ${resolutionNote}` : resolutionNote;
  return `${combined} ${resolvedTag}`;
}

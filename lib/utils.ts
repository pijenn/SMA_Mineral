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

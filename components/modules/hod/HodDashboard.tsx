'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate, isAllDepartments } from '@/lib/utils';
import { PriorityBadge, LifecycleBadge, DeliveryBadge } from '@/components/ui/StatusBadge';
import { LiveStepper } from '@/components/ui/LiveStepper';
import { RequestModal } from './RequestModal';
import { RoutineCatalogModal } from './RoutineCatalogModal';
import {
  Plus,
  Tag,
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building2,
  ArrowRight,
  FileText,
  DollarSign,
  Package,
  Calendar,
  Search,
  Filter,
  X,
} from 'lucide-react';

interface HodDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function HodDashboard({ activeTab = 'overview', onTabChange }: HodDashboardProps) {
  const {
    currentUser,
    selectedDepartmentId,
    departments,
    activePeriod,
    requestItems,
    routineItems,
    confirmSiteReceipt,
  } = useApp();

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivery' | 'delivered'>('all');

  const isAll = isAllDepartments(selectedDepartmentId);
  const activeDeptId = currentUser?.department_id || (!isAll ? selectedDepartmentId : (departments[0]?.id || ''));
  const currentDept = departments.find((d) => d.id === activeDeptId);
  const deptItems = requestItems.filter((item) => item.department_id === activeDeptId);
  const deptRoutineCatalog = routineItems.filter((r) => r.department_id === activeDeptId);

  const urgentCount = deptItems.filter((i) => i.priority_level === 3).length;
  const inTransitCount = deptItems.filter((i) => i.delivery_status === 'in_transit').length;
  const deliveredCount = deptItems.filter((i) => i.lifecycle_status === 'received_at_site').length;
  const pendingCount = deptItems.filter(
    (i) => i.lifecycle_status === 'submitted' || i.lifecycle_status === 'validated' || i.lifecycle_status === 'draft'
  ).length;
  const totalEstimated = deptItems.reduce((acc, i) => acc + (i.estimated_total_price || 0), 0);

  // Filter items by search, priority, and status tab
  const filteredDeptItems = deptItems.filter((item) => {
    const routine = routineItems.find((r) => r.id === item.routine_item_id);
    const itemName = (routine?.name || item.custom_item_name || '').toLowerCase();
    const itemCode = (routine?.item_code || '').toLowerCase();
    const spec = (item.specification || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q || itemName.includes(q) || itemCode.includes(q) || spec.includes(q);
    const matchesPriority = selectedPriorityFilter === 'ALL' || String(item.priority_level) === selectedPriorityFilter;

    if (statusFilter === 'pending') {
      return matchesSearch && matchesPriority && (item.lifecycle_status === 'submitted' || item.lifecycle_status === 'validated' || item.lifecycle_status === 'draft');
    }
    if (statusFilter === 'delivery') {
      return matchesSearch && matchesPriority && (item.delivery_status === 'in_transit' || item.lifecycle_status === 'purchased' || item.lifecycle_status === 'processing_delivery');
    }
    if (statusFilter === 'delivered') {
      return matchesSearch && matchesPriority && item.lifecycle_status === 'received_at_site';
    }

    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              HOD Procurement Panel
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {currentDept?.code || 'DEPT'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{activePeriod.period_name}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Monitor status pengadaan {currentDept?.name}, kuota katalog rutin, dan konfirmasi penerimaan fisik di site tambang.
          </p>
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat Pengajuan</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Metric Cards (Matching reference layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Pengajuan */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Total Estimasi Biaya
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {formatCurrency(totalEstimated)}
            </div>
          </div>
        </div>

        {/* Card 2: Jumlah Pengajuan */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Total Pengajuan
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {deptItems.length} Barang
            </div>
          </div>
        </div>

        {/* Card 3: Prioritas K3 / Mendesak */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Level 3 (K3 Mendesak)
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {urgentCount} Urgensi
            </div>
          </div>
        </div>

        {/* Card 4: Status Ekspedisi & Diterima */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Tiba di Site Tambang
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {deliveredCount} Diterima
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action & Management Cards (Matching Recruitment & Screening in screenshot) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          Aksi Cepat & Alur Kerja Departemen
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Action Card 1: Request Barang */}
          <div
            onClick={() => setIsRequestModalOpen(true)}
            className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] flex items-center justify-between gap-4 cursor-pointer group hover:border-emerald-500/50 hover:bg-zinc-50 dark:hover:bg-[#181c22] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                  Buat Pengajuan Barang Baru
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Input kebutuhan operasional mingguan (Rutin maupun Non-Rutin).
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0" />
          </div>

          {/* Action Card 2: Kelola Katalog */}
          <div
            onClick={() => setIsCatalogModalOpen(true)}
            className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] flex items-center justify-between gap-4 cursor-pointer group hover:border-blue-500/50 hover:bg-zinc-50 dark:hover:bg-[#181c22] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-blue-500 transition-colors">
                  Katalog Barang Rutin Departemen
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Lihat kuota mingguan, riwayat harga acuan, dan tambah item rutin baru.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
          </div>
        </div>
      </div>

      {/* Main Request Tracking Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Daftar Pengajuan & Pelacakan Ekspedisi
          </h2>
          <span className="text-xs font-semibold text-zinc-400">
            Menampilkan {filteredDeptItems.length} dari {deptItems.length} Pengajuan
          </span>
        </div>

        {/* Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-[#232830] pb-3">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
            }`}
          >
            Semua ({deptItems.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
            }`}
          >
            Menunggu Approval ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('delivery')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'delivery'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
            }`}
          >
            Dalam Ekspedisi ({inTransitCount})
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'delivered'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
            }`}
          >
            Tiba di Site ({deliveredCount})
          </button>
        </div>

        {/* Search and Priority Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari nama barang, kode rutin/non-rutin, atau spesifikasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs font-semibold px-3 py-2.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Semua Prioritas</option>
              <option value="3">Level 3 (K3 Mendesak)</option>
              <option value="2">Level 2 (Operasional)</option>
              <option value="1">Level 1 (Rutin Normal)</option>
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] overflow-hidden shadow-xs divide-y divide-zinc-200 dark:divide-[#232830]">
          {deptItems.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-[#1c222b] text-zinc-400 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                Belum Ada Pengajuan Barang
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Departemen Anda belum mengajukan kebutuhan pada siklus ini. Silakan klik tombol <strong>+ Buat Pengajuan</strong>.
              </p>
            </div>
          ) : filteredDeptItems.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-[#1c222b] text-zinc-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                Tidak Ada Barang Sesuai Pencarian
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Tidak ditemukan barang dengan kata kunci atau filter prioritas tersebut.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedPriorityFilter('ALL');
                  setStatusFilter('all');
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold cursor-pointer"
              >
                Reset Filter & Pencarian
              </button>
            </div>
          ) : (
            filteredDeptItems.map((item) => {
              const routine = routineItems.find((r) => r.id === item.routine_item_id);
              const itemName = routine?.name || item.custom_item_name || 'Barang Tambang';
              const itemCode = routine?.item_code || 'ADDITIONAL (Non-Rutin)';
              const isExpanded = expandedItemId === item.id;

              return (
                <div key={item.id} className="transition-colors hover:bg-zinc-50/60 dark:hover:bg-[#181c22]">
                  <div
                    onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                  >
                    {/* Item Info */}
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15 px-2.5 py-1 rounded-md border border-emerald-500/20 shrink-0">
                        {itemCode}
                      </span>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                            {itemName}
                          </h4>
                          <PriorityBadge level={item.priority_level} showFull />
                          {item.is_rollover && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded">
                              Rollover
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-x-4">
                          <span>
                            Jumlah: <strong className="text-zinc-800 dark:text-zinc-200">{item.quantity} {item.unit}</strong>
                          </span>
                          <span>
                            Estimasi Total:{' '}
                            <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                              {formatCurrency(item.estimated_total_price || 0)}
                            </strong>
                          </span>
                          {item.specification && (
                            <span className="italic text-zinc-400">&ldquo;{item.specification}&rdquo;</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right actions / Stepper Preview */}
                    <div className="flex items-center gap-4 self-end md:self-auto shrink-0">
                      <div className="hidden lg:block">
                        <LiveStepper
                          status={item.lifecycle_status}
                          deliveryStatus={item.delivery_status}
                          isCompact
                        />
                      </div>

                      <LifecycleBadge status={item.lifecycle_status} />

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded 6-Stage Tracking & Receipt Confirmation */}
                  {isExpanded && (
                    <div className="p-5 bg-zinc-50 dark:bg-[#111418] border-t border-zinc-200 dark:border-[#232830] space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                          Progres Pelacakan 6-Tahap (Live Stepper):
                        </h5>
                      </div>

                      <LiveStepper
                        status={item.lifecycle_status}
                        deliveryStatus={item.delivery_status}
                        eta={item.eta_delivery}
                        receivedAt={item.received_at}
                      />

                      {/* Site Receipt Confirmation Button */}
                      {item.lifecycle_status === 'purchased' && item.delivery_status !== 'delivered' && (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h5 className="font-bold text-xs text-emerald-800 dark:text-emerald-300">
                              Barang Sudah Tiba di Lokasi Tambang?
                            </h5>
                            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                              Konfirmasi penerimaan fisik agar siklus pengadaan barang ini selesai dan tercatat di sistem.
                            </p>
                          </div>

                          <button
                            onClick={() => confirmSiteReceipt(item.id, 'Diterima dalam kondisi baik di warehouse site')}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Konfirmasi Fisik Diterima</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      {isRequestModalOpen && (
        <RequestModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} />
      )}
      {isCatalogModalOpen && (
        <RoutineCatalogModal isOpen={isCatalogModalOpen} onClose={() => setIsCatalogModalOpen(false)} />
      )}
    </div>
  );
}

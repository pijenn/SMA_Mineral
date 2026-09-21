'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ProcurementRequestItem, PriorityLevel, DeliveryStatusType } from '@/lib/types';
import { formatCurrency, formatDate, isAllDepartments } from '@/lib/utils';
import { PriorityBadge, LifecycleBadge, DeliveryBadge } from '@/components/ui/StatusBadge';
import { LiveStepper } from '@/components/ui/LiveStepper';
import {
  Truck,
  DollarSign,
  Package,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  UploadCloud,
  FileText,
  Clock,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Plus,
  ShieldCheck,
  Receipt,
  FileSpreadsheet,
  Eye,
  Upload,
  X,
  FileCheck,
} from 'lucide-react';
import { ExcelImportModal } from './ExcelImportModal';

interface LogisticsDashboardProps {
  activeTab?: 'pipeline' | 'purchasing' | 'delivery' | 'backlog';
  onTabChange?: (tab: 'pipeline' | 'purchasing' | 'delivery' | 'backlog') => void;
}

export function LogisticsDashboard({ activeTab = 'pipeline', onTabChange }: LogisticsDashboardProps) {
  const {
    departments,
    activePeriod,
    requestItems,
    routineItems,
    transactions,
    updateItemLogistics,
    recordPurchase,
    updateDeliveryStatus,
    deferItemDeficit,
    selectedDepartmentId,
    setSelectedDepartmentId,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('ALL');

  // Internal tab state if not driven by parent
  const [localTab, setLocalTab] = useState<'pipeline' | 'purchasing' | 'delivery' | 'backlog'>(activeTab);
  const currentTab = onTabChange ? activeTab : localTab;
  const setTab = (t: 'pipeline' | 'purchasing' | 'delivery' | 'backlog') => {
    if (onTabChange) onTabChange(t);
    setLocalTab(t);
  };

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sourcingItem, setSourcingItem] = useState<ProcurementRequestItem | null>(null);
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(0);
  const [refLink, setRefLink] = useState('');
  const [finalPrice, setFinalPrice] = useState<number>(0);

  // Purchase execution state
  const [purchaseModalItem, setPurchaseModalItem] = useState<ProcurementRequestItem | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer (Mandiri)');
  const [receiptUrl, setReceiptUrl] = useState('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [receiptFileType, setReceiptFileType] = useState('image/jpeg');
  const [receiptUploadMode, setReceiptUploadMode] = useState<'url' | 'file'>('url');

  // Item detail modal state for Admin Logistik
  const [selectedDetailItem, setSelectedDetailItem] = useState<ProcurementRequestItem | null>(null);

  // Delivery status state
  const [deliveryModalItem, setDeliveryModalItem] = useState<ProcurementRequestItem | null>(null);
  const [newDeliveryStatus, setNewDeliveryStatus] = useState<DeliveryStatusType>('in_transit');
  const [deliveryEta, setDeliveryEta] = useState('2026-09-06');

  // Department scope check
  const isAllDept = isAllDepartments(selectedDepartmentId);
  const deptItems = isAllDept
    ? requestItems
    : requestItems.filter((i) => i.department_id === selectedDepartmentId);

  // Metrics
  const validatedCount = deptItems.filter((i) => i.lifecycle_status === 'validated').length;
  const readyToBuyCount = deptItems.filter((i) => i.lifecycle_status === 'pm_buy_approved').length;
  const inTransitCount = deptItems.filter((i) => i.delivery_status === 'in_transit').length;
  const completedCount = deptItems.filter((i) => i.lifecycle_status === 'received_at_site').length;
  const backlogCount = deptItems.filter(
    (i) => i.lifecycle_status === 'deferred_deficit' || i.lifecycle_status === 'deferred_next_week' || i.is_rollover
  ).length;

  // Filters
  const filteredItems = requestItems.filter((item) => {
    const routine = routineItems.find((r) => r.id === item.routine_item_id);
    const itemName = (routine?.name || item.custom_item_name || '').toLowerCase();
    const itemCode = (routine?.item_code || '').toLowerCase();
    const deptName = (item.department_name || '').toLowerCase();
    const matchesSearch =
      itemName.includes(searchQuery.toLowerCase()) ||
      itemCode.includes(searchQuery.toLowerCase()) ||
      deptName.includes(searchQuery.toLowerCase());

    const matchesDept = isAllDept || item.department_id === selectedDepartmentId;
    const matchesPriority =
      selectedPriorityFilter === 'ALL' || String(item.priority_level) === selectedPriorityFilter;

    if (currentTab === 'purchasing') {
      return matchesSearch && matchesDept && matchesPriority && item.lifecycle_status === 'pm_buy_approved';
    }
    if (currentTab === 'delivery') {
      return (
        matchesSearch &&
        matchesDept &&
        matchesPriority &&
        (item.lifecycle_status === 'purchased' ||
          item.lifecycle_status === 'processing_delivery' ||
          item.delivery_status === 'in_transit' ||
          item.lifecycle_status === 'received_at_site')
      );
    }
    if (currentTab === 'backlog') {
      return (
        matchesSearch &&
        matchesDept &&
        matchesPriority &&
        (item.lifecycle_status === 'deferred_deficit' ||
          item.lifecycle_status === 'deferred_next_week' ||
          item.is_rollover)
      );
    }

    return matchesSearch && matchesDept && matchesPriority;
  });

  const handleOpenSourcing = (item: ProcurementRequestItem) => {
    const routine = routineItems.find((r) => r.id === item.routine_item_id);
    const defaultPrice = item.final_unit_price || routine?.estimated_unit_price || 100000;
    setSourcingItem(item);
    setPriceMin(item.price_range_min || defaultPrice * 0.95);
    setPriceMax(item.price_range_max || defaultPrice * 1.1);
    setRefLink(item.reference_link || '');
    setFinalPrice(defaultPrice);
  };

  const handleSaveSourcing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcingItem) return;

    updateItemLogistics(sourcingItem.id, {
      price_range_min: Number(priceMin),
      price_range_max: Number(priceMax),
      reference_link: refLink,
      final_unit_price: Number(finalPrice),
      lifecycle_status: 'validated',
    });

    setSourcingItem(null);
  };

  const handleOpenPurchase = (item: ProcurementRequestItem) => {
    setPurchaseModalItem(item);
    const defaultVendor = item.reference_link && !item.reference_link.startsWith('http')
      ? item.reference_link
      : 'PT Mitra Supplier Mining';
    setVendorName(defaultVendor);
    const invNum = `INV-${Date.now().toString().slice(-4)}`;
    setInvoiceNumber(invNum);
    setReceiptUrl('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80');
    setReceiptFileName(`Kuitansi_${invNum}.jpg`);
    setReceiptFileType('image/jpeg');
    setReceiptUploadMode('url');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFileName(file.name);
    setReceiptFileType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (typeof uploadEvent.target?.result === 'string') {
        setReceiptUrl(uploadEvent.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExecutePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseModalItem) return;

    const total = purchaseModalItem.quantity * (purchaseModalItem.final_unit_price || 0);

    recordPurchase(
      {
        period_id: activePeriod.id,
        transaction_code: `PO-SMA-2026-W36-${String(Math.floor(Math.random() * 900) + 100)}`,
        vendor_name: vendorName,
        invoice_number: invoiceNumber,
        purchase_date: new Date().toISOString().split('T')[0],
        total_amount: total,
        payment_method: paymentMethod,
        notes: `Pembelian operasional ${purchaseModalItem.quantity} ${purchaseModalItem.unit} untuk Dept ${purchaseModalItem.department_name}`,
      },
      [purchaseModalItem.id],
      receiptUrl ? {
        file_url: receiptUrl,
        file_name: receiptFileName || `Kuitansi_${invoiceNumber}.jpg`,
        file_type: receiptFileType || 'image/jpeg',
      } : undefined
    );

    setPurchaseModalItem(null);
  };

  const handleOpenDelivery = (item: ProcurementRequestItem) => {
    setDeliveryModalItem(item);
    setNewDeliveryStatus(item.delivery_status);
    setDeliveryEta(item.eta_delivery || '2026-09-06');
  };

  const handleSaveDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryModalItem) return;

    updateDeliveryStatus(deliveryModalItem.id, newDeliveryStatus, deliveryEta);
    setDeliveryModalItem(null);
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Logistik & Sourcing Panel
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Supply Chain
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Validasi harga pasar 3-vendor, eksekusi Purchase Order (PO), dan pelacakan ekspedisi ke site tambang.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload Excel Logistik</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Pipeline Validasi */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Tervalidasi Sourcing
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {validatedCount} Item
            </div>
          </div>
        </div>

        {/* Card 2: Siap Eksekusi Beli */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Disetujui Beli (PM)
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {readyToBuyCount} Siap PO
            </div>
          </div>
        </div>

        {/* Card 3: Dalam Pengiriman */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Ekspedisi OTW Site
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {inTransitCount} Kiriman
            </div>
          </div>
        </div>

        {/* Card 4: Selesai di Site */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-[#2d3440]">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Diterima di Warehouse
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
              {completedCount} Selesai
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Navigation */}
      <div className="space-y-4">
        {/* Module Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-[#232830] pb-3">
          <button
            onClick={() => setTab('pipeline')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              currentTab === 'pipeline'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
            }`}
          >
            Pipeline Sourcing ({deptItems.length})
          </button>
          <button
            onClick={() => setTab('purchasing')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              currentTab === 'purchasing'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
            }`}
          >
            Eksekusi Beli / PO ({readyToBuyCount})
          </button>
          <button
            onClick={() => setTab('delivery')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              currentTab === 'delivery'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
            }`}
          >
            Pelacakan Ekspedisi ({inTransitCount + completedCount})
          </button>
          <button
            onClick={() => setTab('backlog')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              currentTab === 'backlog'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white dark:bg-[#14171c] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-[#232830]'
            }`}
          >
            Tertunda / Defisit Kas ({backlogCount})
          </button>
        </div>

        {/* Search and Priority Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari nama barang, kode rutin, atau departemen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="bg-white dark:bg-[#14171c] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs font-semibold px-3 py-2.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Semua Prioritas</option>
              <option value="3">Level 3 (K3 Mendesak)</option>
              <option value="2">Level 2 (Operasional Rutin)</option>
              <option value="1">Level 1 (Stok Cadangan)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Pipeline List */}
      <div className="bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Daftar Barang & Tindakan Logistik
          </h2>
          <span className="text-xs font-semibold text-zinc-400">
            Menampilkan {filteredItems.length} Item
          </span>
        </div>

        <div className="divide-y divide-zinc-200 dark:divide-[#232830]">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-2">
              <Package className="w-10 h-10 text-zinc-400 mx-auto" />
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                Tidak Ada Barang Ditemukan
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tidak ada data pada filter atau tab ini.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const routine = routineItems.find((r) => r.id === item.routine_item_id);
              const itemName = routine?.name || item.custom_item_name || 'Barang Tambang';
              const itemCode = routine?.item_code || 'ADDITIONAL';
              const unitPrice = item.final_unit_price || routine?.estimated_unit_price || 0;

              return (
                <div
                  key={item.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-zinc-50/60 dark:hover:bg-[#181c22] transition-colors"
                >
                  {/* Left: Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {itemCode}
                      </span>
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                        Dept: <strong className="text-zinc-800 dark:text-zinc-200">{item.department_name}</strong>
                      </span>
                      <PriorityBadge level={item.priority_level} showFull />
                      <LifecycleBadge status={item.lifecycle_status} />
                    </div>

                    <h4
                      onClick={() => setSelectedDetailItem(item)}
                      className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      {itemName}
                    </h4>

                    {item.specification && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">Spesifikasi:</span> {item.specification}
                      </p>
                    )}

                    <div className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Jumlah: <strong className="text-zinc-800 dark:text-zinc-200">{item.quantity} {item.unit}</strong>
                      </span>
                      <span>
                        Harga Satuan Sourcing:{' '}
                        <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                          {formatCurrency(unitPrice)}
                        </strong>
                      </span>
                      <span>
                        Total:{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          {formatCurrency((item.quantity || 1) * unitPrice)}
                        </strong>
                      </span>
                    </div>

                    {item.reference_link && (
                      <div className="pt-1">
                        {item.reference_link.startsWith('http') ? (
                          <a
                            href={item.reference_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Link Vendor / Marketplace</span>
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Building2 className="w-3 h-3" />
                            <span>Vendor: {item.reference_link}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
                    {/* Detail Item Button */}
                    <button
                      onClick={() => setSelectedDetailItem(item)}
                      className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800/40 transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Lihat Rincian & Tracking Lengkap Barang"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                      <span>Detail</span>
                    </button>

                    {/* Sourcing Input Button */}
                    <button
                      onClick={() => handleOpenSourcing(item)}
                      className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-[#1e232b] hover:bg-zinc-200 dark:hover:bg-[#282f3a] text-zinc-800 dark:text-zinc-200 text-xs font-bold border border-zinc-300 dark:border-[#2a323e] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{item.price_range_min ? 'Edit Sourcing' : 'Input Sourcing'}</span>
                    </button>

                    {/* Buy Execution Button */}
                    {item.lifecycle_status === 'pm_buy_approved' && (
                      <button
                        onClick={() => handleOpenPurchase(item)}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Eksekusi PO / Beli</span>
                      </button>
                    )}

                    {/* Delivery Status Update Button */}
                    {(item.lifecycle_status === 'purchased' || item.delivery_status === 'in_transit') && (
                      <button
                        onClick={() => handleOpenDelivery(item)}
                        className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Update Ekspedisi</span>
                      </button>
                    )}

                    {/* Defer Deficit Button */}
                    {item.lifecycle_status === 'validated' && (
                      <button
                        onClick={() => deferItemDeficit(item.id, 'Ditunda ke minggu depan karena defisit kas mingguan')}
                        className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
                        title="Tunda barang ke siklus berikutnya jika kas tidak mencukupi"
                      >
                        Tunda Defisit
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sourcing Modal */}
      {sourcingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-[#232830] pb-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Validasi Harga & Sourcing Pasar
              </h3>
              <button
                onClick={() => setSourcingItem(null)}
                className="text-zinc-400 hover:text-zinc-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSourcing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nama Barang & Dept
                </label>
                <div className="p-3 bg-zinc-100 dark:bg-[#0e1115] rounded-xl text-xs text-zinc-800 dark:text-zinc-200 font-semibold border border-zinc-200 dark:border-[#232830]">
                  {sourcingItem.custom_item_name || 'Barang Tambang'} &bull; Dept {sourcingItem.department_name} ({sourcingItem.quantity} {sourcingItem.unit})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Harga Min (Vendor A)
                  </label>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Harga Max (Vendor B)
                  </label>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Harga Satuan Terpilih (Deal / Acuan Final)
                </label>
                <input
                  type="number"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Link Referensi Vendor / Marketplace
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={refLink}
                  onChange={(e) => setRefLink(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-[#232830]">
                <button
                  type="button"
                  onClick={() => setSourcingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Simpan Sourcing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {purchaseModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-[#232830] pb-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Eksekusi Pembelian (Purchase Order)
              </h3>
              <button
                onClick={() => setPurchaseModalItem(null)}
                className="text-zinc-400 hover:text-zinc-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecutePurchase} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nama Vendor / Supplier
                </label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nomor Invoice / Kuitansi Fisik
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Bank Transfer (Mandiri)">Bank Transfer (Mandiri PT SMA)</option>
                  <option value="Petty Cash Site">Petty Cash Kas Lapangan</option>
                  <option value="Corporate Credit Card">Corporate Card</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Bukti Kuitansi / Faktur Pembelian:
                  </label>
                  <div className="flex items-center gap-1 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setReceiptUploadMode('file')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        receiptUploadMode === 'file'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Unggah File
                    </button>
                    <span className="text-zinc-400">|</span>
                    <button
                      type="button"
                      onClick={() => setReceiptUploadMode('url')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        receiptUploadMode === 'url'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      URL Gambar
                    </button>
                  </div>
                </div>

                {receiptUploadMode === 'file' ? (
                  <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 dark:border-[#2a323e] hover:border-emerald-500 rounded-xl p-4 cursor-pointer bg-zinc-50 dark:bg-[#0e1115] transition-colors">
                      <Upload className="w-6 h-6 text-zinc-400 mb-1" />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {receiptFileName ? receiptFileName : 'Pilih file kuitansi (JPG, PNG, PDF)'}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">
                        Klik untuk memilih dokumen invoice dari komputer
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <input
                    type="url"
                    placeholder="https://..."
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                )}

                {/* Proof Preview */}
                {receiptUrl && (
                  <div className="p-2 rounded-xl bg-zinc-100 dark:bg-[#181c22] border border-zinc-200 dark:border-[#262c36] flex items-center gap-3">
                    {receiptUrl.startsWith('data:application/pdf') ? (
                      <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                    ) : (
                      <img
                        src={receiptUrl}
                        alt="Preview Kuitansi"
                        className="w-12 h-12 rounded-lg object-cover border border-zinc-300 dark:border-[#2a323e] shrink-0"
                      />
                    )}
                    <div className="text-xs overflow-hidden flex-1">
                      <div className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {receiptFileName || 'Bukti Kuitansi / Faktur PO'}
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Siap dikirimkan ke antrean verifikasi Admin Finance</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-400">
                Total Biaya: <strong>{formatCurrency(purchaseModalItem.quantity * (purchaseModalItem.final_unit_price || 0))}</strong> akan memotong kuota kas mingguan dan masuk ke queue verifikasi Finance.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-[#232830]">
                <button
                  type="button"
                  onClick={() => setPurchaseModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Konfirmasi Pembelian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Update Modal */}
      {deliveryModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-[#232830] pb-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Update Status Pengiriman Ekspedisi
              </h3>
              <button
                onClick={() => setDeliveryModalItem(null)}
                className="text-zinc-400 hover:text-zinc-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDelivery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Status Ekspedisi
                </label>
                <select
                  value={newDeliveryStatus}
                  onChange={(e) => setNewDeliveryStatus(e.target.value as DeliveryStatusType)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="processing">Sedang Diproses Vendor / Packing</option>
                  <option value="in_transit">Dalam Perjalanan (In Transit ke Site)</option>
                  <option value="delivered">Tiba di Site Tambang</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Estimasi Tiba (ETA)
                </label>
                <input
                  type="date"
                  value={deliveryEta}
                  onChange={(e) => setDeliveryEta(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-[#232830]">
                <button
                  type="button"
                  onClick={() => setDeliveryModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                >
                  Simpan Status Ekspedisi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Item Detail Modal for Admin Logistik */}
      {selectedDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#14171c] rounded-2xl border border-zinc-200 dark:border-[#232830] shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-[#232830] flex items-center justify-between bg-zinc-50 dark:bg-[#101317]">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {routineItems.find((r) => r.id === selectedDetailItem.routine_item_id)?.item_code || 'NON-RUTIN'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Dept {selectedDetailItem.department_name}
                  </span>
                  <PriorityBadge level={selectedDetailItem.priority_level} showFull />
                  <LifecycleBadge status={selectedDetailItem.lifecycle_status} />
                </div>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                  {routineItems.find((r) => r.id === selectedDetailItem.routine_item_id)?.name || selectedDetailItem.custom_item_name || 'Barang Tambang'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#1c222a] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Stepper Tracking */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Progres 6-Tahap Siklus Pengadaan:
                </div>
                <LiveStepper
                  status={selectedDetailItem.lifecycle_status}
                  deliveryStatus={selectedDetailItem.delivery_status}
                  eta={selectedDetailItem.eta_delivery}
                  receivedAt={selectedDetailItem.received_at}
                />
              </div>

              {/* Technical Specifications */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Spesifikasi Teknis & Part Number:
                </h4>
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] text-xs text-zinc-800 dark:text-zinc-200">
                  {selectedDetailItem.specification ? (
                    <span className="font-medium">{selectedDetailItem.specification}</span>
                  ) : (
                    <span className="text-zinc-400 italic">Tidak ada spesifikasi teknis khusus yang disertakan oleh HOD.</span>
                  )}
                </div>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Panel 1: Sourcing & Pricing */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] space-y-2.5 text-xs">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 pb-1.5 border-b border-zinc-200 dark:border-[#232830] flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                    <span>Rincian Harga & Sourcing Pasar</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Kuantitas:</span>
                    <strong className="text-zinc-900 dark:text-white">{selectedDetailItem.quantity} {selectedDetailItem.unit}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Rentang Harga Sourcing:</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">
                      {formatCurrency(selectedDetailItem.price_range_min)} &ndash; {formatCurrency(selectedDetailItem.price_range_max)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Harga Satuan Deal:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(selectedDetailItem.final_unit_price || routineItems.find((r) => r.id === selectedDetailItem.routine_item_id)?.estimated_unit_price || 0)}
                    </strong>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-zinc-200 dark:border-[#232830]">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Total Estimasi Biaya:</span>
                    <strong className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(
                        (selectedDetailItem.quantity || 1) *
                          (selectedDetailItem.final_unit_price || routineItems.find((r) => r.id === selectedDetailItem.routine_item_id)?.estimated_unit_price || 0)
                      )}
                    </strong>
                  </div>
                  <div className="pt-2">
                    <span className="text-zinc-500 dark:text-zinc-400 block mb-1">Referensi / Vendor:</span>
                    {selectedDetailItem.reference_link ? (
                      selectedDetailItem.reference_link.startsWith('http') ? (
                        <a
                          href={selectedDetailItem.reference_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-500 hover:underline break-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span>{selectedDetailItem.reference_link}</span>
                        </a>
                      ) : (
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {selectedDetailItem.reference_link}
                        </span>
                      )
                    ) : (
                      <span className="text-zinc-400 italic">Belum ada referensi vendor tercatat</span>
                    )}
                  </div>
                </div>

                {/* Panel 2: Logistik & Ekspedisi */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#0e1115] border border-zinc-200 dark:border-[#232830] space-y-2.5 text-xs">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 pb-1.5 border-b border-zinc-200 dark:border-[#232830] flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                    <Truck className="w-4 h-4" />
                    <span>Status Ekspedisi & Approval</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Status Ekspedisi:</span>
                    <DeliveryBadge status={selectedDetailItem.delivery_status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Estimasi Tiba (ETA):</span>
                    <strong className="text-zinc-900 dark:text-white">
                      {formatDate(selectedDetailItem.eta_delivery)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Diterima di Warehouse:</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {selectedDetailItem.received_at ? formatDate(selectedDetailItem.received_at) : 'Menunggu Pengiriman'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Otorisasi Pembelian (PM):</span>
                    <span className={`font-bold ${selectedDetailItem.pm_buy_approval === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {selectedDetailItem.pm_buy_approval === 'approved' ? 'Disetujui Beli' : selectedDetailItem.pm_buy_approval}
                    </span>
                  </div>
                  {selectedDetailItem.receipt_notes && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-[#232830]">
                      <span className="text-zinc-500 dark:text-zinc-400 block mb-0.5">Catatan Penerimaan Site:</span>
                      <p className="italic text-zinc-700 dark:text-zinc-300">&ldquo;{selectedDetailItem.receipt_notes}&rdquo;</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-zinc-200 dark:border-[#232830] bg-zinc-50 dark:bg-[#101317] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const it = selectedDetailItem;
                    setSelectedDetailItem(null);
                    handleOpenSourcing(it);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-zinc-200 dark:bg-[#1e232b] hover:bg-zinc-300 dark:hover:bg-[#282f3a] text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Input / Edit Sourcing</span>
                </button>

                {selectedDetailItem.lifecycle_status === 'pm_buy_approved' && (
                  <button
                    type="button"
                    onClick={() => {
                      const it = selectedDetailItem;
                      setSelectedDetailItem(null);
                      handleOpenPurchase(it);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Eksekusi PO / Beli</span>
                  </button>
                )}

                {(selectedDetailItem.lifecycle_status === 'purchased' || selectedDetailItem.delivery_status === 'in_transit') && (
                  <button
                    type="button"
                    onClick={() => {
                      const it = selectedDetailItem;
                      setSelectedDetailItem(null);
                      handleOpenDelivery(it);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Update Ekspedisi</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-[#181c22] hover:bg-zinc-300 dark:hover:bg-[#222832] text-zinc-700 dark:text-zinc-300 text-xs font-bold cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import & Editable Review Modal */}
      {isImportModalOpen && (
        <ExcelImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}
    </div>
  );
}

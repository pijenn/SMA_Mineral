import * as XLSX from 'xlsx';
import {
  ProcurementPeriod,
  ProcurementRequestItem,
  RoutineItem,
  Department,
  UserProfile,
} from './types';
import { formatCurrency, formatDate } from './utils';

export type ApprovalSummaryScope = 'all' | 'buy_only' | 'urgency_only';

export interface DepartmentApprovalSummary {
  department_id: string;
  department_code: string;
  department_name: string;
  total_items_requested: number; // Count of distinct approved line items
  total_quantity: number; // Sum of quantities
  total_budget: number; // Total budget in IDR (quantity * unit price)
  items: ProcurementRequestItem[];
}

export interface SummaryCalculationResult {
  rows: DepartmentApprovalSummary[];
  grandTotalItems: number;
  grandTotalQuantity: number;
  grandTotalBudget: number;
  totalApprovedDepartments: number;
}

/**
 * Determines whether a procurement item is considered approved by PM based on filter scope
 */
export function isItemApprovedByPm(
  item: ProcurementRequestItem,
  scope: ApprovalSummaryScope = 'all'
): boolean {
  const isBuyApproved =
    item.pm_buy_approval === 'approved' ||
    item.lifecycle_status === 'pm_buy_approved' ||
    item.lifecycle_status === 'purchased' ||
    item.lifecycle_status === 'processing_delivery' ||
    item.lifecycle_status === 'in_transit' ||
    item.lifecycle_status === 'received_at_site';

  const isUrgencyApproved =
    item.pm_item_approval === 'approved' ||
    item.lifecycle_status === 'pm_item_approved';

  if (scope === 'buy_only') {
    return isBuyApproved;
  }
  if (scope === 'urgency_only') {
    return isUrgencyApproved;
  }

  // 'all' includes any item that has received PM approval (buy approval, item urgency approval, or post-approval lifecycle)
  return isBuyApproved || isUrgencyApproved;
}

/**
 * Summarizes approved request items grouped by department for the active period
 */
export function summarizeApprovedItemsByDepartment(options: {
  requestItems: ProcurementRequestItem[];
  departments: Department[];
  routineItems?: RoutineItem[];
  scope?: ApprovalSummaryScope;
  includeEmptyDepartments?: boolean;
}): SummaryCalculationResult {
  const {
    requestItems,
    departments,
    routineItems = [],
    scope = 'all',
    includeEmptyDepartments = false,
  } = options;

  // Filter approved items
  const approvedItems = requestItems.filter((item) => isItemApprovedByPm(item, scope));

  // Build department lookup map
  const deptMap: Record<string, Department> = {};
  departments.forEach((d) => {
    deptMap[d.id] = d;
    deptMap[d.code.toUpperCase()] = d;
  });

  // Group items by department
  const grouped: Record<string, ProcurementRequestItem[]> = {};

  // Initialize for all departments if includeEmptyDepartments is true
  if (includeEmptyDepartments) {
    departments.forEach((d) => {
      grouped[d.id] = [];
    });
  }

  approvedItems.forEach((item) => {
    // Resolve department ID
    let deptId = item.department_id || '';
    if (!deptId && item.department_code) {
      deptId = deptMap[item.department_code.toUpperCase()]?.id || '';
    }

    // Fallback key if not matched to existing department
    const key = deptId || item.department_code || item.department_name || 'UNKNOWN';
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });

  const rows: DepartmentApprovalSummary[] = [];
  let grandTotalItems = 0;
  let grandTotalQuantity = 0;
  let grandTotalBudget = 0;

  Object.entries(grouped).forEach(([key, items]) => {
    // Find department details
    const dept =
      deptMap[key] ||
      departments.find((d) => d.id === key || d.code.toUpperCase() === key.toUpperCase()) ||
      departments.find(
        (d) =>
          items[0]?.department_name &&
          d.name.toLowerCase() === items[0].department_name?.toLowerCase()
      );

    const firstItem = items[0];
    const deptId = dept?.id || key;
    const deptCode = dept?.code || firstItem?.department_code || 'DEPT';
    const deptName = dept?.name || firstItem?.department_name || `Departemen ${deptCode}`;

    const totalItems = items.length;
    let totalQty = 0;
    let totalCost = 0;

    items.forEach((it) => {
      const qty = it.quantity || 1;
      const routine = routineItems.find((r) => r.id === it.routine_item_id);
      const unitPrice =
        it.final_unit_price ||
        (it.estimated_total_price && it.quantity
          ? it.estimated_total_price / it.quantity
          : 0) ||
        routine?.estimated_unit_price ||
        0;

      totalQty += qty;
      totalCost += qty * unitPrice;
    });

    if (totalItems > 0 || includeEmptyDepartments) {
      rows.push({
        department_id: deptId,
        department_code: deptCode,
        department_name: deptName,
        total_items_requested: totalItems,
        total_quantity: totalQty,
        total_budget: totalCost,
        items,
      });

      grandTotalItems += totalItems;
      grandTotalQuantity += totalQty;
      grandTotalBudget += totalCost;
    }
  });

  // Sort rows: first by total_budget descending, then by department name
  rows.sort((a, b) => {
    if (b.total_budget !== a.total_budget) {
      return b.total_budget - a.total_budget;
    }
    return a.department_name.localeCompare(b.department_name);
  });

  const totalApprovedDepartments = rows.filter((r) => r.total_items_requested > 0).length;

  return {
    rows,
    grandTotalItems,
    grandTotalQuantity,
    grandTotalBudget,
    totalApprovedDepartments,
  };
}

export interface GenerateDepartmentExcelOptions {
  period: ProcurementPeriod;
  summaryRows: DepartmentApprovalSummary[];
  grandTotalItems: number;
  grandTotalQuantity: number;
  grandTotalBudget: number;
  currentUser?: UserProfile | null;
  scope?: ApprovalSummaryScope;
  routineItems?: RoutineItem[];
}

/**
 * Generates and triggers download of the Department Approval Summary Excel workbook
 * Sheet 1: "Ringkasan Departemen" with columns: DEPT NAME | TOTAL ITEM THEY REQUEST | TOTAL BUDGET
 * Sheet 2: "Rincian Barang Disetujui" with item-level audit details
 */
export function generateDepartmentApprovalExcel({
  period,
  summaryRows,
  grandTotalItems,
  grandTotalBudget,
  currentUser,
  scope = 'all',
  routineItems = [],
}: GenerateDepartmentExcelOptions): void {
  const wb = XLSX.utils.book_new();

  const scopeLabel =
    scope === 'buy_only'
      ? 'Otorisasi Pembelian (Buy Approved Only)'
      : scope === 'urgency_only'
      ? 'Persetujuan Urgensi (Item Urgency Approved Only)'
      : 'Semua Item Disetujui PM (Otorisasi Beli & Urgensi)';

  const formattedExportDate = formatDate(new Date().toISOString());

  // ==========================================
  // SHEET 1: RINGKASAN DEPARTEMEN
  // Columns: DEPT NAME | TOTAL ITEM THEY REQUEST | TOTAL BUDGET
  // ==========================================
  const summaryAoa: (string | number)[][] = [
    ['PT SUMBER MINERAL ABADI - PAM MINERAL GROUP'],
    ['REKAPITULASI ITEM PERMOHONAN DISETUJUI PROJECT MANAGER (PM)'],
    [`Periode: ${period.period_name || `Minggu ke-${period.week_number} (${period.year})`}`],
    [`Rentang Waktu: ${formatDate(period.start_date)} s/d ${formatDate(period.end_date)}`],
    [`Kriteria Approval: ${scopeLabel}`],
    [`Tanggal Unduh: ${formattedExportDate} | PM: ${currentUser?.full_name || 'Bambang Wijaya, S.T.'}`],
    [], // Blank separator row
    // EXACT REQUESTED COLUMNS:
    ['DEPT NAME', 'TOTAL ITEM THEY REQUEST', 'TOTAL BUDGET'],
  ];

  // Populate data rows for Sheet 1
  summaryRows.forEach((row) => {
    summaryAoa.push([
      `[${row.department_code}] ${row.department_name}`,
      row.total_items_requested,
      row.total_budget,
    ]);
  });

  // Grand Total Row
  summaryAoa.push(['GRAND TOTAL', grandTotalItems, grandTotalBudget]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);

  // Set column widths for clean readability
  wsSummary['!cols'] = [
    { wch: 38 }, // DEPT NAME
    { wch: 28 }, // TOTAL ITEM THEY REQUEST
    { wch: 24 }, // TOTAL BUDGET
  ];

  // Apply cell formatting for currency and numbers
  // Header is at row index 7 (0-indexed)
  const headerRowIdx = 7;
  const startDataRowIdx = headerRowIdx + 1;
  const totalRowsCount = summaryRows.length;

  for (let i = 0; i < totalRowsCount; i++) {
    const rowNum = startDataRowIdx + i + 1; // 1-indexed in Excel (e.g. 9)

    // Col B: TOTAL ITEM THEY REQUEST (number)
    const cellB = wsSummary[`B${rowNum}`];
    if (cellB && typeof cellB.v === 'number') {
      cellB.t = 'n';
      cellB.z = '#,##0';
    }

    // Col C: TOTAL BUDGET (currency IDR)
    const cellC = wsSummary[`C${rowNum}`];
    if (cellC && typeof cellC.v === 'number') {
      cellC.t = 'n';
      cellC.z = '"Rp "#,##0';
      cellC.w = formatCurrency(cellC.v);
    }
  }

  // Grand Total row formatting
  const grandTotalRowExcel = startDataRowIdx + totalRowsCount + 1;
  const grandCellB = wsSummary[`B${grandTotalRowExcel}`];
  if (grandCellB && typeof grandCellB.v === 'number') {
    grandCellB.t = 'n';
    grandCellB.z = '#,##0';
  }
  const grandCellC = wsSummary[`C${grandTotalRowExcel}`];
  if (grandCellC && typeof grandCellC.v === 'number') {
    grandCellC.t = 'n';
    grandCellC.z = '"Rp "#,##0';
    grandCellC.w = formatCurrency(grandCellC.v);
  }

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Departemen');

  // ==========================================
  // SHEET 2: RINCIAN BARANG DISETUJUI (ITEMIZED AUDIT SHEET)
  // Complete line-item breakdown supporting the summary
  // ==========================================
  const detailAoa: (string | number)[][] = [
    ['PT SUMBER MINERAL ABADI - PAM MINERAL GROUP'],
    ['RINCIAN ITEM BARANG PERMOHONAN DISETUJUI PROJECT MANAGER (PM)'],
    [`Periode: ${period.period_name || `Minggu ke-${period.week_number} (${period.year})`}`],
    [`Kriteria Approval: ${scopeLabel}`],
    [],
    [
      'NO',
      'KODE DEPT',
      'NAMA DEPARTEMEN',
      'NAMA BARANG',
      'SPESIFIKASI',
      'KATEGORI',
      'PRIORITAS',
      'JUMLAH (QTY)',
      'SATUAN',
      'HARGA SATUAN (IDR)',
      'TOTAL BIAYA (IDR)',
      'STATUS APPROVAL PM',
      'STATUS LOGISTIK',
      'CATATAN PM',
    ],
  ];

  let itemSequence = 1;
  summaryRows.forEach((row) => {
    row.items.forEach((item) => {
      const routine = routineItems.find((r) => r.id === item.routine_item_id);
      const itemName = item.custom_item_name || routine?.name || 'Barang Tambang';
      const spec = item.specification || routine?.specification || '-';
      const category = item.item_type === 'routine' ? 'Rutin' : 'Tambahan';
      const priority =
        item.priority_level === 3
          ? 'Level 3 (Urgent)'
          : item.priority_level === 2
          ? 'Level 2 (Medium)'
          : 'Level 1 (Normal)';
      const qty = item.quantity || 1;
      const unitPrice =
        item.final_unit_price ||
        (item.estimated_total_price && item.quantity
          ? item.estimated_total_price / item.quantity
          : routine?.estimated_unit_price || 0);
      const totalCost = qty * unitPrice;

      const pmStatus =
        item.pm_buy_approval === 'approved'
          ? 'Otorisasi PM & Proses Checkout'
          : item.pm_item_approval === 'approved'
          ? 'Urgensi Item Disetujui'
          : 'Disetujui PM';

      const logStatus =
        item.lifecycle_status === 'purchased'
          ? 'Telah Dibeli'
          : item.lifecycle_status === 'processing_delivery'
          ? 'Proses Pengiriman'
          : item.lifecycle_status === 'in_transit'
          ? 'Dalam Ekspedisi'
          : item.lifecycle_status === 'received_at_site'
          ? 'Diterima di Site'
          : 'Siap Pembelian (PO)';

      const notes = item.pm_buy_approval_notes || item.pm_item_approval_notes || '-';

      detailAoa.push([
        itemSequence++,
        row.department_code,
        row.department_name,
        itemName,
        spec,
        category,
        priority,
        qty,
        item.unit || 'pcs',
        unitPrice,
        totalCost,
        pmStatus,
        logStatus,
        notes,
      ]);
    });
  });

  // Total row on Sheet 2
  detailAoa.push([
    'TOTAL',
    '',
    '',
    `${itemSequence - 1} Item Disetujui`,
    '',
    '',
    '',
    summaryRows.reduce((acc, r) => acc + r.total_quantity, 0),
    '',
    '',
    grandTotalBudget,
    '',
    '',
    '',
  ]);

  const wsDetail = XLSX.utils.aoa_to_sheet(detailAoa);

  wsDetail['!cols'] = [
    { wch: 6 }, // NO
    { wch: 14 }, // KODE DEPT
    { wch: 28 }, // NAMA DEPARTEMEN
    { wch: 32 }, // NAMA BARANG
    { wch: 28 }, // SPESIFIKASI
    { wch: 12 }, // KATEGORI
    { wch: 18 }, // PRIORITAS
    { wch: 14 }, // JUMLAH
    { wch: 10 }, // SATUAN
    { wch: 20 }, // HARGA SATUAN
    { wch: 22 }, // TOTAL BIAYA
    { wch: 24 }, // STATUS APPROVAL PM
    { wch: 20 }, // STATUS LOGISTIK
    { wch: 30 }, // CATATAN PM
  ];

  // Detail sheet formatting
  const detailHeaderIdx = 5;
  const detailStartDataIdx = detailHeaderIdx + 1;
  const totalDetailItems = itemSequence - 1;

  for (let i = 0; i < totalDetailItems; i++) {
    const rowNum = detailStartDataIdx + i + 1;

    // Col H (JUMLAH QTY)
    const cellH = wsDetail[`H${rowNum}`];
    if (cellH && typeof cellH.v === 'number') {
      cellH.t = 'n';
      cellH.z = '#,##0';
    }

    // Col J (HARGA SATUAN)
    const cellJ = wsDetail[`J${rowNum}`];
    if (cellJ && typeof cellJ.v === 'number') {
      cellJ.t = 'n';
      cellJ.z = '"Rp "#,##0';
      cellJ.w = formatCurrency(cellJ.v);
    }

    // Col K (TOTAL BIAYA)
    const cellK = wsDetail[`K${rowNum}`];
    if (cellK && typeof cellK.v === 'number') {
      cellK.t = 'n';
      cellK.z = '"Rp "#,##0';
      cellK.w = formatCurrency(cellK.v);
    }
  }

  // Detail Total Row
  const detailTotalRowExcel = detailStartDataIdx + totalDetailItems + 1;
  const detailTotalCellK = wsDetail[`K${detailTotalRowExcel}`];
  if (detailTotalCellK && typeof detailTotalCellK.v === 'number') {
    detailTotalCellK.t = 'n';
    detailTotalCellK.z = '"Rp "#,##0';
    detailTotalCellK.w = formatCurrency(detailTotalCellK.v);
  }

  XLSX.utils.book_append_sheet(wb, wsDetail, 'Rincian Barang Disetujui');

  // ==========================================
  // BROWSER DOWNLOAD EXECUTION (BLOB & LINK)
  // ==========================================
  const sanitizedPeriodName = (period.period_name || `Minggu_${period.week_number}_${period.year}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 30);

  const fileName = `REKAP_APPROVAL_PM_${sanitizedPeriodName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Failed to trigger Excel download:', err);
    // Fallback using XLSX.writeFile if Blob fails in older environment
    XLSX.writeFile(wb, fileName);
  }
}

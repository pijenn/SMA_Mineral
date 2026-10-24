import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ProcurementPeriod,
  FinanceWeeklyReport,
  PurchaseTransaction,
  ProcurementRequestItem,
  RoutineItem,
  Department,
  UserProfile,
} from './types';
import { formatCurrency, formatDate, cleanSystemNotes } from './utils';

export interface GenerateWeeklyReportPdfOptions {
  period: ProcurementPeriod;
  financeReport: FinanceWeeklyReport;
  transactions: PurchaseTransaction[];
  requestItems: ProcurementRequestItem[];
  routineItems?: RoutineItem[];
  departments?: Department[];
  currentUser?: UserProfile | null;
}

export function generateWeeklyReportPdf({
  period,
  financeReport,
  transactions,
  requestItems,
  routineItems = [],
  departments = [],
  currentUser,
}: GenerateWeeklyReportPdfOptions): void {
  // Initialize PDF document (A4 portrait, mm units)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // 1. Filter Purchased / Realized Items
  let purchasedItems = requestItems.filter((item) => {
    const isPurchasedStatus =
      item.lifecycle_status === 'purchased' ||
      item.lifecycle_status === 'processing_delivery' ||
      item.lifecycle_status === 'in_transit' ||
      item.lifecycle_status === 'received_at_site';
    const hasDelivery = item.delivery_status && item.delivery_status !== 'none';
    return isPurchasedStatus || hasDelivery;
  });

  // If no items are officially marked purchased yet (e.g. initial demo/test), fallback to PM buy-approved items
  let isApprovedFallback = false;
  if (purchasedItems.length === 0) {
    const approved = requestItems.filter(
      (item) => item.pm_buy_approval === 'approved' || item.lifecycle_status === 'pm_buy_approved'
    );
    if (approved.length > 0) {
      purchasedItems = approved;
      isApprovedFallback = true;
    }
  }

  // Calculate Financials
  const totalDisbursed = period.disbursed_budget || 0;
  const rolloverBalance = period.previous_rollover_balance || 0;
  const totalAvailable = totalDisbursed + rolloverBalance;

  const itemsTotal = purchasedItems.reduce((acc, item) => {
    const price = item.final_unit_price || 0;
    const qty = item.quantity || 1;
    return acc + qty * price;
  }, 0);

  const txTotal = transactions.reduce((acc, tx) => acc + (tx.total_amount || 0), 0);
  // Use transaction total if available, otherwise items total
  const grandTotal = txTotal > 0 ? txTotal : itemsTotal;
  const remainingCash = totalAvailable - grandTotal;
  const isSurplus = remainingCash >= 0;

  // Generate Reference Number
  const reportRefNo = `SMA/FIN-PM/${period.year}/W${String(period.week_number).padStart(2, '0')}/${Date.now().toString().slice(-4)}`;
  const printDate = formatDate(new Date().toISOString());

  // --------------------------------------------------------------------------
  // HEADER SECTION (Kop Surat Resmi PT Sumber Mineral Abadi)
  // --------------------------------------------------------------------------
  let currentY = 14;

  // Company Brand Box Accent
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(marginX, currentY, 3.5, 16, 'F');

  // Company Name & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('PT SUMBER MINERAL ABADI', marginX + 6, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('PAM MINERAL TBK GROUP  —  OPERASIONAL SITE PERTAMBANGAN NIKEL', marginX + 6, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(
    'Site Office: Kolaka & Pomalaa, Sulawesi Tenggara | Head Office: Sudirman Central Business District, Jakarta',
    marginX + 6,
    currentY + 14.5
  );

  // Right Header Info (Doc Ref & Print Date)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(reportRefNo, pageWidth - marginX, currentY + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Tanggal Terbit: ${printDate}`, pageWidth - marginX, currentY + 10, { align: 'right' });

  // Status Badge in Header
  const statusLabel =
    financeReport.status === 'approved_by_pm'
      ? 'STATUS: APPROVED BY PM'
      : financeReport.status === 'submitted_by_finance'
      ? 'STATUS: VERIFIED BY FINANCE'
      : 'STATUS: DRAFT LAPORAN';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  if (financeReport.status === 'approved_by_pm') {
    doc.setTextColor(5, 150, 105);
  } else {
    doc.setTextColor(217, 119, 6);
  }
  doc.text(statusLabel, pageWidth - marginX, currentY + 14.5, { align: 'right' });

  currentY += 19;

  // Dual Header Divider Line
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setLineWidth(1.2);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY + 1.5, pageWidth - marginX, currentY + 1.5);

  currentY += 6;

  // --------------------------------------------------------------------------
  // TITLE SECTION
  // --------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN MINGGUAN REALISASI PENGADAAN & KEUANGAN', pageWidth / 2, currentY + 2, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'INVOICE & EXPENDITURE SUMMARY DENGAN REKAPITULASI SISA KAS / SURPLUS',
    pageWidth / 2,
    currentY + 6.5,
    { align: 'center' }
  );

  // Period Ribbon
  currentY += 10;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(marginX, currentY, contentWidth, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  const periodRange = `${formatDate(period.start_date)} s/d ${formatDate(period.end_date)}`;
  const periodTitle = `PERIODE: MINGGU KE-${period.week_number} (${period.period_name || `Tahun ${period.year}`}) | RENTANG TANGGAL: ${periodRange}`;
  doc.text(periodTitle, pageWidth / 2, currentY + 4.8, { align: 'center' });

  currentY += 11;

  // --------------------------------------------------------------------------
  // FINANCIAL OVERVIEW & SURPLUS SUMMARY (3-COLUMN KPI BOXES)
  // --------------------------------------------------------------------------
  const colGap = 4;
  const colWidth = (contentWidth - colGap * 2) / 3;
  const boxHeight = 22;

  // Box 1: Kas Tersedia (Pencairan + Rollover)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, colWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL KAS TERSEDIA', marginX + 4, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(totalAvailable), marginX + 4, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Pencairan: ${formatCurrency(totalDisbursed)}`, marginX + 4, currentY + 16);
  doc.text(`Rollover Lalu: ${formatCurrency(rolloverBalance)}`, marginX + 4, currentY + 19.5);

  // Box 2: Total Realisasi Belanja (Grand Total Pengadaan)
  const col2X = marginX + colWidth + colGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(col2X, currentY, colWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('GRAND TOTAL PENGELUARAN', col2X + 4, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(220, 38, 38); // red-600
  doc.text(formatCurrency(grandTotal), col2X + 4, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Item: ${purchasedItems.length} Pengadaan`, col2X + 4, currentY + 16);
  doc.text(`Total PO / Transaksi: ${transactions.length} Faktur`, col2X + 4, currentY + 19.5);

  // Box 3: Posisi Saldo Kas (SURPLUS / DEFISIT)
  const col3X = marginX + (colWidth + colGap) * 2;
  if (isSurplus) {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
  } else {
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(254, 202, 202); // red-200
  }
  doc.roundedRect(col3X, currentY, colWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  if (isSurplus) {
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('POSISI KAS: SURPLUS', col3X + 4, currentY + 5);
  } else {
    doc.setTextColor(220, 38, 38); // red-600
    doc.text('POSISI KAS: DEFISIT', col3X + 4, currentY + 5);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  if (isSurplus) {
    doc.setTextColor(5, 150, 105);
    doc.text(`+ ${formatCurrency(remainingCash)}`, col3X + 4, currentY + 11);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text(`- ${formatCurrency(Math.abs(remainingCash))}`, col3X + 4, currentY + 11);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  if (isSurplus) {
    doc.setTextColor(5, 150, 105);
    doc.text('Tersedia untuk rollover / backlog', col3X + 4, currentY + 16);
    doc.text('Kas operasional dalam kondisi likuid', col3X + 4, currentY + 19.5);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text('Pengeluaran melebihi anggaran', col3X + 4, currentY + 16);
    doc.text('Membutuhkan injeksi kas tambahan', col3X + 4, currentY + 19.5);
  }

  currentY += boxHeight + 6;

  // --------------------------------------------------------------------------
  // TABLE 1: RINCIAN BARANG YANG DIBELI (PURCHASED ITEMS INVOICE TABLE)
  // --------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const tableTitle = isApprovedFallback
    ? 'DAFTAR ITEM PENGADAAN (OTORISASI PM & PROSES CHECKOUT)'
    : 'RINCIAN REALISASI PEMBELIAN BARANG (WEEKLY INVOICE ITEMS)';
  doc.text(tableTitle, marginX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Rincian barang yang dibeli berdasarkan permohonan departemen operasional tambang PT SMA.',
    marginX,
    currentY + 4
  );

  currentY += 6;

  // Prepare autoTable Rows
  const tableBody =
    purchasedItems.length === 0
      ? [
          [
            '1',
            'Semua Dept',
            'Belum ada transaksi realisasi pembelian pada periode ini.',
            '-',
            '-',
            'Rp 0',
          ],
        ]
      : purchasedItems.map((item, idx) => {
          const routine = routineItems.find((r) => r.id === item.routine_item_id);
          const itemName = item.custom_item_name || routine?.name || 'Barang Tambang';
          const spec = item.specification ? `\nSpek: ${item.specification}` : '';
          const fullName = `${itemName}${spec}`;

          const deptCode = item.department_code || (item.department_id ? departments.find((d) => d.id === item.department_id)?.code : 'DEPT');
          const deptName = item.department_name || departments.find((d) => d.id === item.department_id)?.name || 'Departemen';
          const deptDisplay = `[${deptCode}] ${deptName}`;

          const qty = `${item.quantity || 1} ${item.unit || 'pcs'}`;
          const unitPrice = formatCurrency(item.final_unit_price || 0);
          const subtotal = formatCurrency((item.quantity || 1) * (item.final_unit_price || 0));

          return [String(idx + 1), deptDisplay, fullName, qty, unitPrice, subtotal];
        });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'No',
        'Departemen Pemohon',
        'Nama Barang & Spesifikasi Teknis',
        'Kuantitas',
        'Harga Satuan',
        'Subtotal (Rp)',
      ],
    ],
    body: tableBody,
    foot: [
      [
        '',
        '',
        'GRAND TOTAL PENGELUARAN REALISASI PENGADAAN',
        `${purchasedItems.length} Item`,
        '',
        formatCurrency(grandTotal),
      ],
    ],
    theme: 'grid',
    margin: { left: marginX, right: marginX },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
      cellPadding: 2.5,
    },
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 64 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
  });

  // Position after table 1
  currentY = (doc as any).lastAutoTable.finalY + 7;

  // --------------------------------------------------------------------------
  // TABLE 2: REKAPITULASI FAKTUR / TRANSAKSI PO (Jika Tersedia)
  // --------------------------------------------------------------------------
  if (transactions && transactions.length > 0) {
    // Check if we have enough room on page for transactions table + signatures
    if (currentY > pageHeight - 80) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('DAFTAR TRANSAKSI PO & VENDOR (PURCHASE ORDERS)', marginX, currentY);

    currentY += 3.5;

    const txBody = transactions.map((tx, idx) => [
      String(idx + 1),
      tx.transaction_code,
      tx.vendor_name,
      formatDate(tx.purchase_date),
      (tx.payment_method || 'Cash').toUpperCase(),
      (tx.proofs && tx.proofs.length > 0)
        ? `${tx.proofs.length} Kuitansi (OK)`
        : 'Nota Fisik',
      formatCurrency(tx.total_amount),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          'No',
          'Nomor PO / Transaksi',
          'Nama Vendor / Toko',
          'Tanggal',
          'Metode',
          'Status Bukti',
          'Nilai Transaksi',
        ],
      ],
      body: txBody,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
        cellPadding: 2,
      },
      styles: {
        fontSize: 6.5,
        cellPadding: 1.8,
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 38, fontStyle: 'bold' },
        2: { cellWidth: 44 },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 24, halign: 'center' },
        6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // --------------------------------------------------------------------------
  // SIGNATURE / APPROVAL SIGN-OFF BLOCK
  // --------------------------------------------------------------------------
  // Check if we need a new page for signatures (need at least 45mm)
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 20;
  }

  const sigBoxWidth = (contentWidth - 10) / 2;
  const sigBoxHeight = 36;

  // Left Box: Finance & Accounting
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, sigBoxWidth, sigBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Diverifikasi & Dibuat Oleh:', marginX + 4, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Finance & Accounting Department', marginX + 4, currentY + 9);

  // Digital verification badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(5, 150, 105);
  doc.text('[TERVERIFIKASI SISTEM FINANCE]', marginX + 4, currentY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Siti Nurhaliza, S.E.', marginX + 4, currentY + 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Finance & Treasury Supervisor', marginX + 4, currentY + 32);

  // Right Box: Project Manager
  const sigRightX = marginX + sigBoxWidth + 10;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(sigRightX, currentY, sigBoxWidth, sigBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Disetujui & Diotorisasi Oleh:', sigRightX + 4, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Project Manager / Kepala Teknik Tambang (KTT)', sigRightX + 4, currentY + 9);

  // PM Authorization Stamp
  const pmApproved = financeReport.status === 'approved_by_pm';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  if (pmApproved) {
    doc.setTextColor(5, 150, 105);
    doc.text('[DISETUJUI & DIOTORISASI PM]', sigRightX + 4, currentY + 20);
  } else {
    doc.setTextColor(217, 119, 6);
    doc.text('[MENUNGGU OTORISASI PM]', sigRightX + 4, currentY + 20);
  }

  const pmName = currentUser?.full_name || 'Bambang Wijaya, S.T.';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(pmName, sigRightX + 4, currentY + 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Project Manager PT Sumber Mineral Abadi', sigRightX + 4, currentY + 32);

  // --------------------------------------------------------------------------
  // RUNNING FOOTER ON ALL PAGES
  // --------------------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);

    // Left Footer
    doc.text(
      `PT Sumber Mineral Abadi — Laporan Realisasi Mingguan (Minggu ke-${period.week_number})`,
      marginX,
      pageHeight - 7
    );

    // Center Footer
    doc.text('DOKUMEN RAHASIA & RESMI PERUSAHAAN', pageWidth / 2, pageHeight - 7, {
      align: 'center',
    });

    // Right Footer
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - marginX, pageHeight - 7, {
      align: 'right',
    });
  }

  // --------------------------------------------------------------------------
  // SAVE PDF FILE
  // --------------------------------------------------------------------------
  const fileName = `Laporan_Mingguan_Finance_W${period.week_number}_${period.year}_PT_SMA.pdf`;
  doc.save(fileName);
}

/**
 * Helper to resolve the 12 operational departments for the per-department PDF report
 */
function resolveTwelveDepartments(
  departments: Department[],
  requestItems: ProcurementRequestItem[]
): Department[] {
  const FALLBACK_12_DEPTS: Department[] = [
    { id: '325fbac3-295b-46b7-b06f-da2c16bf8204', code: 'GEOLOGY', name: 'Geology & Exploration' },
    { id: '81897f36-5651-4008-8369-0a6e59fb6093', code: 'PROCESSING', name: 'Ore Processing & Stockpile' },
    { id: 'cca03d07-f1d7-4450-9445-135275a26ca0', code: 'MAINTENANCE', name: 'Plant & Equipment Maintenance' },
    { id: 'fa312f2e-612c-4f36-957d-612c3d4b5f97', code: 'HSE', name: 'Health, Safety & Environment' },
    { id: 'a933ae0c-6748-491a-930c-5f1cda393d73', code: 'LOGISTICS', name: 'Logistics & Supply Chain' },
    { id: '0c1b39fb-9eeb-4d8d-8bf9-ba3740ff33a4', code: 'FINANCE', name: 'Finance & Accounting' },
    { id: '4768d320-0e9d-4a65-a742-97de51cab156', code: 'HRGA', name: 'HR & General Affairs' },
    { id: 'e85ab2e7-bb37-4a4a-a5fa-f32dbdb3d91b', code: 'LEGAL', name: 'Legal & External Relations' },
    { id: '0f022291-0155-42b9-81a2-a42ba40dcb20', code: 'ENG', name: 'Engineering' },
    { id: '2272d2c7-029a-441e-b45b-78ecc9a92c28', code: 'FOREST', name: 'Forestry' },
    { id: 'c5b63123-b3a5-4b39-909d-48a31f99b741', code: 'PROD', name: 'Mining & Operations' },
    { id: 'a66d13c6-4870-43fc-90ce-406a15d1efcd', code: 'CIVIL', name: 'Civil & Infrastructure' },
  ];

  const sourceDepts = departments && departments.length > 0 ? departments : FALLBACK_12_DEPTS;
  if (sourceDepts.length === 12) {
    return sourceDepts;
  }

  if (sourceDepts.length > 12) {
    // Keep all departments that have items, and if 13 depts exist where HAULING has 0 items, exclude empty extra dept to keep 12
    const deptIdsWithItems = new Set(requestItems.map((i) => i.department_id).filter(Boolean));
    const deptCodesWithItems = new Set(requestItems.map((i) => (i.department_code || '').toUpperCase()).filter(Boolean));
    const filtered = sourceDepts.filter((d) => {
      if (deptIdsWithItems.has(d.id) || deptCodesWithItems.has(d.code.toUpperCase())) return true;
      return d.code.toUpperCase() !== 'HAULING';
    });
    if (filtered.length >= 12) {
      return filtered.slice(0, Math.max(12, deptIdsWithItems.size));
    }
  }

  // Pad to 12 if fewer than 12
  const result = [...sourceDepts];
  for (const fb of FALLBACK_12_DEPTS) {
    if (result.length >= 12) break;
    if (!result.some((d) => d.code.toUpperCase() === fb.code.toUpperCase())) {
      result.push(fb);
    }
  }
  return result;
}

/**
 * Generates and downloads a comprehensive PDF report separated by Department (12 Departments in total)
 * allowing the Project Manager to view each department's expenses in detail.
 */
export function generateDepartmentExpensesPdf({
  period,
  financeReport,
  transactions,
  requestItems,
  routineItems = [],
  departments = [],
  currentUser,
}: GenerateWeeklyReportPdfOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // Resolve the 12 operational departments
  const twelveDepts = resolveTwelveDepartments(departments, requestItems);

  // Filter active/valid items for expense calculation (exclude rejected items)
  const validItems = requestItems.filter(
    (item) =>
      item.lifecycle_status !== 'pm_item_rejected' &&
      item.pm_item_approval !== 'rejected' &&
      item.lifecycle_status !== 'deferred_deficit' &&
      item.lifecycle_status !== 'deferred_next_week'
  );

  // Group items per department
  const deptGroups = twelveDepts.map((dept, index) => {
    const items = validItems.filter((item) => {
      if (item.department_id && item.department_id === dept.id) return true;
      if (item.department_code && item.department_code.toUpperCase() === dept.code.toUpperCase()) return true;
      if (item.department_name && item.department_name.trim().toLowerCase() === dept.name.trim().toLowerCase()) return true;
      return false;
    });

    const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
    const totalExpense = items.reduce((sum, it) => {
      const routine = routineItems.find((r) => r.id === it.routine_item_id);
      const unitPrice = Number(it.final_unit_price ?? routine?.estimated_unit_price ?? 0);
      const qty = Number(it.quantity) || 1;
      return sum + qty * unitPrice;
    }, 0);

    return {
      index: index + 1,
      department: dept,
      items,
      itemCount: items.length,
      totalQuantity,
      totalExpense,
    };
  });

  const grandTotalItems = deptGroups.reduce((sum, g) => sum + g.itemCount, 0);
  const grandTotalQty = deptGroups.reduce((sum, g) => sum + g.totalQuantity, 0);
  const grandTotalExpense = deptGroups.reduce((sum, g) => sum + g.totalExpense, 0);
  const activeDeptCount = deptGroups.filter((g) => g.itemCount > 0).length;

  const totalDisbursed = period.disbursed_budget || 0;
  const rolloverBalance = period.previous_rollover_balance || 0;
  const totalAvailable = totalDisbursed + rolloverBalance;
  const remainingCash = totalAvailable - grandTotalExpense;
  const isSurplus = remainingCash >= 0;

  const reportRefNo = `SMA/PM-DEPT/${period.year}/W${String(period.week_number).padStart(2, '0')}/${Date.now().toString().slice(-4)}`;
  const printDate = formatDate(new Date().toISOString());

  // --------------------------------------------------------------------------
  // HEADER SECTION (Kop Surat Resmi PT Sumber Mineral Abadi)
  // --------------------------------------------------------------------------
  let currentY = 14;

  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(marginX, currentY, 3.5, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('PT SUMBER MINERAL ABADI', marginX + 6, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('PAM MINERAL TBK GROUP  —  LAPORAN PENGELUARAN PER DEPARTEMEN (12 DEPT)', marginX + 6, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Site Office: Kolaka & Pomalaa, Sulawesi Tenggara | Head Office: Sudirman Central Business District, Jakarta',
    marginX + 6,
    currentY + 14.5
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(reportRefNo, pageWidth - marginX, currentY + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Tanggal Terbit: ${printDate}`, pageWidth - marginX, currentY + 10, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(5, 150, 105);
  doc.text(`CAKUPAN: ${twelveDepts.length} DEPARTEMEN OPERASIONAL`, pageWidth - marginX, currentY + 14.5, {
    align: 'right',
  });

  currentY += 19;

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(1.2);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY + 1.5, pageWidth - marginX, currentY + 1.5);

  currentY += 6;

  // --------------------------------------------------------------------------
  // TITLE SECTION
  // --------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'LAPORAN PENGELUARAN & REALISASI PENGADAAN PER DEPARTEMEN',
    pageWidth / 2,
    currentY + 2,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `RINCIAN BIAYA PENGADAAN TERPISAH UNTUK SELURUH ${twelveDepts.length} DEPARTEMEN OPERASIONAL PT SMA`,
    pageWidth / 2,
    currentY + 6.5,
    { align: 'center' }
  );

  // Period Ribbon
  currentY += 10;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, currentY, contentWidth, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  const periodRange = `${formatDate(period.start_date)} s/d ${formatDate(period.end_date)}`;
  const periodTitle = `PERIODE: MINGGU KE-${period.week_number} (${period.period_name || `Tahun ${period.year}`}) | RENTANG TANGGAL: ${periodRange}`;
  doc.text(periodTitle, pageWidth / 2, currentY + 4.8, { align: 'center' });

  currentY += 10;

  // --------------------------------------------------------------------------
  // 3-COLUMN KPI SUMMARY BOXES
  // --------------------------------------------------------------------------
  const colGap = 4;
  const colWidth = (contentWidth - colGap * 2) / 3;
  const boxHeight = 20;

  // Box 1: Total Kas Tersedia
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, colWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL KAS TERSEDIA', marginX + 4, currentY + 4.8);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(totalAvailable), marginX + 4, currentY + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(100, 116, 139);
  doc.text(`Pencairan: ${formatCurrency(totalDisbursed)}`, marginX + 4, currentY + 15);
  doc.text(`Rollover: ${formatCurrency(rolloverBalance)}`, marginX + 4, currentY + 18.2);

  // Box 2: Total Pengeluaran 12 Departemen
  const col2X = marginX + colWidth + colGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(col2X, currentY, colWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`TOTAL PENGELUARAN (${twelveDepts.length} DEPT)`, col2X + 4, currentY + 4.8);
  doc.setFontSize(10);
  doc.setTextColor(220, 38, 38);
  doc.text(formatCurrency(grandTotalExpense), col2X + 4, currentY + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Item: ${grandTotalItems} Item (${grandTotalQty} Unit)`, col2X + 4, currentY + 15);
  doc.text(`Departemen Aktif Belanja: ${activeDeptCount} dari ${twelveDepts.length} Dept`, col2X + 4, currentY + 18.2);

  // Box 3: Sisa Saldo Kas
  const col3X = marginX + (colWidth + colGap) * 2;
  if (isSurplus) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
  } else {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
  }
  doc.roundedRect(col3X, currentY, colWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(isSurplus ? 5 : 220, isSurplus ? 150 : 38, isSurplus ? 105 : 38);
  doc.text(isSurplus ? 'ESTIMASI SISA KAS: SURPLUS' : 'ESTIMASI SISA KAS: DEFISIT', col3X + 4, currentY + 4.8);
  doc.setFontSize(10);
  doc.text(
    isSurplus ? `+ ${formatCurrency(remainingCash)}` : `- ${formatCurrency(Math.abs(remainingCash))}`,
    col3X + 4,
    currentY + 10.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.text(
    isSurplus ? 'Anggaran mencukupi seluruh dept' : 'Pengeluaran melebihi kas tersedia',
    col3X + 4,
    currentY + 15
  );
  doc.text(`Otorisasi: ${currentUser?.full_name || 'Project Manager'}`, col3X + 4, currentY + 18.2);

  currentY += boxHeight + 6;

  // --------------------------------------------------------------------------
  // EXECUTIVE SUMMARY TABLE: REKAPITULASI 12 DEPARTEMEN
  // --------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`I. RINGKASAN EKSEKUTIF PENGELUARAN ${twelveDepts.length} DEPARTEMEN OPERASIONAL`, marginX, currentY);

  currentY += 3;

  const summaryTableBody = deptGroups.map((g) => {
    const pct = grandTotalExpense > 0 ? `${((g.totalExpense / grandTotalExpense) * 100).toFixed(1)}%` : '0.0%';
    return [
      String(g.index),
      g.department.code,
      g.department.name.trim(),
      `${g.itemCount} Item`,
      `${g.totalQuantity} Unit`,
      formatCurrency(g.totalExpense),
      pct,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'No',
        'Kode Dept',
        'Nama Departemen Operasional',
        'Jumlah Item',
        'Total Qty',
        'Total Pengeluaran (Rp)',
        '% Porsi',
      ],
    ],
    body: summaryTableBody,
    foot: [
      [
        '',
        '',
        `GRAND TOTAL PENGELUARAN (${twelveDepts.length} DEPARTEMEN)`,
        `${grandTotalItems} Item`,
        `${grandTotalQty} Unit`,
        formatCurrency(grandTotalExpense),
        '100.0%',
      ],
    ],
    theme: 'grid',
    margin: { left: marginX, right: marginX },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2,
    },
    footStyles: {
      fillColor: [236, 253, 245],
      textColor: [5, 150, 105],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.2,
    },
    styles: {
      fontSize: 6.8,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 62, fontStyle: 'bold' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 16, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // --------------------------------------------------------------------------
  // SECTION II: RINCIAN PENGELUARAN TERPISAH PER DEPARTEMEN (1 S/D 12)
  // --------------------------------------------------------------------------
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `II. RINCIAN PENGELUARAN TERPISAH PER DEPARTEMEN (1 S/D ${twelveDepts.length} DEPARTEMEN)`,
    marginX,
    currentY
  );
  currentY += 5;

  deptGroups.forEach((group) => {
    // Ensure enough vertical room for department header + at least a couple of rows
    if (currentY > pageHeight - 46) {
      doc.addPage();
      currentY = 16;
    }

    // Department Header Banner
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(marginX, currentY, contentWidth, 7.5, 1.2, 1.2, 'F');

    // Emerald left accent inside banner
    doc.setFillColor(16, 185, 129);
    doc.rect(marginX, currentY, 3, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `DEPARTEMEN ${group.index} DARI ${twelveDepts.length}: [${group.department.code}] ${group.department.name.trim().toUpperCase()}`,
      marginX + 5.5,
      currentY + 5
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 231, 183); // emerald-300
    doc.text(
      `Pengeluaran Dept: ${formatCurrency(group.totalExpense)} (${group.itemCount} Item)`,
      pageWidth - marginX - 3,
      currentY + 5,
      { align: 'right' }
    );

    currentY += 8.5;

    const deptTableBody =
      group.items.length === 0
        ? [
            [
              '-',
              '-',
              'Tidak ada pengajuan / pengeluaran barang pada departemen ini di periode aktif.',
              '-',
              '0',
              'Rp 0',
              '-',
              'Rp 0',
            ],
          ]
        : group.items.map((item, idx) => {
            const routine = routineItems.find((r) => r.id === item.routine_item_id);
            const codeLabel = routine?.item_code || (item.item_type === 'routine' ? 'ROUTINE' : 'ADDITIONAL');
            const itemName = item.custom_item_name || routine?.name || 'Barang Operasional';
            const cleanSpec = cleanSystemNotes(item.specification);
            const fullName = cleanSpec ? `${itemName}\nSpek: ${cleanSpec}` : itemName;

            const priorityLabel =
              item.priority_level === 3
                ? 'L3 (Urgent)'
                : item.priority_level === 2
                ? 'L2 (Medium)'
                : 'L1 (Rutin)';

            const qty = `${item.quantity || 1} ${item.unit || 'pcs'}`;
            const unitPriceVal = Number(item.final_unit_price ?? routine?.estimated_unit_price ?? 0);
            const subtotalVal = (Number(item.quantity) || 1) * unitPriceVal;

            const statusText =
              item.lifecycle_status === 'received_at_site'
                ? 'Tiba di Site'
                : item.lifecycle_status === 'in_transit'
                ? 'In Transit'
                : item.lifecycle_status === 'purchased' || item.lifecycle_status === 'processing_delivery'
                ? 'Dibeli (PO)'
                : item.pm_buy_approval === 'approved' || item.lifecycle_status === 'pm_buy_approved'
                ? 'Disetujui PM'
                : item.pm_item_approval === 'approved' || item.lifecycle_status === 'pm_item_approved'
                ? 'Disetujui Finance'
                : 'Diajukan';

            return [
              String(idx + 1),
              codeLabel,
              fullName,
              priorityLabel,
              qty,
              formatCurrency(unitPriceVal),
              statusText,
              formatCurrency(subtotalVal),
            ];
          });

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          'No',
          'Kode',
          'Nama Barang & Spesifikasi',
          'Prioritas',
          'Kuantitas',
          'Harga Satuan',
          'Status',
          'Subtotal (Rp)',
        ],
      ],
      body: deptTableBody,
      foot: [
        [
          '',
          '',
          `TOTAL PENGELUARAN [${group.department.code}] ${group.department.name.trim().toUpperCase()}`,
          '',
          `${group.totalQuantity} Unit`,
          '',
          `${group.itemCount} Item`,
          formatCurrency(group.totalExpense),
        ],
      ],
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: 'bold',
        fontSize: 6.8,
        cellPadding: 1.8,
      },
      footStyles: {
        fillColor: [248, 250, 252],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 7,
        cellPadding: 2,
      },
      styles: {
        fontSize: 6.5,
        textColor: [30, 41, 59],
        cellPadding: 1.6,
        overflow: 'linebreak',
        valign: 'top',
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 20, fontStyle: 'bold' },
        2: { cellWidth: 56 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 18, halign: 'center' },
        7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  });

  // --------------------------------------------------------------------------
  // SIGNATURE / APPROVAL SIGN-OFF BLOCK
  // --------------------------------------------------------------------------
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 20;
  }

  const sigBoxWidth = (contentWidth - 10) / 2;
  const sigBoxHeight = 34;

  // Left Box: Finance & Accounting
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, sigBoxWidth, sigBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Direkonsiliasi Oleh:', marginX + 4, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Finance & Accounting Department', marginX + 4, currentY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(5, 150, 105);
  doc.text('[REKAPITULASI ANGGARAN 12 DEPARTEMEN]', marginX + 4, currentY + 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Siti Nurhaliza, S.E.', marginX + 4, currentY + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Finance & Treasury Supervisor', marginX + 4, currentY + 30);

  // Right Box: Project Manager
  const sigRightX = marginX + sigBoxWidth + 10;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(sigRightX, currentY, sigBoxWidth, sigBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Disetujui & Diotorisasi Oleh:', sigRightX + 4, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Project Manager / Kepala Teknik Tambang (KTT)', sigRightX + 4, currentY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(5, 150, 105);
  doc.text('[OTORISASI LAPORAN PER DEPARTEMEN]', sigRightX + 4, currentY + 19);

  const pmName = currentUser?.full_name || 'Bambang Wijaya, S.T.';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(pmName, sigRightX + 4, currentY + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Project Manager PT Sumber Mineral Abadi', sigRightX + 4, currentY + 30);

  // --------------------------------------------------------------------------
  // RUNNING FOOTER ON ALL PAGES
  // --------------------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);

    doc.text(
      `PT Sumber Mineral Abadi — Laporan Pengeluaran Per Departemen (${twelveDepts.length} Dept | Minggu ke-${period.week_number})`,
      marginX,
      pageHeight - 7
    );

    doc.text('DOKUMEN RAHASIA & RESMI PERUSAHAAN', pageWidth / 2, pageHeight - 7, {
      align: 'center',
    });

    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - marginX, pageHeight - 7, {
      align: 'right',
    });
  }

  const fileName = `Laporan_Pengeluaran_Per_Departemen_W${period.week_number}_${period.year}_PT_SMA.pdf`;
  doc.save(fileName);
}

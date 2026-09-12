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
import { formatCurrency, formatDate } from './utils';

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
    ? 'DAFTAR ITEM PENGADAAN (DISETUJUI OTORISASI BELI PM)'
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

import * as XLSX from 'xlsx';
import { Department, ItemCategoryType, PriorityLevel } from './types';

export interface EditableImportedItem {
  tempId: string;
  originalNo?: string | number;
  department_id: string;
  department_code: string;
  department_name: string;
  raw_dept_section: string;
  item_name: string;
  item_type: ItemCategoryType;
  routine_code: string; // Required when item_type === 'routine'
  specification: string;
  quantity: number;
  unit: string;
  priority_level: PriorityLevel;
  final_unit_price: number;
  reference_link?: string; // Mapped from DAFTAR VENDOR
}

// Normalized section and department code mapping
export const SECTION_TO_DEPT_CODE: Record<string, string> = {
  explorasi: 'GEOLOGY',
  eksplorasi: 'GEOLOGY',
  geology: 'GEOLOGY',
  geo: 'GEOLOGY',
  exp: 'GEOLOGY',
  survey: 'ENG',
  sur: 'ENG',
  qaqc: 'PROCESSING',
  processing: 'PROCESSING',
  engineering: 'ENG',
  eng: 'ENG',
  civil: 'CIVIL',
  civ: 'CIVIL',
  maintanance: 'MAINTENANCE',
  maintenance: 'MAINTENANCE',
  mnt: 'MAINTENANCE',
  produksi: 'PROD',
  prod: 'PROD',
  pro: 'PROD',
  mining: 'PROD',
  ganis: 'FOREST',
  gan: 'FOREST',
  forest: 'FOREST',
  forestry: 'FOREST',
  hrga: 'HRGA',
  hcga: 'HRGA',
  hse: 'HSE',
  'obat-obatan': 'HSE',
  'obat obatan': 'HSE',
  obat: 'HSE',
  logistics: 'LOGISTICS',
  log: 'LOGISTICS',
  finance: 'FINANCE',
  fin: 'FINANCE',
  legal: 'LEGAL',
  hauling: 'HAULING',
  port: 'PORT',
};

/**
 * Resolves the matching Department from available departments in the database
 */
export function resolveDepartment(
  rawSection: string,
  departments: Department[]
): Department | undefined {
  if (!rawSection) return undefined;
  const cleanKey = rawSection.toLowerCase().replace(/[^a-z0-9\- ]/g, '').trim();
  const targetCode = SECTION_TO_DEPT_CODE[cleanKey] || SECTION_TO_DEPT_CODE[cleanKey.split(' ')[0]] || '';

  if (targetCode) {
    // 1. Find by exact code match
    const byCode = departments.find((d) => d.code.toUpperCase() === targetCode.toUpperCase());
    if (byCode) return byCode;

    // 2. Fallback by prefix / contains
    const byCodePrefix = departments.find(
      (d) => d.code.toUpperCase().startsWith(targetCode.toUpperCase()) || targetCode.toUpperCase().startsWith(d.code.toUpperCase())
    );
    if (byCodePrefix) return byCodePrefix;
  }

  // 3. Match against department name or code directly
  return departments.find((d) => {
    const dCode = d.code.toLowerCase();
    const dName = d.name.toLowerCase();
    return dCode === cleanKey || dName.includes(cleanKey) || cleanKey.includes(dCode);
  });
}

interface ColumnHeaderMap {
  rowIndex: number;
  colNo: number;
  colName: number;
  colPrice: number;
  colUnit: number;
  colVendor: number;
  colDept: number;
  colKode: number;
  colMinStock: number;
  colStatus: number;
}

/**
 * Checks whether rows follow the new flat columnar format (e.g. DATABASE LOGISTIK 2026 (1).xlsx)
 */
function detectColumnarHeader(rows: any[][]): ColumnHeaderMap | null {
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = (rows[r] || []).map((c) => String(c ?? '').trim().toUpperCase());
    const hasItemName = row.some((c) => /NAMA\s*BARANG/i.test(c));
    const hasDeptOrCode = row.some((c) => /DEPARTEMEN|KODE\s*BARANG/i.test(c));

    if (hasItemName && hasDeptOrCode) {
      return {
        rowIndex: r,
        colNo: row.findIndex((c) => /^NO\.?$/i.test(c)),
        colName: row.findIndex((c) => /NAMA\s*BARANG/i.test(c)),
        colPrice: row.findIndex((c) => /HARGA/i.test(c)),
        colUnit: row.findIndex((c) => /^SATUAN/i.test(c)),
        colVendor: row.findIndex((c) => /VENDOR/i.test(c)),
        colDept: row.findIndex((c) => /DEPARTEMEN/i.test(c)),
        colKode: row.findIndex((c) => /KODE/i.test(c)),
        colMinStock: row.findIndex((c) => /STOCK/i.test(c)),
        colStatus: row.findIndex((c) => /STATUS/i.test(c)),
      };
    }
  }
  return null;
}

/**
 * Parse an Excel workbook buffer into editable item rows
 */
export function parseLogisticExcel(
  fileBuffer: ArrayBuffer | Uint8Array,
  departments: Department[]
): EditableImportedItem[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (rows.length === 0) return [];

  const parsedItems: EditableImportedItem[] = [];
  const deptRoutineCounter: Record<string, number> = {};
  const headerMap = detectColumnarHeader(rows);

  // ==========================================
  // FORMAT 1: Flat Columnar Format (DATABASE LOGISTIK 2026)
  // ==========================================
  if (headerMap) {
    for (let r = headerMap.rowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rawItemName = headerMap.colName !== -1 ? String(row[headerMap.colName] ?? '').trim() : '';
      if (!rawItemName) continue;

      const rawNo = headerMap.colNo !== -1 && row[headerMap.colNo] !== undefined && row[headerMap.colNo] !== ''
        ? String(row[headerMap.colNo]).trim()
        : String(r - headerMap.rowIndex);

      const rawDept = headerMap.colDept !== -1 ? String(row[headerMap.colDept] ?? '').trim() : '';
      const rawVendor = headerMap.colVendor !== -1 ? String(row[headerMap.colVendor] ?? '').trim() : '';
      const rawKode = headerMap.colKode !== -1 ? String(row[headerMap.colKode] ?? '').trim().toUpperCase() : '';
      const rawPrice = headerMap.colPrice !== -1 ? row[headerMap.colPrice] : 0;
      const rawUnit = headerMap.colUnit !== -1 ? String(row[headerMap.colUnit] ?? '').trim() : 'pcs';
      const rawStatus = headerMap.colStatus !== -1 ? String(row[headerMap.colStatus] ?? '').trim().toUpperCase() : '';

      // Resolve department
      const fallbackDept = departments[0];
      const assignedDept = (rawDept ? resolveDepartment(rawDept, departments) : undefined) || fallbackDept;
      const deptCode = assignedDept?.code || 'DEPT';
      const deptName = assignedDept?.name || rawDept || 'General';
      const deptId = assignedDept?.id || '00000000-0000-0000-0001-000000000001';

      // Item Type: If status explicitly mentions Kondisional/Additional -> 'additional', otherwise if routine code or default -> 'routine'
      let itemType: ItemCategoryType = 'routine';
      if (rawStatus.includes('KONDISIONAL') || rawStatus.includes('ADDITIONAL')) {
        itemType = 'additional';
      } else if (rawStatus.includes('BULANAN') || rawStatus.includes('ROUTINE')) {
        itemType = 'routine';
      } else {
        itemType = rawKode ? 'routine' : 'additional';
      }

      // Routine Code
      deptRoutineCounter[deptCode] = (deptRoutineCounter[deptCode] || 0) + 1;
      const seqStr = String(deptRoutineCounter[deptCode]).padStart(3, '0');
      const routineCode = rawKode || (itemType === 'routine' ? `R-${deptCode}-${seqStr}` : '');

      // Price
      const finalPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9.]/g, '')) || 0;
      const unit = rawUnit || 'pcs';

      parsedItems.push({
        tempId: `import-${Date.now()}-${r}-${Math.random().toString(36).slice(2, 6)}`,
        originalNo: rawNo,
        department_id: deptId,
        department_code: deptCode,
        department_name: deptName,
        raw_dept_section: rawDept || deptName,
        item_name: rawItemName,
        item_type: itemType,
        routine_code: routineCode,
        specification: '',
        quantity: 1,
        unit: unit,
        priority_level: 1,
        final_unit_price: finalPrice,
        reference_link: rawVendor || undefined,
      });
    }

    return parsedItems;
  }

  // ==========================================
  // FORMAT 2: Section Header Format (Legacy Data Logistik SMA)
  // ==========================================
  let currentRawSection = '';
  let currentDept: Department | undefined = undefined;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const colB = String(row[1] ?? '').trim();
    const colC = String(row[2] ?? '').trim();

    // 1. Detect Department Header Row (e.g. 'A.' and 'EXPLORASI')
    const isSectionHeader = /^[A-Z]\.?$/i.test(colB) && colC.length > 0 && isNaN(Number(colB));
    if (isSectionHeader) {
      currentRawSection = colC;
      currentDept = resolveDepartment(colC, departments);
      continue;
    }

    // 2. Detect Item Row: colB is a number and colC has an item name
    const isNumericNo = /^\d+$/.test(colB);
    if (isNumericNo && colC) {
      const fallbackDept = departments[0];
      const assignedDept = currentDept || fallbackDept;
      const deptCode = assignedDept?.code || 'DEPT';
      const deptName = assignedDept?.name || currentRawSection || 'General';
      const deptId = assignedDept?.id || '00000000-0000-0000-0001-000000000001';

      const rawStatusBelanja = String(row[9] ?? '').toUpperCase().trim();
      const isRoutine = rawStatusBelanja.includes('BULANAN');
      const itemType: ItemCategoryType = isRoutine ? 'routine' : 'additional';

      const rawKategori = String(row[7] ?? '').toUpperCase().trim();
      let priorityLevel: PriorityLevel = 1;
      if (rawKategori.includes('1')) priorityLevel = 1;
      else if (rawKategori.includes('2')) priorityLevel = 2;
      else if (rawKategori.includes('3')) priorityLevel = 3;
      else if (rawKategori.includes('4')) priorityLevel = 3;

      const rawPrice = row[4];
      const finalPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9.]/g, '')) || 0;

      const rawQty = row[5];
      const qty = typeof rawQty === 'number' ? rawQty : Number(String(rawQty).replace(/[^0-9.]/g, '')) || 1;

      const unit = String(row[6] ?? 'pcs').trim() || 'pcs';
      const spec = String(row[3] ?? '').trim();

      deptRoutineCounter[deptCode] = (deptRoutineCounter[deptCode] || 0) + 1;
      const seqStr = String(deptRoutineCounter[deptCode]).padStart(3, '0');
      const suggestedRoutineCode = isRoutine ? `R-${deptCode}-${seqStr}` : '';

      parsedItems.push({
        tempId: `import-${Date.now()}-${r}-${Math.random().toString(36).slice(2, 6)}`,
        originalNo: colB,
        department_id: deptId,
        department_code: deptCode,
        department_name: deptName,
        raw_dept_section: currentRawSection,
        item_name: colC,
        item_type: itemType,
        routine_code: suggestedRoutineCode,
        specification: spec,
        quantity: qty > 0 ? qty : 1,
        unit: unit,
        priority_level: priorityLevel,
        final_unit_price: finalPrice,
      });
    }
  }

  return parsedItems;
}


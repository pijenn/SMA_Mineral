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
}

// Normalized section mapping according to requirements
export const SECTION_TO_DEPT_CODE: Record<string, string> = {
  explorasi: 'GEOLOGY',
  eksplorasi: 'GEOLOGY',
  geology: 'GEOLOGY',
  qaqc: 'PROCESSING',
  processing: 'PROCESSING',
  engineering: 'ENG',
  eng: 'ENG',
  maintanance: 'MAINTENANCE',
  maintenance: 'MAINTENANCE',
  produksi: 'PROD',
  prod: 'PROD',
  mining: 'PROD',
  ganis: 'FOREST',
  forest: 'FOREST',
  forestry: 'FOREST',
  hrga: 'HRGA',
  hse: 'HSE',
  'obat-obatan': 'HSE',
  'obat obatan': 'HSE',
  obat: 'HSE',
};

/**
 * Resolves the matching Department from available departments in the database
 */
export function resolveDepartment(
  rawSection: string,
  departments: Department[]
): Department | undefined {
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

  let currentRawSection = '';
  let currentDept: Department | undefined = undefined;
  const parsedItems: EditableImportedItem[] = [];

  // Track routine sequence number per department for auto-suggestion
  const deptRoutineCounter: Record<string, number> = {};

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const colB = String(row[1] ?? '').trim();
    const colC = String(row[2] ?? '').trim();

    // 1. Detect Department Header Row
    // Examples: 'A.' and 'EXPLORASI', 'B.' and 'QAQC', 'C.' and 'ENGINEERING', 'I.' and 'OBAT-OBATAN'
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

      // Status belanja -> item_type
      // BULANAN -> routine, KONDISIONAL -> additional
      const rawStatusBelanja = String(row[9] ?? '').toUpperCase().trim();
      const isRoutine = rawStatusBelanja.includes('BULANAN');
      const itemType: ItemCategoryType = isRoutine ? 'routine' : 'additional';

      // Priority level from kategori: C1 -> 1, C2 -> 2, C3 -> 3
      const rawKategori = String(row[7] ?? '').toUpperCase().trim();
      let priorityLevel: PriorityLevel = 1;
      if (rawKategori.includes('1')) priorityLevel = 1;
      else if (rawKategori.includes('2')) priorityLevel = 2;
      else if (rawKategori.includes('3')) priorityLevel = 3;
      else if (rawKategori.includes('4')) priorityLevel = 3;

      // Price & Qty
      const rawPrice = row[4];
      const finalPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9.]/g, '')) || 0;

      const rawQty = row[5];
      const qty = typeof rawQty === 'number' ? rawQty : Number(String(rawQty).replace(/[^0-9.]/g, '')) || 1;

      const unit = String(row[6] ?? 'pcs').trim() || 'pcs';
      const spec = String(row[3] ?? '').trim();

      // Suggested routine code if routine
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

import * as XLSX from 'xlsx';

export function parseInventoryExcel(input) {
  let buffer;
  if (Buffer.isBuffer(input)) {
    buffer = input;
  } else if (typeof input === 'string') {
    // If it's a base64 string, remove data URL prefix if present
    const base64Data = input.replace(/^data:[^;]+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    throw new Error('Invalid input: expected Buffer or Base64 string.');
  }

  const wb = XLSX.read(buffer, { type: 'buffer' });
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('The uploaded Excel file contains no worksheets.');
  }

  // Use the first sheet or one containing 'Component' / 'Inventory'
  let targetSheetName = wb.SheetNames[0];
  const preferred = wb.SheetNames.find(n => /component|inventory|part|bot/i.test(n));
  if (preferred) targetSheetName = preferred;

  const sheet = wb.Sheets[targetSheetName];
  if (!sheet) throw new Error('Unable to read worksheet: ' + targetSheetName);

  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length === 0) {
    throw new Error('The worksheet is empty.');
  }

  // Find header row in first 10 rows
  let headerRowIdx = -1;
  let nameCol = -1, qtyCol = -1, distCol = -1, catCol = -1;

  for (let r = 0; r < Math.min(10, rawRows.length); r++) {
    const row = rawRows[r] || [];
    row.forEach((cell, c) => {
      const s = String(cell || '').trim().toLowerCase();
      if (/^(item|part|component|name|description|item name|part name)$/i.test(s) || (s.includes('item') && !s.includes('count'))) nameCol = c;
      if (/^(quantity|qty|total|count|total quantity|stock)$/i.test(s) || s.includes('quantit') || s === 'qty') qtyCol = c;
      if (/^(to distribute|isdistributed|distribute|distributed|distributable)$/i.test(s) || s.includes('distribut')) distCol = c;
      if (/^(category|type|group|subsystem|class)$/i.test(s) || s.includes('categor')) catCol = c;
    });
    if (nameCol !== -1 && qtyCol !== -1) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1 || nameCol === -1 || qtyCol === -1) {
    throw new Error('Could not identify required columns ("Item" and "Quantity"). Please verify header row.');
  }

  const items = [];
  const errors = [];
  let skipped = 0;

  for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r] || [];
    const rawName = row[nameCol];
    if (rawName === undefined || rawName === null || String(rawName).trim() === '') {
      skipped++;
      continue;
    }

    const name = String(rawName).trim();
    // Ignore footer/summary rows like "Total", "Grand Total"
    if (/^(total|grand total|sum|notes)$/i.test(name)) {
      skipped++;
      continue;
    }

    const rawQty = row[qtyCol];
    const qty = parseInt(String(rawQty).replace(/[^0-9-]/g, ''), 10);
    if (isNaN(qty) || qty < 0) {
      errors.push({ row: r + 1, item: name, reason: 'Invalid or negative quantity: ' + rawQty });
      continue;
    }

    let isDistributed = true;
    if (distCol !== -1 && row[distCol] !== undefined && row[distCol] !== '') {
      const v = row[distCol];
      if (typeof v === 'boolean') {
        isDistributed = v;
      } else if (typeof v === 'number') {
        isDistributed = (v !== 0);
      } else {
        const str = String(v).trim().toLowerCase();
        isDistributed = ['1', 'true', 'yes', 'y', 'to distribute'].includes(str);
      }
    }

    let category = '';
    if (catCol !== -1 && row[catCol]) {
      category = String(row[catCol]).trim();
    }
    if (!category) {
      category = inferCategory(name);
    }

    items.push({
      name,
      quantity: qty,
      isDistributed,
      category
    });
  }

  return {
    sheetName: targetSheetName,
    items,
    errors,
    skipped
  };
}

export function inferCategory(name) {
  const lower = name.toLowerCase();
  if (/driver|l298n|esc|controller/i.test(lower)) return 'Motor Drivers';
  if (/motor|rpm/i.test(lower)) return 'Motors';
  if (/wheel|tire|omni|castor/i.test(lower)) return 'Wheels';
  if (/battery|charger|holder|lipo|bms|power/i.test(lower)) return 'Power';
  if (/esp32|microcontroller|arduino|raspberry|board|sensor|ultrasonic|imu|module/i.test(lower)) return 'Electronics & Sensors';
  if (/wire|jumper|cable|connector|switch/i.test(lower)) return 'Wiring & Connectors';
  if (/chassis|frame|body|plate/i.test(lower)) return 'Chassis';
  if (/gear|pulley|belt|shaft|bearing/i.test(lower)) return 'Gearing & Mechanics';
  if (/screw|cutter|multimeter|soldering|tool|plier|hex|tape|wrench/i.test(lower)) return 'Tools & Equipment';
  if (/servo/i.test(lower)) return 'Servos';
  return 'General';
}

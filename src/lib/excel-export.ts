import * as XLSX from 'xlsx';
import { AppData, DailyRegisterEntry } from '../types';
import { getMonthNames, toMarathiDigits } from './mdm-calculator';
import { OFFICIAL_REGISTER_COLUMNS } from './constants';

/**
 * Exports Monthly Register in the exact format of Government of Maharashtra
 * MDM Register Part-2 (धान्यादी मालाचे हिशोब) as shown in the official document.
 */
export function exportMonthlyRegisterToExcel(
  monthKey: string,
  appData: AppData
): void {
  const { profile, dailyEntries, stockInward } = appData;
  const monthInfo = getMonthNames(monthKey);
  const inward = stockInward[monthKey] || {};

  // Parse Year and Month to get exact date count (e.g. 28, 30, 31)
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  const rows: (string | number)[][] = [];

  // Top Right Page No & Main Title (Matching attached official document page 43)
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '४३']);
  rows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    'प्रधानमंत्री पोषणशक्ती निर्माण योजना (इ. १ ली ते ५ वी)',
  ]);
  rows.push([
    '',
    '',
    '',
    '',
    'शाळा स्तरावर ठेवण्याची दैनिक खर्च नोंदवही भाग-२ (धान्यादी मालाचे हिशोब)',
  ]);
  rows.push([]);

  // School info line + Weight unit
  rows.push([
    `शाळेचे नाव :-- ${profile.schoolName}`,
    '',
    '',
    '',
    `केंद्र :-- ${profile.centerCluster}`,
    '',
    '',
    '',
    `महिना :-- ${monthInfo.mr} ${monthInfo.year}`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'वजन (किलोग्रॅममध्ये)',
  ]);
  rows.push([]);

  // Column Headers - Row 1: Names (Cols 1 to 24)
  const headerRow1 = [
    'दिनांक',
    'तपशील',
    'दैनिक उपस्थिती / लाभार्थी',
    'प्रत्यक्ष लाभार्थी / ताटांची संख्या',
    ...OFFICIAL_REGISTER_COLUMNS.map((c) => c.nameMr),
    'लाभार्थी - नुसार होणारा खर्च',
  ];
  rows.push(headerRow1);

  // Column Headers - Row 2: Numbers (Cols 1 to 24 in Marathi digits)
  const headerRow2 = [
    '१',
    '२',
    '३',
    '४',
    ...OFFICIAL_REGISTER_COLUMNS.map((c) => toMarathiDigits(c.colNum)),
    '२४',
  ];
  rows.push(headerRow2);

  // Accumulators for month totals
  let totalAttendance = 0;
  let totalPlates = 0;
  let totalMonthCost = 0;
  const colConsumedTotals: Record<string, number> = {};
  OFFICIAL_REGISTER_COLUMNS.forEach((c) => (colConsumedTotals[c.id] = 0));

  // 1. मागील शिल्लक साहित्य (Opening Stock)
  const openingRow: (string | number)[] = ['', 'मागील शिल्लक साहित्य', '', ''];
  OFFICIAL_REGISTER_COLUMNS.forEach((c) => {
    const val = inward[c.id]?.openingStockKg || 0;
    openingRow.push(val > 0 ? Number(val.toFixed(3)) : '-');
  });
  openingRow.push('-');
  rows.push(openingRow);

  // 2. प्राप्त साहित्य (Received Stock)
  const receivedRow: (string | number)[] = ['', 'प्राप्त साहित्य', '', ''];
  OFFICIAL_REGISTER_COLUMNS.forEach((c) => {
    const val = inward[c.id]?.receivedStockKg || 0;
    receivedRow.push(val > 0 ? Number(val.toFixed(3)) : '-');
  });
  receivedRow.push('-');
  rows.push(receivedRow);

  // 3. एकूण साहित्य (Total Stock = Opening + Received)
  const totalStockRow: (string | number)[] = ['', 'एकूण साहित्य', '', ''];
  OFFICIAL_REGISTER_COLUMNS.forEach((c) => {
    const openVal = inward[c.id]?.openingStockKg || 0;
    const recVal = inward[c.id]?.receivedStockKg || 0;
    const tot = openVal + recVal;
    totalStockRow.push(tot > 0 ? Number(tot.toFixed(3)) : '-');
  });
  totalStockRow.push('-');
  rows.push(totalStockRow);

  // Days 1 to 31 (All days of month)
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `${yearStr}-${monthStr}-${dayStr}`;
    const d = new Date(`${dateKey}T12:00:00`);
    const isSunday = d.getDay() === 0;
    const entry: DailyRegisterEntry | undefined = dailyEntries[dateKey];
    const dayDisplay = toMarathiDigits(day);

    if (!entry) {
      if (isSunday) {
        const sunRow: (string | number)[] = [dayDisplay, 'रविवार (सुट्टी)', '-', '-'];
        OFFICIAL_REGISTER_COLUMNS.forEach(() => sunRow.push('-'));
        sunRow.push('-');
        rows.push(sunRow);
      } else {
        const emptyRow: (string | number)[] = [dayDisplay, 'साहित्य', '-', '-'];
        OFFICIAL_REGISTER_COLUMNS.forEach(() => emptyRow.push('-'));
        emptyRow.push('-');
        rows.push(emptyRow);
      }
      continue;
    }

    if (entry.isHoliday) {
      const holRow: (string | number)[] = [
        dayDisplay,
        `सुट्टी: ${entry.holidayReason || 'शाळा बंद'}`,
        '०',
        '०',
      ];
      OFFICIAL_REGISTER_COLUMNS.forEach(() => holRow.push('-'));
      holRow.push('०');
      rows.push(holRow);
      continue;
    }

    // Normal working day with MDM meal served
    totalAttendance += entry.studentCount;
    totalPlates += entry.studentCount;
    totalMonthCost += entry.totalCookingCost;

    const row: (string | number)[] = [
      dayDisplay,
      'साहित्य',
      entry.studentCount,
      entry.studentCount,
    ];

    OFFICIAL_REGISTER_COLUMNS.forEach((col) => {
      const kg = entry.items[col.id]?.kg || 0;
      if (kg > 0) {
        colConsumedTotals[col.id] = (colConsumedTotals[col.id] || 0) + kg;
        row.push(Number(kg.toFixed(3)));
      } else {
        row.push('-');
      }
    });

    row.push(Number(entry.totalCookingCost.toFixed(2)));
    rows.push(row);
  }

  // Summary Row 1: चालू महिन्यात खर्च झालेले एकूण साहित्य (Total Consumed)
  const consumedTotalRow: (string | number)[] = [
    '',
    'चालू महिन्यात खर्च झालेले एकूण साहित्य',
    totalAttendance > 0 ? totalAttendance : '-',
    totalPlates > 0 ? totalPlates : '-',
  ];
  OFFICIAL_REGISTER_COLUMNS.forEach((c) => {
    const totKg = colConsumedTotals[c.id] || 0;
    consumedTotalRow.push(totKg > 0 ? Number(totKg.toFixed(3)) : '-');
  });
  consumedTotalRow.push(totalMonthCost > 0 ? Number(totalMonthCost.toFixed(2)) : '-');
  rows.push(consumedTotalRow);

  // Summary Row 2: अखेर शिल्लक राहिलेले साहित्य (Closing Balance)
  const closingStockRow: (string | number)[] = [
    '',
    'अखेर शिल्लक राहिलेले साहित्य',
    '-',
    '-',
  ];
  OFFICIAL_REGISTER_COLUMNS.forEach((c) => {
    const openVal = inward[c.id]?.openingStockKg || 0;
    const recVal = inward[c.id]?.receivedStockKg || 0;
    const consumed = colConsumedTotals[c.id] || 0;
    const closing = openVal + recVal - consumed;
    closingStockRow.push(Number(closing.toFixed(3)));
  });
  closingStockRow.push('-');
  rows.push(closingStockRow);

  // Toll free complaint footer note
  rows.push([]);
  rows.push(['टीप : तक्रार निवारण केंद्र टोल फ्री क्रमांक १८००२३३९९८८']);
  rows.push([]);

  // Official Signatures
  rows.push([
    'स्वयंपाकी / मदतनीस स्वाक्षरी',
    '',
    '',
    'शालेय पोषण आहार प्रभारी स्वाक्षरी',
    '',
    '',
    '',
    'मुख्याध्यापक स्वाक्षरी (शाळेचा शिक्का)',
    '',
    '',
    '',
    'तपासणी अधिकारी स्वाक्षरी',
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Precise Column Widths
  const colWidths = [
    { wch: 8 },  // 1: दिनांक
    { wch: 26 }, // 2: तपशील
    { wch: 15 }, // 3: दैनिक उपस्थिती / लाभार्थी
    { wch: 15 }, // 4: प्रत्यक्ष लाभार्थी / ताटांची संख्या
    ...OFFICIAL_REGISTER_COLUMNS.map(() => ({ wch: 11 })), // 5-23: साहित्य
    { wch: 16 }, // 24: खर्च
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    `नोंदवही_भाग२_${monthInfo.en}`
  );

  XLSX.writeFile(
    workbook,
    `PM_POSHAN_नोंदवही_भाग२_${monthKey}_${profile.udiseNumber || 'School'}.xlsx`
  );
}

import React, { useState, useMemo } from 'react';
import { AppData, DailyRegisterEntry } from '../types';
import { getMonthNames, toMarathiDigits, formatINR } from '../lib/mdm-calculator';
import { exportMonthlyRegisterToExcel } from '../lib/excel-export';
import {
  OFFICIAL_REGISTER_COLUMNS,
  isSpice,
  getColumnUnitLabel,
  getStockInDisplayUnit,
} from '../lib/constants';
import {
  Printer,
  ArrowLeft,
  FileSpreadsheet,
} from 'lucide-react';

interface OfficialPrintViewProps {
  monthKey: string;
  appData: AppData;
  onClose: () => void;
}

export const OfficialPrintView: React.FC<OfficialPrintViewProps> = ({
  monthKey: initialMonthKey,
  appData,
  onClose,
}) => {
  const { profile, dailyEntries, stockInward } = appData;
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonthKey);

  const monthInfo = useMemo(() => getMonthNames(selectedMonth), [selectedMonth]);
  const inward = stockInward[selectedMonth] || {};

  // Parse Year and Month to calculate number of days
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  // Accumulate month totals
  let totalAttendance = 0;
  let totalPlates = 0;
  let totalMonthCost = 0;
  const colConsumedTotals: Record<string, number> = {};
  OFFICIAL_REGISTER_COLUMNS.forEach((c) => (colConsumedTotals[c.id] = 0));

  // Compute month entries and totals (Pulses in KG, Spices in Grams)
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `${yearStr}-${monthStr}-${dayStr}`;
    const entry = dailyEntries[dateKey];
    if (entry && !entry.isHoliday) {
      totalAttendance += entry.studentCount;
      totalPlates += entry.studentCount;
      totalMonthCost += entry.totalCookingCost;
      OFFICIAL_REGISTER_COLUMNS.forEach((col) => {
        const itemData = entry.items[col.id];
        if (itemData) {
          if (isSpice(col.id)) {
            // Spices calculated in GRAMS
            const g = itemData.grams || 0;
            if (g > 0) {
              colConsumedTotals[col.id] = (colConsumedTotals[col.id] || 0) + g;
            }
          } else if (col.id === 'purak_aahar') {
            // Purak Aahar in NAG
            const nag = itemData.grams || 0;
            if (nag > 0) {
              colConsumedTotals[col.id] = (colConsumedTotals[col.id] || 0) + nag;
            }
          } else {
            // Pulses, legumes, grains, vegetables in KG
            const kg = itemData.kg || 0;
            if (kg > 0) {
              colConsumedTotals[col.id] = (colConsumedTotals[col.id] || 0) + kg;
            }
          }
        }
      });
    }
  }

  // Month options for selector
  const monthOptions = useMemo(() => {
    const options = [];
    const base = new Date();
    for (let i = -6; i <= 3; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const names = getMonthNames(key);
      options.push({
        key,
        label: `${names.mr} ${names.year} (${names.en})`,
      });
    }
    return options;
  }, []);

  const handleDownloadExcel = () => {
    exportMonthlyRegisterToExcel(selectedMonth, appData);
  };

  return (
    <div className="bg-slate-100 min-h-screen text-black pb-12">
      {/* Interactive Action Bar (Screen Only, hidden during print or PDF capture) */}
      <div className="no-print sticky top-0 z-30 bg-white border-b border-slate-300 shadow-xs px-4 py-3">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Back button and title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>मागे जा (Back)</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                  शासकीय नमुना: भाग - २
                </span>
                <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                  (धान्यादी मालाचे हिशोब)
                </span>
              </div>
            </div>
          </div>

          {/* Month Selector and Download Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                id="report-month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Direct Excel (XLS) Download Button */}
            <button
              id="download-report-xls-btn"
              type="button"
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
              title="Download official register in Excel .xlsx format"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel डाऊनलोड (.xlsx)</span>
            </button>

            {/* Native Browser Print Button (Save as PDF) */}
            <button
              id="browser-print-btn"
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
              title="Print on Physical Printer or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>प्रिंट काढा (Print / Save as PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Official Government Booklet Container (Matches the attached document page 43) */}
      <div className="max-w-[1400px] mx-auto p-2 sm:p-6">
        <div
          id="official-register-document"
          className="bg-white border-2 border-black p-4 sm:p-6 shadow-md text-black font-sans print:shadow-none print:p-0 print:border-none"
        >
          {/* Top Page Number & Title Header */}
          <div className="relative mb-2">
            {/* Top Right Page Number (४३) */}
            <div className="absolute top-0 right-0 font-bold text-sm sm:text-base border border-black px-2 py-0.5">
              ४३
            </div>

            <div className="text-center pt-1">
              <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight leading-snug">
                प्रधानमंत्री पोषणशक्ती निर्माण योजना (इ. १ ली ते ५ वी)
              </h1>
              <h2 className="text-xs sm:text-sm md:text-base font-bold underline mt-0.5">
                शाळा स्तरावर ठेवण्याची दैनिक खर्च नोंदवही भाग-२ (धान्यादी मालाचे हिशोब)
              </h2>
            </div>
          </div>

          {/* School Name, Center, Month, and Unit Header Row */}
          <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm font-semibold border-b border-black pb-2 mb-2 gap-2">
            <div className="flex-1 min-w-[240px]">
              <span>शाळेचे नाव :-- </span>
              <span className="font-bold underline">{profile.schoolName}</span>
            </div>
            <div className="min-w-[160px]">
              <span>केंद्र :-- </span>
              <span className="font-bold underline">{profile.centerCluster}</span>
            </div>
            <div className="min-w-[160px]">
              <span>महिना :-- </span>
              <span className="font-bold underline">
                {monthInfo.mr} {monthInfo.year}
              </span>
            </div>
            <div className="text-right font-bold text-xs text-slate-800">
              <span className="bg-amber-50 border border-slate-300 px-2 py-0.5 rounded text-[10px] sm:text-xs">
                डाळी/कडधान्ये: <strong>कि.ग्रॅ.</strong> | मसाले/मीठ: <strong>ग्रॅम</strong> | पूरक आहार: <strong>नग</strong>
              </span>
            </div>
          </div>

          {/* The 24-Column Official Government Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] sm:text-[10px] official-table border-collapse border border-black text-center font-mono">
              <thead>
                {/* Row 1: Header Titles with Units */}
                <tr className="bg-slate-100 font-bold border-b border-black text-black">
                  <th className="border border-black p-1 w-8 text-center">दिनांक</th>
                  <th className="border border-black p-1 w-28 text-left">तपशील</th>
                  <th className="border border-black p-1 w-12 text-center">
                    दैनिक उपस्थिती / लाभार्थी
                  </th>
                  <th className="border border-black p-1 w-12 text-center">
                    प्रत्यक्ष लाभार्थी / ताटांची संख्या
                  </th>

                  {/* 19 Official Ingredients (Cols 5 to 23) */}
                  {OFFICIAL_REGISTER_COLUMNS.map((col) => {
                    const unitLabel = getColumnUnitLabel(col.id);
                    return (
                      <th
                        key={col.id}
                        className="border border-black p-1 whitespace-nowrap min-w-[38px] max-w-[58px] overflow-hidden text-ellipsis"
                        title={`${col.nameMr} (${unitLabel})`}
                      >
                        <div className="leading-tight">{col.nameMr}</div>
                        <div className="text-[7.5px] font-normal text-slate-700">({unitLabel})</div>
                      </th>
                    );
                  })}

                  {/* Col 24 */}
                  <th className="border border-black p-1 w-16 text-center">
                    लाभार्थी - नुसार होणारा खर्च
                  </th>
                </tr>

                {/* Row 2: Column Numbers 1 to 24 in Marathi digits (Matching Document) */}
                <tr className="bg-slate-200/80 font-bold border-b border-black text-slate-800 text-[8px] sm:text-[9px]">
                  <th className="border border-black py-0.5 px-1">१</th>
                  <th className="border border-black py-0.5 px-1 text-left">२</th>
                  <th className="border border-black py-0.5 px-1">३</th>
                  <th className="border border-black py-0.5 px-1">४</th>
                  {OFFICIAL_REGISTER_COLUMNS.map((col) => (
                    <th key={col.id} className="border border-black py-0.5 px-1">
                      {toMarathiDigits(col.colNum)}
                    </th>
                  ))}
                  <th className="border border-black py-0.5 px-1">२४</th>
                </tr>
              </thead>

              <tbody>
                {/* SECTION 1: Top Stock Rows */}
                {/* Row 1: मागील शिल्लक साहित्य */}
                <tr className="bg-slate-50/50 font-bold border-b border-black text-black">
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-left font-sans font-bold">
                    मागील शिल्लक साहित्य
                  </td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  {OFFICIAL_REGISTER_COLUMNS.map((col) => {
                    const rawVal = inward[col.id]?.openingStockKg || 0;
                    const val = getStockInDisplayUnit(rawVal, col.id);
                    if (val <= 0) return <td key={col.id} className="border border-black p-1">-</td>;
                    return (
                      <td key={col.id} className="border border-black p-1">
                        {isSpice(col.id)
                          ? (val >= 100 ? val.toFixed(0) : val.toFixed(1))
                          : col.id === 'purak_aahar'
                          ? val
                          : val.toFixed(3)}
                      </td>
                    );
                  })}
                  <td className="border border-black p-1">-</td>
                </tr>

                {/* Row 2: प्राप्त साहित्य */}
                <tr className="bg-slate-50/50 font-bold border-b border-black text-black">
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-left font-sans font-bold">
                    प्राप्त साहित्य
                  </td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  {OFFICIAL_REGISTER_COLUMNS.map((col) => {
                    const rawVal = inward[col.id]?.receivedStockKg || 0;
                    const val = getStockInDisplayUnit(rawVal, col.id);
                    if (val <= 0) return <td key={col.id} className="border border-black p-1">-</td>;
                    return (
                      <td key={col.id} className="border border-black p-1">
                        {isSpice(col.id)
                          ? (val >= 100 ? val.toFixed(0) : val.toFixed(1))
                          : col.id === 'purak_aahar'
                          ? val
                          : val.toFixed(3)}
                      </td>
                    );
                  })}
                  <td className="border border-black p-1">-</td>
                </tr>

                {/* Row 3: एकूण साहित्य (Opening + Received) */}
                <tr className="bg-amber-50/40 font-bold border-b-2 border-black text-black">
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-left font-sans font-bold">
                    एकूण साहित्य
                  </td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  {OFFICIAL_REGISTER_COLUMNS.map((col) => {
                    const rawOpen = inward[col.id]?.openingStockKg || 0;
                    const rawRec = inward[col.id]?.receivedStockKg || 0;
                    const tot = getStockInDisplayUnit(rawOpen, col.id) + getStockInDisplayUnit(rawRec, col.id);
                    if (tot <= 0) return <td key={col.id} className="border border-black p-1">-</td>;
                    return (
                      <td key={col.id} className="border border-black p-1 font-black">
                        {isSpice(col.id)
                          ? (tot >= 100 ? tot.toFixed(0) : tot.toFixed(1))
                          : col.id === 'purak_aahar'
                          ? tot
                          : tot.toFixed(3)}
                      </td>
                    );
                  })}
                  <td className="border border-black p-1">-</td>
                </tr>

                {/* SECTION 2: Days 1 to 31 Rows */}
                {Array.from({ length: totalDaysInMonth }).map((_, index) => {
                  const dayNum = index + 1;
                  const dayStr = String(dayNum).padStart(2, '0');
                  const dateKey = `${yearStr}-${monthStr}-${dayStr}`;
                  const d = new Date(`${dateKey}T12:00:00`);
                  const isSunday = d.getDay() === 0;
                  const entry: DailyRegisterEntry | undefined = dailyEntries[dateKey];
                  const dayDisplay = toMarathiDigits(dayNum);

                  if (!entry) {
                    if (isSunday) {
                      return (
                        <tr key={dateKey} className="border-b border-black bg-rose-50/20 text-slate-500">
                          <td className="border border-black p-1 font-bold">{dayDisplay}</td>
                          <td className="border border-black p-1 text-left font-sans text-rose-700">
                            रविवार (सुट्टी)
                          </td>
                          <td className="border border-black p-1">-</td>
                          <td className="border border-black p-1">-</td>
                          {OFFICIAL_REGISTER_COLUMNS.map((col) => (
                            <td key={col.id} className="border border-black p-1 text-slate-300">
                              -
                            </td>
                          ))}
                          <td className="border border-black p-1 text-slate-300">-</td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={dateKey} className="border-b border-black text-slate-500">
                        <td className="border border-black p-1 font-bold">{dayDisplay}</td>
                        <td className="border border-black p-1 text-left font-sans">साहित्य</td>
                        <td className="border border-black p-1">-</td>
                        <td className="border border-black p-1">-</td>
                        {OFFICIAL_REGISTER_COLUMNS.map((col) => (
                          <td key={col.id} className="border border-black p-1 text-slate-300">
                            -
                          </td>
                        ))}
                        <td className="border border-black p-1 text-slate-300">-</td>
                      </tr>
                    );
                  }

                  if (entry.isHoliday) {
                    return (
                      <tr key={dateKey} className="border-b border-black bg-rose-50/30 text-rose-800">
                        <td className="border border-black p-1 font-bold">{dayDisplay}</td>
                        <td className="border border-black p-1 text-left font-sans font-semibold text-rose-700 truncate max-w-[110px]">
                          सुट्टी: {entry.holidayReason || 'शाळा बंद'}
                        </td>
                        <td className="border border-black p-1 font-bold">०</td>
                        <td className="border border-black p-1 font-bold">०</td>
                        {OFFICIAL_REGISTER_COLUMNS.map((col) => (
                          <td key={col.id} className="border border-black p-1 text-slate-300">
                            -
                          </td>
                        ))}
                        <td className="border border-black p-1 font-mono">0.00</td>
                      </tr>
                    );
                  }

                  // Standard MDM serving day
                  return (
                    <tr key={dateKey} className="border-b border-black hover:bg-amber-50/20 text-black">
                      <td className="border border-black p-1 font-bold">{dayDisplay}</td>
                      <td className="border border-black p-1 text-left font-sans">
                        <span>साहित्य</span>
                      </td>
                      <td className="border border-black p-1 font-bold">{entry.studentCount}</td>
                      <td className="border border-black p-1 font-bold">{entry.studentCount}</td>

                      {/* Ingredient quantities: Pulses in KG, Spices in Grams, Purak Aahar in Nag */}
                      {OFFICIAL_REGISTER_COLUMNS.map((col) => {
                        const itemData = entry.items[col.id];
                        if (!itemData) {
                          return (
                            <td key={col.id} className="border border-black p-1 text-slate-300">
                              -
                            </td>
                          );
                        }
                        if (isSpice(col.id)) {
                          const g = itemData.grams || 0;
                          return (
                            <td key={col.id} className="border border-black p-1">
                              {g > 0 ? (g >= 10 ? g.toFixed(1) : g.toFixed(2)) : '-'}
                            </td>
                          );
                        }
                        if (col.id === 'purak_aahar') {
                          const nag = itemData.grams || 0;
                          return (
                            <td key={col.id} className="border border-black p-1 font-bold">
                              {nag > 0 ? nag : '-'}
                            </td>
                          );
                        }
                        const kg = itemData.kg || 0;
                        return (
                          <td key={col.id} className="border border-black p-1">
                            {kg > 0 ? kg.toFixed(3) : '-'}
                          </td>
                        );
                      })}

                      {/* Daily Cost */}
                      <td className="border border-black p-1 font-bold">
                        {entry.totalCookingCost.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* SECTION 3: Summary Rows & Toll Free Note */}
              <tfoot className="font-bold border-t-2 border-black text-black">
                {/* 1. चालू महिन्यात खर्च झालेले एकूण साहित्य */}
                <tr className="bg-slate-100 border-b border-black">
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-left font-sans font-bold">
                    चालू महिन्यात खर्च झालेले एकूण साहित्य
                  </td>
                  <td className="border border-black p-1 font-black">
                    {totalAttendance > 0 ? totalAttendance : '-'}
                  </td>
                  <td className="border border-black p-1 font-black">
                    {totalPlates > 0 ? totalPlates : '-'}
                  </td>
                  {OFFICIAL_REGISTER_COLUMNS.map((col) => {
                    const val = colConsumedTotals[col.id] || 0;
                    if (val <= 0) {
                      return (
                        <td key={col.id} className="border border-black p-1 font-black text-slate-300">
                          -
                        </td>
                      );
                    }
                    if (isSpice(col.id)) {
                      return (
                        <td key={col.id} className="border border-black p-1 font-black text-amber-950">
                          {val >= 100 ? val.toFixed(0) : val.toFixed(1)}
                        </td>
                      );
                    }
                    if (col.id === 'purak_aahar') {
                      return (
                        <td key={col.id} className="border border-black p-1 font-black text-indigo-950">
                          {val}
                        </td>
                      );
                    }
                    return (
                      <td key={col.id} className="border border-black p-1 font-black">
                        {val.toFixed(3)}
                      </td>
                    );
                  })}
                  <td className="border border-black p-1 font-black">
                    {totalMonthCost > 0 ? totalMonthCost.toFixed(2) : '-'}
                  </td>
                </tr>

                {/* 2. अखेर शिल्लक राहिलेले साहित्य */}
                <tr className="bg-slate-200 border-b-2 border-black">
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-left font-sans font-bold">
                    अखेर शिल्लक राहिलेले साहित्य
                  </td>
                  <td className="border border-black p-1">-</td>
                  <td className="border border-black p-1">-</td>
                  {OFFICIAL_REGISTER_COLUMNS.map((col) => {
                    const rawOpen = inward[col.id]?.openingStockKg || 0;
                    const rawRec = inward[col.id]?.receivedStockKg || 0;
                    const openVal = getStockInDisplayUnit(rawOpen, col.id);
                    const recVal = getStockInDisplayUnit(rawRec, col.id);
                    const consumed = colConsumedTotals[col.id] || 0;
                    const closing = openVal + recVal - consumed;
                    const displayVal = isSpice(col.id)
                      ? (closing >= 100 ? closing.toFixed(0) : closing.toFixed(1))
                      : col.id === 'purak_aahar'
                      ? closing.toFixed(0)
                      : closing.toFixed(3);
                    return (
                      <td
                        key={col.id}
                        className={`border border-black p-1 font-black ${
                          closing < 0 ? 'text-rose-700 bg-rose-100' : ''
                        }`}
                      >
                        {displayVal}
                      </td>
                    );
                  })}
                  <td className="border border-black p-1">-</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Official Complaint Toll-Free Helpline Footer (Matching Document exactly) */}
          <div className="mt-3 text-xs sm:text-sm font-bold text-slate-900 border-b border-black pb-2">
            टीप : तक्रार निवारण केंद्र टोल फ्री क्रमांक १८००२३३९९८८
          </div>

          {/* Official Signatures Grid (Cook, MDM Incharge, Headmaster, Inspection Officer) */}
          <div className="grid grid-cols-4 gap-4 text-center mt-6 pt-2 text-xs font-semibold">
            <div className="border-t border-black pt-1">
              <div>स्वयंपाकी / मदतनीस स्वाक्षरी</div>
              <div className="text-[10px] text-slate-600 mt-0.5">({profile.cookName || 'नाव व सही'})</div>
            </div>

            <div className="border-t border-black pt-1">
              <div>शालेय पोषण आहार प्रभारी स्वाक्षरी</div>
              <div className="text-[10px] text-slate-600 mt-0.5">({profile.inchargeTeacher || 'नाव व सही'})</div>
            </div>

            <div className="border-t border-black pt-1">
              <div>मुख्याध्यापक स्वाक्षरी (शाळेचा शिक्का)</div>
              <div className="text-[10px] text-slate-600 mt-0.5">({profile.headmasterName})</div>
            </div>

            <div className="border-t border-black pt-1">
              <div>तपासणी अधिकारी स्वाक्षरी</div>
              <div className="text-[10px] text-slate-500 mt-0.5">केंद्रप्रमुख / विस्तार अधिकारी</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

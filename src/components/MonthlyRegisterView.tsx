import React, { useState, useMemo } from 'react';
import {
  Ingredient,
  DailyRegisterEntry,
  MonthlyStockInward,
  AppData,
  LanguageMode,
} from '../types';
import {
  calculateMonthSummary,
  getMonthNames,
  formatINR,
  formatDateIndian,
} from '../lib/mdm-calculator';
import { exportMonthlyRegisterToExcel } from '../lib/excel-export';
import {
  getColumnUnitLabel,
  getStockInDisplayUnit,
} from '../lib/constants';
import { Button, Badge, Card, StatCard, MonthPicker } from './ui';
import { PageContainer } from './layout/PageContainer';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Calendar,
  Layers,
  Save,
  CheckCircle2,
  PlusCircle,
  PackageCheck,
  ChevronRight,
  Edit3,
  Table,
  SlidersHorizontal,
} from 'lucide-react';

interface MonthlyRegisterViewProps {
  appData: AppData;
  language: LanguageMode;
  onUpdateStockInward: (monthKey: string, inward: MonthlyStockInward) => void;
  onNavigateToDaily: (dateStr?: string) => void;
  onOpenPrintView: (monthKey: string) => void;
}

export const MonthlyRegisterView: React.FC<MonthlyRegisterViewProps> = ({
  appData,
  language,
  onUpdateStockInward,
  onNavigateToDaily,
  onOpenPrintView,
}) => {
  const { profile, ingredients, dailyEntries, stockInward } = appData;

  // Selected Month (YYYY-MM)
  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [unitMode, setUnitMode] = useState<'kg' | 'gm'>('kg');
  const [filterMode, setFilterMode] = useState<'all_days' | 'only_recorded'>('only_recorded');
  const [mobileTab, setMobileTab] = useState<'entries' | 'stock' | 'table'>('entries');
  const [stockEditMode, setStockEditMode] = useState<boolean>(false);
  const [localStock, setLocalStock] = useState<MonthlyStockInward>(() => {
    return stockInward[selectedMonth] || {};
  });
  const [stockSavedNotice, setStockSavedNotice] = useState<boolean>(false);

  // Month info (Marathi & English)
  const monthInfo = useMemo(() => getMonthNames(selectedMonth), [selectedMonth]);

  // Keep localStock in sync when selectedMonth changes
  React.useEffect(() => {
    setLocalStock(stockInward[selectedMonth] || {});
    setStockSavedNotice(false);
  }, [selectedMonth, stockInward]);

  // Calculate Month Summary
  const summary = useMemo(() => {
    return calculateMonthSummary(
      selectedMonth,
      Object.values(dailyEntries),
      stockInward[selectedMonth] || {},
      ingredients
    );
  }, [selectedMonth, dailyEntries, stockInward, ingredients]);

  // Generate calendar days for this month (1 to 28/30/31)
  const daysInMonth = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const dateCount = new Date(year, month, 0).getDate();

    const days = [];
    for (let day = 1; day <= dateCount; day++) {
      const dayStr = String(day).padStart(2, '0');
      const fullDate = `${yearStr}-${monthStr}-${dayStr}`;
      const d = new Date(`${fullDate}T12:00:00`);
      const dayOfWeek = d.getDay();
      const entry = dailyEntries[fullDate];

      days.push({
        dayNumber: day,
        fullDate,
        dayOfWeek,
        isSunday: dayOfWeek === 0,
        entry,
      });
    }
    return days;
  }, [selectedMonth, dailyEntries]);

  // Filtered days list
  const displayedDays = useMemo(() => {
    if (filterMode === 'only_recorded') {
      return daysInMonth.filter((d) => !!d.entry);
    }
    return daysInMonth;
  }, [daysInMonth, filterMode]);

  // Save stock inward handler
  const handleSaveStock = () => {
    onUpdateStockInward(selectedMonth, localStock);
    setStockSavedNotice(true);
    setStockEditMode(false);
    setTimeout(() => setStockSavedNotice(false), 3000);
  };

  const handleStockInputChange = (
    ingredientId: string,
    field: 'openingStockKg' | 'receivedStockKg',
    value: number
  ) => {
    setLocalStock((prev) => ({
      ...prev,
      [ingredientId]: {
        openingStockKg:
          field === 'openingStockKg'
            ? value
            : prev[ingredientId]?.openingStockKg || 0,
        receivedStockKg:
          field === 'receivedStockKg'
            ? value
            : prev[ingredientId]?.receivedStockKg || 0,
      },
    }));
  };

  return (
    <PageContainer>
      {/* Top Banner & Action Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-5">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="warning" size="md">
              शासकीय नमुना भाग - २
            </Badge>
            <span className="text-xs text-slate-500 font-mono">
              UDISE: {profile.udiseNumber || 'नोंदणी आवश्यक'}
            </span>
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
            मासिक खर्च नोंदवही व साठा पत्रक
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 truncate">
            {profile.schoolName} • केंद्र: {profile.centerCluster}
          </p>
        </div>

        {/* Month Selector & Direct Download Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          {/* Month selector using MonthPicker primitive */}
          <MonthPicker
            id="month-selector"
            value={selectedMonth}
            onChange={setSelectedMonth}
            className="w-full sm:w-64"
          />

          {/* Action buttons: side-by-side on mobile, inline on tablet/desktop */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            {/* Excel Export using Button primitive */}
            <Button
              id="export-excel-btn"
              variant="emerald"
              size="md"
              onClick={() => exportMonthlyRegisterToExcel(selectedMonth, appData)}
              leftIcon={<FileSpreadsheet className="w-4 h-4 shrink-0" />}
              className="w-full sm:w-auto text-xs sm:text-sm"
              title="Export official ledger to Excel .xlsx"
            >
              Excel (.xlsx)
            </Button>

            {/* Official Report Print / PDF View using Button primitive */}
            <Button
              id="open-official-report-btn"
              variant="primary"
              size="md"
              onClick={() => onOpenPrintView(selectedMonth)}
              leftIcon={<Printer className="w-4 h-4 shrink-0" />}
              className="w-full sm:w-auto text-xs sm:text-sm"
              title="Open Official Government Report Part-2 (Print / Save as PDF)"
            >
              शासकीय अहवाल
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards using StatCard primitive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <StatCard
          label="कामाचे दिवस"
          value={
            <>
              {summary.totalWorkingDays}{' '}
              <span className="text-xs font-normal text-slate-500">दिवस</span>
            </>
          }
        />

        <StatCard
          label="एकूण लाभार्थी"
          variant="amber"
          value={
            <>
              {summary.totalBeneficiaries.toLocaleString('en-IN')}{' '}
              <span className="text-xs font-normal text-slate-500">वि.</span>
            </>
          }
        />

        <StatCard
          label="डाळ व कडधान्य"
          value={
            <>
              {summary.totalGrainsPulsesKg.toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-500">kg</span>
            </>
          }
        />

        <StatCard
          label="भाजीपाला वापर"
          value={
            <>
              {summary.totalVegetablesKg.toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-500">kg</span>
            </>
          }
        />

        <StatCard
          label="एकूण खर्च (@ ₹२.३६)"
          variant="amber"
          className="col-span-2 sm:col-span-1"
          value={formatINR(summary.totalCost)}
        />
      </div>

      {/* View Switcher Controls (Mobile Segmented Nav & Desktop Options) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Mobile View Switcher (Segmented buttons for Phone) */}
        <div className="flex md:hidden bg-slate-200/80 p-1 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setMobileTab('entries')}
            className={`flex-1 py-2 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[40px] ${
              mobileTab === 'entries'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="truncate">दैनिक ({summary.totalWorkingDays})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('stock')}
            className={`flex-1 py-2 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[40px] ${
              mobileTab === 'stock'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="truncate">साठा पत्रक</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('table')}
            className={`flex-1 py-2 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[40px] ${
              mobileTab === 'table'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="truncate">तक्ता</span>
          </button>
        </div>

        {/* Action Button: Create New Daily Entry */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateToDaily()}
            className="h-11 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs cursor-pointer active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>नवीन नोंद करा (New Entry)</span>
          </button>

          {/* Unit Switcher */}
          <div className="hidden sm:flex items-center bg-white border border-slate-200 rounded-xl p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setUnitMode('kg')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                unitMode === 'kg'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              किलो (kg)
            </button>
            <button
              type="button"
              onClick={() => setUnitMode('gm')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                unitMode === 'gm'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ग्रॅम (gm)
            </button>
          </div>

          {/* Filter Switcher */}
          <div className="hidden sm:flex items-center bg-white border border-slate-200 rounded-xl p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode('only_recorded')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                filterMode === 'only_recorded'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              नोंदी झालेले दिवस ({summary.totalWorkingDays})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all_days')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                filterMode === 'all_days'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              १ ते ३१ सर्व दिवस
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE VIEW 1: Clean Daily Cards for phones (Visible if mobileTab === 'entries' on mobile, or alongside on desktop) */}
      <div className={`space-y-4 ${mobileTab !== 'entries' ? 'hidden md:block' : 'block'}`}>
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-700 shrink-0" />
                <span>दैनिक नोंदी यादी ({monthInfo.mr} {monthInfo.year})</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                बदल करण्यासाठी किंवा तपासण्यासाठी कोणत्याही नोंदीवर टॅप करा
              </p>
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl shrink-0">
              {displayedDays.filter((d) => !!d.entry).length} दिवस नोंदवले
            </span>
          </div>

          {/* Cards for each recorded day */}
          <div className="p-3 sm:p-6 space-y-2.5 sm:space-y-3">
            {displayedDays.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                या महिन्यात कोणतीही नोंद आढळली नाही.
              </div>
            ) : (
              displayedDays.map(({ dayNumber, fullDate, dayOfWeek, isSunday, entry }) => {
                const dayNames = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
                const dayLabel = dayNames[dayOfWeek];

                if (!entry) {
                  return (
                    <div
                      key={fullDate}
                      className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400 gap-2"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-lg sm:rounded-xl bg-slate-100 text-slate-400 font-bold flex items-center justify-center font-mono text-xs sm:text-sm shrink-0">
                          {dayNumber}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-600">{dayLabel}</span>
                          <span className="text-slate-400 ml-1.5 text-[11px]">
                            {isSunday ? '(रविवार - सुट्टी)' : 'नोंद केलेली नाही'}
                          </span>
                        </div>
                      </div>
                      {!isSunday && (
                        <button
                          type="button"
                          onClick={() => onNavigateToDaily(fullDate)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg sm:rounded-xl text-[11px] sm:text-xs transition-colors cursor-pointer shrink-0"
                        >
                          + नोंद करा
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={fullDate}
                    onClick={() => onNavigateToDaily(fullDate)}
                    className="p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-amber-400 bg-white hover:bg-amber-50/30 transition-all cursor-pointer shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 flex flex-col items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                        <span>{dayNumber}</span>
                        <span className="text-[9px] sm:text-[10px] font-normal leading-none text-amber-700">
                          {dayLabel.slice(0, 3)}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {formatDateIndian(fullDate)}
                          </span>
                          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">({dayLabel})</span>
                          {entry.isHoliday ? (
                            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-md font-bold">
                              सुट्टी
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold">
                              {entry.studentCount} विद्यार्थी
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 truncate">
                          {entry.isHoliday ? (
                            <span>{entry.holidayReason || 'शाळा बंद'}</span>
                          ) : (
                            <span>
                              मेन्यू: <strong className="text-slate-800">{entry.dishNameMr}</strong> • डाळ/धान्य: {entry.totalGrainsPulsesKg.toFixed(3)} kg
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-[10px] sm:text-xs text-slate-400 block font-sans">
                          खर्च (@ ₹२.३६)
                        </span>
                        <span className="text-sm sm:text-lg font-black text-amber-900 font-mono">
                          {formatINR(entry.totalCookingCost)}
                        </span>
                      </div>

                      <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:text-amber-800 hover:bg-amber-100 transition-colors shrink-0 min-w-[34px] min-h-[34px] flex items-center justify-center">
                        <Edit3 className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MOBILE VIEW 2: Stock Ledger (Opening, Received, Consumed, Closing) */}
      <div className={`space-y-4 ${mobileTab !== 'stock' ? 'hidden md:block' : 'block'}`}>
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
          <div className="p-4 sm:px-6 sm:py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-amber-700 shrink-0" />
                <span>साठा पत्रक: शिल्लक व प्राप्त माल</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                मागील शिल्लक (Opening) आणि चालू महिन्यात प्राप्त साहित्य (Received)
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {stockSavedNotice && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>साठा जतन झाला!</span>
                </span>
              )}

              {stockEditMode ? (
                <button
                  type="button"
                  onClick={handleSaveStock}
                  className="min-h-[44px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                >
                  <Save className="w-4 h-4" />
                  <span>साठा जतन करा (Save)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStockEditMode(true)}
                  className="min-h-[44px] px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <span>साठा संपादित करा (Edit Stock)</span>
                </button>
              )}
            </div>
          </div>

          {/* Stock items list on mobile */}
          <div className="p-3 sm:p-6 block md:hidden space-y-3">
            {ingredients.map((ing) => {
              const itemSummary = summary.itemConsumptions[ing.id] || {
                totalKg: 0,
                totalCost: 0,
                openingStockKg: 0,
                receivedStockKg: 0,
                totalAvailableKg: 0,
                closingBalanceKg: 0,
              };

              const displayUnit = ing.unit === 'nag' ? 'नग' : 'kg';

              const rawOpening = stockEditMode
                ? localStock[ing.id]?.openingStockKg ?? itemSummary.openingStockKg
                : itemSummary.openingStockKg;

              const rawReceived = stockEditMode
                ? localStock[ing.id]?.receivedStockKg ?? itemSummary.receivedStockKg
                : itemSummary.receivedStockKg;

              const currentOpening = getStockInDisplayUnit(rawOpening, ing.id);
              const currentReceived = getStockInDisplayUnit(rawReceived, ing.id);
              const currentAvailable = Number((currentOpening + currentReceived).toFixed(ing.unit === 'nag' ? 0 : 3));

              const consumedVal = ing.unit === 'nag'
                ? Number(itemSummary.totalKg.toFixed(0))
                : Number(itemSummary.totalKg.toFixed(3));

              const currentClosing = Number((currentAvailable - consumedVal).toFixed(ing.unit === 'nag' ? 0 : 3));
              const isNegative = currentClosing < 0;

              return (
                <div
                  key={ing.id}
                  className="p-3 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      {ing.nameMr}
                    </span>
                    <span className="text-[11px] text-slate-600 font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded">
                      {ing.defaultGrams} {ing.unit === 'nag' ? 'नग' : ing.unit === 'ml' ? 'ml' : 'g'}/वि.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">मागील शिल्लक (Opening)</span>
                      {stockEditMode ? (
                        <input
                          type="number"
                          step={ing.unit === 'nag' ? '1' : '0.001'}
                          min="0"
                          value={currentOpening || ''}
                          onChange={(e) =>
                            handleStockInputChange(ing.id, 'openingStockKg', parseFloat(e.target.value) || 0)
                          }
                          className="w-full mt-1 px-2 min-h-[38px] font-mono bg-blue-50 border border-blue-300 rounded-lg text-sm font-bold touch-manipulation"
                        />
                      ) : (
                        <span className="font-bold font-mono text-slate-800 text-sm mt-0.5 block">
                          {currentOpening.toFixed(ing.unit === 'nag' ? 0 : 3)} {displayUnit}
                        </span>
                      )}
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">प्राप्त माल (Received)</span>
                      {stockEditMode ? (
                        <input
                          type="number"
                          step={ing.unit === 'nag' ? '1' : '0.001'}
                          min="0"
                          value={currentReceived || ''}
                          onChange={(e) =>
                            handleStockInputChange(ing.id, 'receivedStockKg', parseFloat(e.target.value) || 0)
                          }
                          className="w-full mt-1 px-2 min-h-[38px] font-mono bg-emerald-50 border border-emerald-300 rounded-lg text-sm font-bold touch-manipulation"
                        />
                      ) : (
                        <span className="font-bold font-mono text-slate-800 text-sm mt-0.5 block">
                          {currentReceived.toFixed(ing.unit === 'nag' ? 0 : 3)} {displayUnit}
                        </span>
                      )}
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">मासिक वापर (Consumed)</span>
                      <span className="font-bold font-mono text-amber-900 text-sm mt-0.5 block">
                        {consumedVal.toFixed(ing.unit === 'nag' ? 0 : 3)} {displayUnit}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${isNegative ? 'bg-rose-50 border-rose-300' : 'bg-amber-50 border-amber-200'}`}>
                      <span className="text-slate-500 block text-[11px]">अखेर शिल्लक (Closing)</span>
                      <span className={`font-black font-mono text-sm mt-0.5 block ${isNegative ? 'text-rose-600' : 'text-slate-900'}`}>
                        {currentClosing.toFixed(ing.unit === 'nag' ? 0 : 3)} {displayUnit}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Stock Table */}
          <div className="hidden md:block p-6 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">साहित्य नाव</th>
                  <th className="py-3 px-4 text-center">एकक (Unit)</th>
                  <th className="py-3 px-4 text-right bg-blue-50/40">मागील शिल्लक (Opening)</th>
                  <th className="py-3 px-4 text-right bg-emerald-50/40">प्राप्त साहित्य (Received)</th>
                  <th className="py-3 px-4 text-right bg-slate-50 font-bold">एकूण उपलब्ध</th>
                  <th className="py-3 px-4 text-right text-amber-900">मासिक खर्च (Consumed)</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900 bg-amber-50/50">अखेर शिल्लक (Closing)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {ingredients.map((ing) => {
                  const itemSummary = summary.itemConsumptions[ing.id] || {
                    totalKg: 0,
                    totalCost: 0,
                    openingStockKg: 0,
                    receivedStockKg: 0,
                    totalAvailableKg: 0,
                    closingBalanceKg: 0,
                  };

                  const rawOpening = stockEditMode
                    ? localStock[ing.id]?.openingStockKg ?? itemSummary.openingStockKg
                    : itemSummary.openingStockKg;

                  const rawReceived = stockEditMode
                    ? localStock[ing.id]?.receivedStockKg ?? itemSummary.receivedStockKg
                    : itemSummary.receivedStockKg;

                  const currentOpening = getStockInDisplayUnit(rawOpening, ing.id);
                  const currentReceived = getStockInDisplayUnit(rawReceived, ing.id);
                  const currentAvailable = Number((currentOpening + currentReceived).toFixed(ing.unit === 'nag' ? 0 : 3));

                  const consumedVal = ing.unit === 'nag'
                    ? Number(itemSummary.totalKg.toFixed(0))
                    : Number(itemSummary.totalKg.toFixed(3));

                  const currentClosing = Number((currentAvailable - consumedVal).toFixed(ing.unit === 'nag' ? 0 : 3));
                  const isNegative = currentClosing < 0;

                  return (
                    <tr key={ing.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                        {ing.nameMr}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                          {ing.unit === 'nag' ? 'नग' : 'किलो (kg)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right bg-blue-50/20">
                        {stockEditMode ? (
                          <input
                            type="number"
                            step={ing.unit === 'nag' ? '1' : '0.001'}
                            min="0"
                            value={currentOpening || ''}
                            onChange={(e) =>
                              handleStockInputChange(ing.id, 'openingStockKg', parseFloat(e.target.value) || 0)
                            }
                            className="w-24 px-2 py-1 text-right font-mono bg-white border border-blue-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span>{currentOpening.toFixed(ing.unit === 'nag' ? 0 : 3)}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right bg-emerald-50/20">
                        {stockEditMode ? (
                          <input
                            type="number"
                            step={ing.unit === 'nag' ? '1' : '0.001'}
                            min="0"
                            value={currentReceived || ''}
                            onChange={(e) =>
                              handleStockInputChange(ing.id, 'receivedStockKg', parseFloat(e.target.value) || 0)
                            }
                            className="w-24 px-2 py-1 text-right font-mono bg-white border border-emerald-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                          />
                        ) : (
                          <span>{currentReceived.toFixed(ing.unit === 'nag' ? 0 : 3)}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-800">
                        {currentAvailable.toFixed(ing.unit === 'nag' ? 0 : 3)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-amber-900">
                        {consumedVal.toFixed(ing.unit === 'nag' ? 0 : 3)}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-black ${isNegative ? 'text-rose-600 bg-rose-50' : 'text-slate-900 bg-amber-50/50'}`}>
                        {currentClosing.toFixed(ing.unit === 'nag' ? 0 : 3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MOBILE VIEW 3 & Desktop Matrix: Full 20-Column Official Ledger Table */}
      <div className={`space-y-4 ${mobileTab !== 'table' ? 'hidden md:block' : 'block'}`}>
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
          <div className="p-4 sm:px-6 sm:py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <Table className="w-5 h-5 text-amber-700 shrink-0" />
                <span>शासकीय नमुना भाग-२ संपूर्ण तक्ता</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {monthInfo.mr} {monthInfo.year} मधील सर्व दिवसांचा सविस्तर हिशोब
              </p>
            </div>
            <span className="text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 font-medium md:hidden self-start">
              तक्ता पाहण्यासाठी डावीकडे/उजवीकडे सरकवा 👉
            </span>
          </div>

          <div className="overflow-x-auto touch-pan-x">
            <table className="w-full text-xs text-left border-collapse min-w-[1100px]">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-3 border-r border-slate-200 text-center w-12">दिनांक</th>
                  <th className="py-3 px-3 border-r border-slate-200 w-16 text-center">वार</th>
                  <th className="py-3 px-3 border-r border-slate-200 text-right w-16 bg-amber-50/50">लाभार्थी</th>
                  <th className="py-3 px-3 border-r border-slate-200 min-w-[140px]">मेन्यू (आहार)</th>
                  {ingredients.map((ing) => {
                    const unitLabel = ing.unit === 'nag'
                      ? 'नग'
                      : unitMode === 'gm'
                      ? 'ग्रॅम'
                      : 'कि.ग्रॅ.';
                    return (
                      <th key={ing.id} className="py-3 px-2 border-r border-slate-200 text-right whitespace-nowrap min-w-[75px]">
                        <div>{ing.nameMr}</div>
                        <div className="text-[10px] font-normal text-slate-500">[{unitLabel}]</div>
                      </th>
                    );
                  })}
                  <th className="py-3 px-3 text-right bg-amber-100/50 text-amber-950 font-bold min-w-[100px]">दैनिक खर्च (@ ₹२.३६)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {displayedDays.map(({ dayNumber, fullDate, dayOfWeek, isSunday, entry }) => {
                  const dayNames = ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
                  const dayLabel = dayNames[dayOfWeek];

                  if (!entry) {
                    return (
                      <tr key={fullDate} className={`hover:bg-slate-50/80 transition-colors ${isSunday ? 'bg-rose-50/30 text-slate-400' : 'text-slate-500'}`}>
                        <td className="py-2.5 px-3 text-center font-bold border-r border-slate-200">{dayNumber}</td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200">{dayLabel}</td>
                        <td className="py-2.5 px-3 text-right border-r border-slate-200 text-slate-400 bg-amber-50/20">-</td>
                        <td className="py-2.5 px-3 border-r border-slate-200 font-sans text-slate-400">{isSunday ? 'रविवार (सुट्टी)' : 'नोंद नाही'}</td>
                        {ingredients.map((ing) => (
                          <td key={ing.id} className="py-2.5 px-2 text-right border-r border-slate-200 text-slate-300">-</td>
                        ))}
                        <td className="py-2.5 px-3 text-right border-r border-slate-200 text-slate-300">-</td>
                      </tr>
                    );
                  }

                  if (entry.isHoliday) {
                    return (
                      <tr key={fullDate} className="bg-rose-50/30 text-rose-800 hover:bg-rose-50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold border-r border-slate-200">{dayNumber}</td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 font-semibold">{dayLabel}</td>
                        <td className="py-2.5 px-3 text-right border-r border-slate-200 font-bold text-rose-600 bg-amber-50/20">०</td>
                        <td colSpan={ingredients.length + 1} className="py-2.5 px-3 border-r border-slate-200 font-sans text-rose-700 italic">
                          सुट्टी: {entry.holidayReason || 'शाळा बंद'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">₹0.00</td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={fullDate} className="hover:bg-amber-50/40 transition-colors text-slate-800">
                      <td className="py-2.5 px-3 text-center font-bold border-r border-slate-200">
                        <button
                          type="button"
                          onClick={() => onNavigateToDaily(fullDate)}
                          className="text-amber-800 hover:underline cursor-pointer font-bold"
                          title="Click to edit"
                        >
                          {dayNumber}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-200 font-sans">{dayLabel}</td>
                      <td className="py-2.5 px-3 text-right border-r border-slate-200 font-bold text-amber-950 bg-amber-50/40">
                        {entry.studentCount}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 font-sans font-semibold text-slate-800 truncate max-w-[160px]">
                        {entry.dishNameMr}
                      </td>
                      {ingredients.map((ing) => {
                        const itemData = entry.items[ing.id];
                        if (!itemData || itemData.grams === 0) {
                          return (
                            <td key={ing.id} className="py-2.5 px-2 text-right border-r border-slate-200 text-slate-300">-</td>
                          );
                        }
                        const val = ing.unit === 'nag'
                          ? `${itemData.grams} नग`
                          : unitMode === 'gm'
                          ? `${itemData.grams.toLocaleString('en-IN')} g`
                          : `${itemData.kg.toFixed(3)} kg`;
                        return (
                          <td key={ing.id} className="py-2.5 px-2 text-right border-r border-slate-200 text-slate-800">
                            {val}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-bold text-amber-950 bg-amber-50/30">
                        {formatINR(entry.totalCookingCost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

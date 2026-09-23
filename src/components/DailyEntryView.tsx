import React, { useState, useMemo, useEffect } from 'react';
import {
  Ingredient,
  DishRecipe,
  DailyRegisterEntry,
  LanguageMode,
} from '../types';
import {
  calculateDayConsumption,
  getDayInfo,
  formatINR,
  formatDateIndian,
} from '../lib/mdm-calculator';
import {
  Calendar,
  Users,
  Utensils,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Coffee,
  Info,
  Layers,
  Plus,
  Minus,
} from 'lucide-react';

interface DailyEntryViewProps {
  ingredients: Ingredient[];
  recipes: DishRecipe[];
  dailyEntries: Record<string, DailyRegisterEntry>;
  language: LanguageMode;
  initialDate?: string;
  onSaveEntry: (entry: DailyRegisterEntry) => void;
  onDeleteEntry: (dateKey: string) => void;
  onNavigateToRegister: () => void;
}

export const DailyEntryView: React.FC<DailyEntryViewProps> = ({
  ingredients,
  recipes,
  dailyEntries,
  language,
  initialDate,
  onSaveEntry,
  onDeleteEntry,
  onNavigateToRegister,
}) => {
  // Today's date string YYYY-MM-DD
  const todayStr = useMemo(() => {
    if (initialDate) return initialDate;
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [initialDate]);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedDishId, setSelectedDishId] = useState<string>('');
  const [studentCount, setStudentCount] = useState<number>(70);
  const [isHoliday, setIsHoliday] = useState<boolean>(false);
  const [holidayReason, setHolidayReason] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [showDetailedRates, setShowDetailedRates] = useState<boolean>(false);

  // Derive day info from selected date
  const dayInfo = useMemo(() => getDayInfo(selectedDate), [selectedDate]);

  // When date changes, auto-select default dish for that day of week
  useEffect(() => {
    const existing = dailyEntries[selectedDate];
    if (existing) {
      setStudentCount(existing.studentCount);
      setSelectedDishId(existing.dishId);
      setIsHoliday(!!existing.isHoliday);
      setHolidayReason(existing.holidayReason || '');
      setRemarks(existing.remarks || '');
    } else {
      const matched = recipes.find((r) => r.dayOfWeek === dayInfo.dayOfWeek);
      if (matched) {
        setSelectedDishId(matched.id);
      } else if (recipes.length > 0) {
        setSelectedDishId(recipes[0].id);
      }
      setIsHoliday(dayInfo.dayOfWeek === 0);
      if (dayInfo.dayOfWeek === 0) {
        setHolidayReason('रविवार (साप्ताहिक सुट्टी)');
        setStudentCount(0);
      } else {
        setHolidayReason('');
        setStudentCount(70);
      }
      setRemarks('');
    }
    setSaveSuccessMsg(null);
  }, [selectedDate, dailyEntries, recipes, dayInfo.dayOfWeek]);

  // Active recipe
  const activeRecipe = useMemo(() => {
    return recipes.find((r) => r.id === selectedDishId) || recipes[0];
  }, [recipes, selectedDishId]);

  // Reactive Calculation
  const calculation = useMemo(() => {
    if (isHoliday || studentCount <= 0 || !activeRecipe) {
      return {
        studentCount: 0,
        dishId: activeRecipe?.id || '',
        dishNameMr: activeRecipe?.nameMr || '',
        dishNameEn: activeRecipe?.nameEn || '',
        items: [],
        totalGrainsPulsesKg: 0,
        totalVegetablesKg: 0,
        totalCookingCost: 0,
      };
    }
    return calculateDayConsumption(studentCount, activeRecipe, ingredients);
  }, [studentCount, activeRecipe, ingredients, isHoliday]);

  const existingEntry = dailyEntries[selectedDate];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const itemsMap: DailyRegisterEntry['items'] = {};
    calculation.items.forEach((item) => {
      itemsMap[item.ingredientId] = {
        grams: item.totalGrams,
        kg: item.totalKg,
        rate: item.ratePerKg,
        cost: item.cost,
      };
    });

    const entryToSave: DailyRegisterEntry = {
      id: selectedDate,
      date: selectedDate,
      dayOfWeek: dayInfo.dayOfWeek,
      dayNameMr: dayInfo.dayNameMr,
      dayNameEn: dayInfo.dayNameEn,
      dishId: activeRecipe.id,
      dishNameMr: activeRecipe.nameMr,
      dishNameEn: activeRecipe.nameEn,
      studentCount: isHoliday ? 0 : studentCount,
      isHoliday,
      holidayReason: isHoliday ? holidayReason : undefined,
      items: itemsMap,
      totalGrainsPulsesKg: calculation.totalGrainsPulsesKg,
      totalVegetablesKg: calculation.totalVegetablesKg,
      totalCookingCost: calculation.totalCookingCost,
      remarks: remarks || 'दैनिक पोषण आहार वाटप पूर्ण',
      savedAt: new Date().toISOString(),
    };

    onSaveEntry(entryToSave);
    setSaveSuccessMsg(
      existingEntry
        ? `दिनांक ${formatDateIndian(selectedDate)} ची नोंद यशस्वीरित्या अद्ययावत केली!`
        : `दिनांक ${formatDateIndian(selectedDate)} ची नोंद यशस्वीरित्या जतन केली!`
    );

    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 4000);
  };

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Recent entries
  const recentEntries = useMemo(() => {
    return (Object.values(dailyEntries) as DailyRegisterEntry[])
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [dailyEntries]);

  const adjustStudents = (delta: number) => {
    setStudentCount((prev) => Math.max(0, prev + delta));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Toast Notification */}
      {saveSuccessMsg && (
        <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-sm font-semibold animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="text-xs bg-white text-emerald-900 hover:bg-emerald-50 font-bold px-3 py-1.5 rounded-xl transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <span>नोंदवहीत पहा</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: Form (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleSave}
            className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden"
          >
            {/* Card Header with Breathing Room */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-amber-700" />
                  <span>
                    {language === 'en' ? 'Daily Register Entry' : 'दैनिक पोषण आहार नोंद'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  उपस्थित विद्यार्थी संख्या व मेन्यू निवडा
                </p>
              </div>

              {existingEntry && (
                <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full">
                  नोंद अस्तित्वात आहे
                </span>
              )}
            </div>

            <div className="p-6 space-y-6">
              {/* 1. Date Picker & Day Badge */}
              <div className="space-y-2">
                <label
                  htmlFor="daily-entry-date"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  १. तारीख व वार (Date & Day)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    id="daily-entry-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-12 bg-slate-50 border border-slate-300 rounded-xl px-4 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                    required
                  />
                  <div className="h-12 bg-amber-50 border border-amber-200/90 rounded-xl px-4 flex items-center justify-center text-center">
                    <div>
                      <span className="block text-xs font-bold text-amber-900">
                        {dayInfo.dayNameMr}
                      </span>
                      <span className="block text-[11px] text-amber-700 font-medium">
                        {dayInfo.dayNameEn}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Holiday Checkbox */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <input
                    id="is-holiday-check"
                    type="checkbox"
                    checked={isHoliday}
                    onChange={(e) => setIsHoliday(e.target.checked)}
                    className="w-5 h-5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <label
                    htmlFor="is-holiday-check"
                    className="text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    शाळा सुट्टी / आहार वाटप नाही (Holiday)
                  </label>
                </div>
                {isHoliday && (
                  <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                    सुट्टी
                  </span>
                )}
              </div>

              {isHoliday ? (
                <div className="space-y-1.5">
                  <label
                    htmlFor="holiday-reason"
                    className="block text-xs font-bold text-slate-700"
                  >
                    सुट्टीचे कारण (Reason):
                  </label>
                  <input
                    id="holiday-reason"
                    type="text"
                    value={holidayReason}
                    onChange={(e) => setHolidayReason(e.target.value)}
                    placeholder="उदा. रविवार, स्थानिक सुट्टी, सण..."
                    className="w-full h-12 bg-slate-50 border border-slate-300 rounded-xl px-4 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              ) : (
                <>
                  {/* 2. Menu Dish Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="dish-select"
                        className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                      >
                        २. मेन्यू आहार प्रकार (Dish / Menu)
                      </label>
                      <span className="text-[11px] text-amber-800 font-semibold">
                        वारानुसार चक्राकार मेन्यू
                      </span>
                    </div>

                    <select
                      id="dish-select"
                      value={selectedDishId}
                      onChange={(e) => setSelectedDishId(e.target.value)}
                      className="w-full h-12 bg-slate-50 border border-slate-300 rounded-xl px-4 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                    >
                      {recipes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.dayNameMr}: {r.nameMr}
                        </option>
                      ))}
                    </select>

                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        कडधान्य: <strong>{activeRecipe?.nameMr}</strong> ({activeRecipe?.pulseGrams}g) + तांदूळ ({activeRecipe?.riceGrams}g)
                      </span>
                    </p>
                  </div>

                  {/* 3. Beneficiary Student Count - Mobile Centric Big Stepper */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="student-count-input"
                        className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                      >
                        ३. लाभार्थी विद्यार्थी संख्या (Students)
                      </label>
                      <span className="text-[11px] font-mono text-slate-400">
                        प्रत्यक्ष उपस्थित
                      </span>
                    </div>

                    {/* Numeric Display & Direct Input */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Users className="w-6 h-6 text-amber-600" />
                      </div>
                      <input
                        id="student-count-input"
                        type="number"
                        min="0"
                        max="1000"
                        value={studentCount === 0 ? '' : studentCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setStudentCount(isNaN(val) ? 0 : Math.max(0, val));
                        }}
                        placeholder="0"
                        className="w-full h-16 bg-slate-50 border-2 border-amber-300 rounded-2xl pl-14 pr-16 text-3xl font-black text-slate-900 tracking-tight focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-600 transition-all"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-xs font-bold text-slate-400">
                          विद्यार्थी
                        </span>
                      </div>
                    </div>

                    {/* Thumb-friendly Mobile Stepper Buttons with 44px+ height */}
                    <div className="grid grid-cols-5 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => adjustStudents(-10)}
                        className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
                      >
                        -10
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustStudents(-5)}
                        className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustStudents(1)}
                        className="h-11 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer border border-amber-300"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustStudents(5)}
                        className="h-11 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer border border-amber-300"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustStudents(10)}
                        className="h-11 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer border border-amber-300"
                      >
                        +10
                      </button>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-1.5 pt-1">
                    <label
                      htmlFor="entry-remarks"
                      className="block text-xs font-semibold text-slate-600"
                    >
                      शेरा / नोंदी (Remarks - पर्यायी):
                    </label>
                    <input
                      id="entry-remarks"
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="उदा. ताजे व गरमागरम अन्न वाटप"
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </>
              )}

              {/* Action Submit Button */}
              <div className="pt-2">
                <button
                  id="save-daily-entry-btn"
                  type="submit"
                  className={`w-full h-14 rounded-2xl text-sm sm:text-base font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 ${
                    existingEntry
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {existingEntry
                      ? 'नोंद अद्ययावत करा (Update Entry)'
                      : 'नोंद नोंदवहीत जतन करा (Save Entry)'}
                  </span>
                </button>
                {existingEntry && (
                  <p className="text-center text-[11px] text-amber-800 mt-2 font-medium">
                    * या तारखेची जुनी नोंद नवीन माहितीनुसार बदलली जाईल.
                  </p>
                )}
              </div>
            </div>
          </form>

          {/* Quick Info Box */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 text-xs text-amber-950 space-y-2">
            <h4 className="font-bold flex items-center gap-1.5 text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>महाराष्ट्र शासन शालेय पोषण आहार नियमावली</span>
            </h4>
            <p className="text-slate-600 leading-relaxed">
              प्राथमिक शाळा (१ली ते ५वी) साठी प्रति विद्यार्थी तांदूळ १०० ग्रॅम, कडधान्य २० ग्रॅम, भाजीपाला ५० ग्रॅम, तेल ५ ग्रॅम व मसाले ५ ग्रॅम प्रमाणे दैनंदिन हिशोब केला जातो.
            </p>
          </div>
        </div>

        {/* Right Column: Live Instant Consumption & Mobile-Friendly Cards (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
            {/* Header with Dark Luxury Contrast */}
            <div className="bg-slate-900 text-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <h3 className="font-bold text-base sm:text-lg text-white">
                    {language === 'en'
                      ? 'Live Consumption & Cost'
                      : 'दैनिक लागणारा एकूण शिधा व साहित्य मोजदाद'}
                  </h3>
                </div>
                <span className="text-xs bg-slate-800 text-amber-300 font-mono px-3 py-1 rounded-lg border border-slate-700">
                  {formatDateIndian(selectedDate)} • {dayInfo.dayNameMr}
                </span>
              </div>

              {/* 3 Prominent Physical Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Pulses / Grains */}
                <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4">
                  <span className="text-[11px] text-slate-400 block font-medium">
                    एकूण डाळ व धान्य
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                      {calculation.totalGrainsPulsesKg.toFixed(3)}
                    </span>
                    <span className="text-xs font-bold text-amber-400">kg</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    तांदूळ + {activeRecipe?.nameMr}
                  </span>
                </div>

                {/* 2. Total Vegetables */}
                <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4">
                  <span className="text-[11px] text-slate-400 block font-medium">
                    एकूण भाजीपाला
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                      {calculation.totalVegetablesKg.toFixed(3)}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">kg</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    भाजीपाला (५०g) + वाटाणा (२०g)
                  </span>
                </div>

                {/* 3. Beneficiaries & Physical Items Count */}
                <div className="bg-slate-800/90 border border-amber-500/40 rounded-2xl p-4">
                  <span className="text-[11px] text-amber-300 block font-medium">
                    एकूण लाभार्थी विद्यार्थी
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                      {studentCount}
                    </span>
                    <span className="text-xs font-bold text-slate-300 ml-1">विद्यार्थी</span>
                  </div>
                  <span className="text-[10px] text-amber-200/80 block mt-1">
                    {calculation.items.length} साहित्याचे भौतिक प्रमाण
                  </span>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-5 sm:p-6 space-y-6">
              {isHoliday ? (
                <div className="py-12 text-center text-slate-500">
                  <Coffee className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-bold text-slate-700 text-sm">शाळेला सुट्टी चिन्हांकित केली आहे</p>
                  <p className="text-xs text-slate-400 mt-1">
                    कारण: {holidayReason || 'साप्ताहिक सुट्टी'}
                  </p>
                </div>
              ) : studentCount === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-bold text-slate-700 text-sm">
                    कृपया लाभार्थी विद्यार्थ्यांची संख्या टाका
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    संख्या टाकल्याबरोबर सर्व साहित्याचे ग्रॅम, किलो आणि खर्च थेट दिसेल.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Essential Daily Rations Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        स्वयंपाकासाठी लागणारा मुख्य शिधा (Essential Rations):
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {studentCount} विद्यार्थी
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Rice */}
                      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-slate-600 uppercase">
                          तांदूळ (Rice)
                        </span>
                        <div className="my-2">
                          <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                            {((studentCount * (activeRecipe?.riceGrams ?? 100)) / 1000).toFixed(3)}
                          </span>
                          <span className="text-xs font-bold text-amber-700 ml-1">kg</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {activeRecipe?.riceGrams ?? 100}g/वि.
                        </span>
                      </div>

                      {/* Pulse */}
                      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-slate-600 uppercase truncate">
                          {activeRecipe?.nameMr}
                        </span>
                        <div className="my-2">
                          <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                            {((studentCount * (activeRecipe?.pulseGrams ?? 20)) / 1000).toFixed(3)}
                          </span>
                          <span className="text-xs font-bold text-amber-700 ml-1">kg</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {activeRecipe?.pulseGrams ?? 20}g/वि.
                        </span>
                      </div>

                      {/* Oil */}
                      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-slate-600 uppercase">
                          खाद्यतेल (Oil)
                        </span>
                        <div className="my-2">
                          <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                            {((studentCount * 5) / 1000).toFixed(3)}
                          </span>
                          <span className="text-xs font-bold text-amber-700 ml-1">kg</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          ५g/वि.
                        </span>
                      </div>

                      {/* Vegetables */}
                      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-slate-600 uppercase">
                          भाजीपाला (Veg)
                        </span>
                        <div className="my-2">
                          <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                            {calculation.totalVegetablesKg.toFixed(3)}
                          </span>
                          <span className="text-xs font-bold text-emerald-700 ml-1">kg</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          ६५g भाजी+वाटाणा
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Detailed Ingredients */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowDetailedRates(!showDetailedRates)}
                      className="text-xs text-slate-700 hover:text-amber-800 font-bold flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-amber-700" />
                      <span>
                        {showDetailedRates
                          ? 'तपशीलवार साहित्य प्रमाण तक्ता लपवा'
                          : 'सर्व साहित्याचे सविस्तर प्रमाण तक्ता पहा'}
                      </span>
                      {showDetailedRates ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <span className="text-[11px] text-slate-400 hidden sm:inline font-medium">
                      प्रमाणानुसार स्वयंचलित मोजणी
                    </span>
                  </div>

                  {/* Detailed Items View */}
                  {showDetailedRates && (
                    <div className="space-y-4 pt-2 animate-in fade-in">
                      {/* Mobile Card List (Phones: sm:hidden) */}
                      <div className="block sm:hidden space-y-2">
                        {calculation.items.map((item) => (
                          <div
                            key={item.ingredientId}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">
                                {item.nameMr}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                प्रति वि.: {item.gramsPerStudent} {item.ingredientId === 'purak_aahar' ? 'नग' : item.ingredientId === 'oil' ? 'ml' : 'g'}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-amber-950 block font-mono text-sm">
                                {item.ingredientId === 'purak_aahar'
                                  ? `${item.totalGrams} नग`
                                  : `${item.totalKg.toFixed(3)} kg`}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ({item.totalGrams.toLocaleString('en-IN')} {item.ingredientId === 'oil' ? 'ml' : 'g'})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table (Tablets and Desktops: hidden sm:block) */}
                      <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-2xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                            <tr>
                              <th className="py-3 px-4">साहित्य नाव</th>
                              <th className="py-3 px-4">प्रवर्ग</th>
                              <th className="py-3 px-4 text-right">प्रति विद्यार्थी प्रमाण</th>
                              <th className="py-3 px-4 text-right">एकूण ग्रॅम / ml</th>
                              <th className="py-3 px-4 text-right font-bold text-amber-950 bg-amber-50/70">
                                एकूण आवश्यक प्रमाण (kg / नग)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 font-mono">
                            {calculation.items.map((item) => (
                              <tr
                                key={item.ingredientId}
                                className="hover:bg-amber-50/30 transition-colors"
                              >
                                <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                                  {item.nameMr}
                                </td>
                                <td className="py-2.5 px-4 font-sans text-slate-500 text-[11px]">
                                  {item.category}
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  {item.gramsPerStudent} {item.ingredientId === 'purak_aahar' ? 'नग' : item.ingredientId === 'oil' ? 'ml' : 'g'}
                                </td>
                                <td className="py-2.5 px-4 text-right font-semibold">
                                  {item.totalGrams.toLocaleString('en-IN')} {item.ingredientId === 'oil' ? 'ml' : 'g'}
                                </td>
                                <td className="py-2.5 px-4 text-right font-bold text-amber-950 bg-amber-50/50">
                                  {item.ingredientId === 'purak_aahar'
                                    ? `${item.totalGrams} नग`
                                    : `${item.totalKg.toFixed(3)} kg`}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recent Entries */}
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-700" />
                <span>अलीकडील जतन नोंदी (Recent Entries)</span>
              </h3>
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="text-xs text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>सर्व नोंदी पहा</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentEntries.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                अद्याप कोणतीही नोंद जतन केलेली नाही.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentEntries.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 flex flex-col items-center justify-center font-bold text-xs shrink-0">
                        <span>{item.date.split('-')[2]}</span>
                        <span className="text-[9px] font-normal leading-none text-amber-700">
                          {item.dayNameMr.slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                          <span>{formatDateIndian(item.date)}</span>
                          <span className="text-slate-400 font-normal">({item.dayNameMr})</span>
                          {item.isHoliday && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">
                              सुट्टी
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5 truncate">
                          {item.isHoliday ? (
                            <span>{item.holidayReason || 'सुट्टी'}</span>
                          ) : (
                            <span>
                              {item.dishNameMr} • <strong>{item.studentCount}</strong> वि. •{' '}
                              <span className="text-amber-800 font-bold">
                                {item.totalGrainsPulsesKg.toFixed(3)} kg धान्य
                              </span>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedDate(item.date)}
                        className="p-2 text-slate-500 hover:text-amber-800 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit entry"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const ask1 = confirm(
                            language === 'en'
                              ? `First Confirmation (विचारणा १): Are you sure you want to delete the daily entry for ${formatDateIndian(item.date)}?`
                              : `पहिले पुष्टीकरण (विचारणा १): दिनांक ${formatDateIndian(item.date)} ची नोंद खरोखर हटवायची आहे का?`
                          );
                          if (!ask1) return;

                          const ask2 = confirm(
                            language === 'en'
                              ? `Second & Final Confirmation (विचारणा २): Do you really want to permanently delete this daily entry? This cannot be undone.`
                              : `दुसरे व अंतिम पुष्टीकरण (विचारणा २): आपण खरोखर ही नोंद कायमची नष्ट करू इच्छिता? ही कृती मागे घेता येणार नाही.`
                          );
                          if (ask2) {
                            onDeleteEntry(item.date);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

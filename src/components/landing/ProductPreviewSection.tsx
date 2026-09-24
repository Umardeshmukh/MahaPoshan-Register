import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  PackageCheck,
  DollarSign,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Download,
  Printer,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Plus,
  Minus,
} from 'lucide-react';

export const ProductPreviewSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'meal-entry' | 'stock' | 'rates' | 'report'>('dashboard');

  // Preview interactive state
  const [demoMealCount, setDemoMealCount] = useState(152);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'meal-entry', label: 'Daily Meal Entry', icon: CalendarCheck },
    { id: 'stock', label: 'Stock Ledger', icon: PackageCheck },
    { id: 'rates', label: 'Cooking Cost', icon: DollarSign },
    { id: 'report', label: 'Monthly Report (Part-2)', icon: FileSpreadsheet },
  ] as const;

  return (
    <section id="preview" className="py-20 sm:py-28 bg-slate-50/60 border-t border-slate-200/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Interactive Application Preview</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Explore the Real{' '}
            <span className="text-emerald-700">MahaPoshan Interface</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Switch between core application views below to experience how intuitive, responsive, and audit-ready the actual software feels.
          </p>

          {/* Interactive Navigation Tabs */}
          <div className="pt-4 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/20 scale-[1.02]'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Large Mockup Container */}
        <div className="bg-white rounded-3xl p-4 sm:p-7 shadow-2xl shadow-emerald-950/10 border border-slate-200/90 max-w-5xl mx-auto min-h-[500px]">
          {/* Simulated App Header Ribbon */}
          <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-100 flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-extrabold text-slate-900">जि. प. प्राथमिक शाळा, बोरगाव</span>
              <span className="text-slate-400 font-mono hidden sm:inline">• UDISE: 27251403201</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-lg border border-emerald-200/80">
                शैक्षणिक वर्ष: 2026-2027
              </span>
              <span className="bg-slate-100 text-slate-700 font-mono font-semibold px-2 py-1 rounded-lg hidden sm:inline">
                महिना: ऑगस्ट २०२६
              </span>
            </div>
          </div>

          {/* TAB 1: DASHBOARD PREVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">आजचे लाभार्थी</span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-0.5 block">
                    {demoMealCount}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">नोंद पूर्ण</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">तांदूळ वापर</span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-amber-900 mt-0.5 block">
                    {((demoMealCount * 100) / 1000).toFixed(2)} kg
                  </span>
                  <span className="text-[10px] text-slate-500">@ १०० ग्रॅम / वि.</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">डाळ / कडधान्य</span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-emerald-800 mt-0.5 block">
                    {((demoMealCount * 20) / 1000).toFixed(3)} kg
                  </span>
                  <span className="text-[10px] text-slate-500">@ २० ग्रॅम / वि.</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">दैनिक खर्च</span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-blue-900 mt-0.5 block">
                    ₹{(demoMealCount * 2.36).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500">@ ₹२.३६ / ताट</span>
                </div>
              </div>

              {/* Today's Meal Banner */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">आजचा मेन्यू</span>
                  <h4 className="text-lg font-black text-slate-900 mt-0.5">
                    बुधवार: मटकी उसळ भात (Sprouted Matki Usal Rice)
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    तांदूळ, मटकी उसळ, जिरे, मोहरी, हळद, तिखट, मीठ व खाद्यतेल प्रमाणबद्ध समाविष्ट.
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shrink-0">
                  Cycle Day 3
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: DAILY MEAL ENTRY PREVIEW */}
          {activeTab === 'meal-entry' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <span className="text-xs font-bold text-slate-500">दैनिक पोषण आहार नोंद (Daily Meal Entry)</span>
                    <h4 className="text-lg font-bold text-slate-900">बुधवार, २० ऑगस्ट २०२६</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg font-bold">
                      शाळा सुरू
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-500 block">प्रत्यक्ष जेवणारे लाभार्थी संख्या (Meals Served):</span>
                    <span className="text-3xl font-black font-mono text-emerald-900">{demoMealCount} लाभार्थी</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDemoMealCount((p) => Math.max(10, p - 5))}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold font-mono active:scale-95"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoMealCount((p) => Math.max(10, p - 1))}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold font-mono active:scale-95"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoMealCount((p) => p + 1)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold font-mono active:scale-95"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoMealCount((p) => p + 5)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold font-mono active:scale-95"
                    >
                      +5
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STOCK LEDGER PREVIEW */}
          {activeTab === 'stock' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 font-bold text-xs text-slate-800 flex justify-between">
                  <span>साठा पत्रक (Inventory Ledger)</span>
                  <span>ऑगस्ट २०२६</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 block font-bold">तांदूळ (Rice)</strong>
                      <span className="text-[11px] text-slate-500">मागील शिल्लक: २५.००० kg | प्राप्त माल: १००.००० kg</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-800 text-sm block">८९.५०० kg</span>
                      <span className="text-[10px] text-slate-400">अखेर शिल्लक (Closing)</span>
                    </div>
                  </div>

                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 block font-bold">मटकी (Matki Pulses)</strong>
                      <span className="text-[11px] text-slate-500">मागील शिल्लक: १०.००० kg | प्राप्त माल: २०.००० kg</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-800 text-sm block">२२.८०० kg</span>
                      <span className="text-[10px] text-slate-400">अखेर शिल्लक (Closing)</span>
                    </div>
                  </div>

                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 block font-bold">खाद्यतेल (Edible Oil)</strong>
                      <span className="text-[11px] text-slate-500">मागील शिल्लक: ५.००० L | प्राप्त माल: १५.००० L</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-800 text-sm block">१४.२५० L</span>
                      <span className="text-[10px] text-slate-400">अखेर शिल्लक (Closing)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COOKING COST PREVIEW */}
          {activeTab === 'rates' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-amber-950 text-sm">थेट खर्च सिम्युलेटर (Live Cost Simulator)</h4>
                  <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    ₹२.३६ / विद्यार्थी
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-amber-200">
                    <span className="text-slate-500">इयत्ता १ ली ते ५ वी</span>
                    <span className="text-lg font-black font-mono text-slate-900 block mt-1">₹२.३६ / ताट</span>
                    <span className="text-[10px] text-slate-400">इंधन व भाजीपाला खर्च</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-200">
                    <span className="text-slate-500">इयत्ता ६ वी ते ८ वी</span>
                    <span className="text-lg font-black font-mono text-slate-900 block mt-1">₹८.१७ / ताट</span>
                    <span className="text-[10px] text-slate-400">उच्च प्राथमिक composite norm</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-200">
                    <span className="text-slate-500">एकूण मासिक अंदाज</span>
                    <span className="text-lg font-black font-mono text-emerald-800 block mt-1">₹८,३८२.७२</span>
                    <span className="text-[10px] text-emerald-600">२४ कामकाजाचे दिवस</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MONTHLY REPORT PREVIEW */}
          {activeTab === 'report' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="border border-slate-300 rounded-2xl p-4 bg-white text-xs">
                <div className="text-center pb-3 border-b border-black mb-3">
                  <span className="font-black text-sm block">शासकीय नमुना भाग-२ (धान्यादी मालाचे हिशोब)</span>
                  <span className="text-[11px] text-slate-600">प्रधानमंत्री पोषणशक्ती निर्माण योजना • पृष्ठ क्र. ४३</span>
                </div>

                <div className="overflow-x-auto touch-pan-x">
                  <table className="w-full text-center border-collapse border border-slate-300 text-[10px] min-w-[500px]">
                    <thead className="bg-slate-100 font-bold">
                      <tr>
                        <th className="border border-slate-300 p-1.5">दिनांक</th>
                        <th className="border border-slate-300 p-1.5">वार</th>
                        <th className="border border-slate-300 p-1.5">लाभार्थी</th>
                        <th className="border border-slate-300 p-1.5">तांदूळ (kg)</th>
                        <th className="border border-slate-300 p-1.5">डाळ (kg)</th>
                        <th className="border border-slate-300 p-1.5">खर्च (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      <tr>
                        <td className="border border-slate-300 p-1">०१/०८</td>
                        <td className="border border-slate-300 p-1">सोम</td>
                        <td className="border border-slate-300 p-1 font-bold">१४८</td>
                        <td className="border border-slate-300 p-1">१४.८००</td>
                        <td className="border border-slate-300 p-1">२.९६०</td>
                        <td className="border border-slate-300 p-1">₹३४९.२८</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-1">०२/०८</td>
                        <td className="border border-slate-300 p-1">मंगळ</td>
                        <td className="border border-slate-300 p-1 font-bold">१५०</td>
                        <td className="border border-slate-300 p-1">१५.०००</td>
                        <td className="border border-slate-300 p-1">३.०००</td>
                        <td className="border border-slate-300 p-1">₹३५४.००</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono">४ स्वाक्षऱ्या समाविष्ट (Cook, Incharge, HM, Officer)</span>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200 flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" />
                      Excel (.xlsx)
                    </span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-800 font-bold rounded-lg border border-blue-200 flex items-center gap-1">
                      <Printer className="w-3.5 h-3.5" />
                      Print PDF
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

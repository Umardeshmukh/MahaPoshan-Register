import React, { useState } from 'react';
import {
  Users,
  Calculator,
  Package,
  DollarSign,
  FileSpreadsheet,
  Download,
  Languages,
  Cloud,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface FeatureItem {
  id: string;
  number: string;
  title: string;
  shortDesc: string;
  detail: string;
  icon: React.ElementType;
  badge: string;
  previewData: {
    label1: string;
    val1: string;
    label2: string;
    val2: string;
    status: string;
    pill: string;
  };
}

export const FeatureShowcaseSection: React.FC = () => {
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>('daily-entry');

  const features: FeatureItem[] = [
    {
      id: 'daily-entry',
      number: '01',
      title: 'Daily Meal Entry',
      shortDesc: 'Quickly record daily meals served.',
      detail:
        'Input meal beneficiary counts in seconds with touch stepper buttons (+1, +5, +10). Toggle school holidays or special meal occasions with one click.',
      icon: Users,
      badge: 'Single-Tap Entry',
      previewData: {
        label1: 'Today Meals Served',
        val1: '148 Beneficiaries',
        label2: 'Active Ratio',
        val2: '97.4%',
        status: 'Beneficiaries Confirmed',
        pill: 'Live Tally',
      },
    },
    {
      id: 'calculations',
      number: '02',
      title: 'Automatic Calculations',
      shortDesc: 'Automatically calculate required grain and food quantities.',
      detail:
        'Instant calculations for all 19 statutory ingredients down to fractional grams (Rice 100g, Pulses 20g, Oil 5ml, Cumin 0.1g, Salt 1g) conforming to Schedule-II.',
      icon: Calculator,
      badge: 'Zero Math Errors',
      previewData: {
        label1: 'Rice Required',
        val1: '14.800 kg',
        label2: 'Pulses Required',
        val2: '2.960 kg',
        status: 'Schedule-II Norms Applied',
        pill: '19 Commodities',
      },
    },
    {
      id: 'stock',
      number: '03',
      title: 'Stock Management',
      shortDesc: 'Track opening stock, consumption and closing balance.',
      detail:
        'Real-time inventory ledger: Opening Stock + Received Inward - Consumed = Closing Stock. Automatic deficit warning if inventory falls below zero.',
      icon: Package,
      badge: 'Real-Time Ledger',
      previewData: {
        label1: 'Available Stock',
        val1: '124.50 kg',
        label2: 'Net Closing',
        val2: '109.70 kg',
        status: 'Inventory Fully Balanced',
        pill: 'Zero Discrepancy',
      },
    },
    {
      id: 'cooking_cost',
      number: '04',
      title: 'Cooking Cost Management',
      shortDesc: 'Simplify daily/monthly cooking-cost calculations.',
      detail:
        'Pre-configured Government cooking subsidy norms (@ ₹2.36 fuel/vegetable cost, ₹5.45 composite primary norm, or ₹8.17 upper primary norm).',
      icon: DollarSign,
      badge: 'Govt Norm Compliant',
      previewData: {
        label1: 'Daily Subsidy',
        val1: '₹349.28',
        label2: 'Statutory Rate',
        val2: '₹2.36 / student',
        status: 'Formula Auto-Calculated',
        pill: 'Govt Rate',
      },
    },
    {
      id: 'monthly_reports',
      number: '05',
      title: 'Monthly Reports',
      shortDesc: 'Generate structured monthly reports automatically.',
      detail:
        'Aggregates every day of the month into an official 24-column register format. No copying numbers across log sheets at the end of the month.',
      icon: FileSpreadsheet,
      badge: 'Part-2 Booklet',
      previewData: {
        label1: 'Working Days',
        val1: '24 Days',
        label2: 'Total Meals Served',
        val2: '3,552 Plates',
        status: 'Schedule-II Part-2 Ready',
        pill: '24 Columns',
      },
    },
    {
      id: 'export',
      number: '06',
      title: 'PDF & Excel Export',
      shortDesc: 'Download reports for printing, sharing and record keeping.',
      detail:
        'One-click downloads of beautifully styled .xlsx Excel files with formatted borders, plus certified landscape A4 PDF documents matching Government Page 43.',
      icon: Download,
      badge: 'Print Ready',
      previewData: {
        label1: 'Excel (.xlsx)',
        val1: 'Color-Coded Sheet',
        label2: 'PDF Booklet',
        val2: 'Page 43 Format',
        status: 'Signed & Certified Ready',
        pill: 'Instant Export',
      },
    },
    {
      id: 'marathi',
      number: '07',
      title: 'Marathi-Friendly Interface',
      shortDesc: 'Keep the experience simple and accessible for Maharashtra schools.',
      detail:
        'Built specifically for Maharashtra educators with bilingual English/Marathi terminology, local dish names (मटकी उसळ, मूग डाळ खिचडी), and intuitive UI.',
      icon: Languages,
      badge: 'Bilingual Support',
      previewData: {
        label1: 'Menu Selection',
        val1: 'मटकी उसळ भात',
        label2: 'Language Mode',
        val2: 'मराठी / English',
        status: 'Tailored for Maharashtra',
        pill: 'Local Context',
      },
    },
    {
      id: 'cloud_backup',
      number: '08',
      title: 'Cloud Backup & Offline Sync',
      shortDesc: 'Keep important records securely available.',
      detail:
        'Operate without internet connection in rural regions. Browser LocalStorage retains all daily entries and automatically syncs to Supabase cloud upon reconnection.',
      icon: Cloud,
      badge: 'Offline-First',
      previewData: {
        label1: 'Cloud Status',
        val1: 'Encrypted & Synced',
        label2: 'Offline Cache',
        val2: 'LocalStorage Safe',
        status: 'Zero Data Loss Guaranteed',
        pill: 'Auto-Sync',
      },
    },
  ];

  const activeFeature = features.find((f) => f.id === selectedFeatureId) || features[0];

  return (
    <section id="features" className="py-20 sm:py-28 bg-slate-50/70 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300/80 text-emerald-900 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Core Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Engineered for Every Step of{' '}
            <span className="text-emerald-700">School Nutrition</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            From daily meal entries to official certified audit reports, explore the tools that automate your workflow.
          </p>
        </div>

        {/* 8-Card Interactive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-10">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isSelected = selectedFeatureId === feature.id;

            return (
              <div
                key={feature.id}
                onClick={() => setSelectedFeatureId(feature.id)}
                className={`group p-5 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-emerald-500 shadow-xl shadow-emerald-950/10 scale-[1.02] ring-2 ring-emerald-500/20'
                    : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-emerald-300 shadow-xs hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 text-emerald-800 group-hover:bg-emerald-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-emerald-700 transition-colors">
                      {feature.number}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 mb-1 leading-snug group-hover:text-emerald-800 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    {feature.shortDesc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {feature.badge}
                  </span>
                  <span
                    className={`font-semibold transition-colors flex items-center gap-0.5 ${
                      isSelected ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  >
                    <span>View</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Feature Preview Drawer */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-500/30 shadow-xl shadow-emerald-950/5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left detail */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full font-mono">
                  Feature #{activeFeature.number}
                </span>
                <span className="text-xs font-semibold text-slate-500">Live Simulation</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {activeFeature.title}
              </h3>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {activeFeature.detail}
              </p>

              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Fully automated, Schedule-II compliant, and mobile-ready.</span>
              </div>
            </div>

            {/* Right micro-preview */}
            <div className="lg:col-span-6">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-700 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold tracking-wide">MahaPoshan Engine Output</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                    {activeFeature.previewData.pill}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                    <span className="text-[11px] text-slate-400 block font-medium">
                      {activeFeature.previewData.label1}
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-emerald-300 mt-0.5 block">
                      {activeFeature.previewData.val1}
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                    <span className="text-[11px] text-slate-400 block font-medium">
                      {activeFeature.previewData.label2}
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-amber-300 mt-0.5 block">
                      {activeFeature.previewData.val2}
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{activeFeature.previewData.status}</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 font-bold">100% Synced</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

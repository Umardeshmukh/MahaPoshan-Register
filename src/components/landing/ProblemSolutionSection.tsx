import React, { useState } from 'react';
import {
  XCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  RotateCcw,
} from 'lucide-react';

export const ProblemSolutionSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'both' | 'before' | 'after'>('both');

  const beforeItems = [
    {
      title: 'Manual Paper Registers',
      desc: 'Scribbled physical pages prone to ink smudges, tearing, and lost historical sheets.',
    },
    {
      title: 'Repeated Arithmetic Calculations',
      desc: 'Multiplying 0.1g cumin seeds, 20g pulses, and ₹2.36 cooking rates by 148 students every day.',
    },
    {
      title: 'Manual Stock Reconciliations',
      desc: 'Calculating opening + received - consumed by hand often results in balance errors.',
    },
    {
      title: 'Tedious Monthly Report Compilation',
      desc: 'Spending 3 to 4 hours at the end of every month re-copying numbers into 24-column registers.',
    },
    {
      title: 'Risk of Calculation Mistakes',
      desc: 'Minor arithmetic errors lead to audit objections and inspection discrepancies.',
    },
    {
      title: 'Time-Consuming Paperwork',
      desc: 'Teachers lose 30 to 45 minutes of valuable instructional time every single afternoon.',
    },
  ];

  const afterItems = [
    {
      title: 'Digital Daily Entries in Seconds',
      desc: 'Enter just one number—the daily meals served—and everything updates instantly.',
    },
    {
      title: 'Automatic Statutory Calculations',
      desc: 'Exact fractional grams and kilograms calculated automatically according to Schedule-II norms.',
    },
    {
      title: 'Live Real-Time Stock Tracking',
      desc: 'Automatic inventory deductions; immediate alerts if closing balances turn negative.',
    },
    {
      title: 'Instant Official Part-2 Reports',
      desc: 'Official 24-column Government Booklet Page 43 format compiled with one click.',
    },
    {
      title: 'Pixel-Perfect PDF & Excel Export',
      desc: 'Download formatted .xlsx workbooks and certified landscape print documents on demand.',
    },
    {
      title: 'Less Repetitive Work, More Teaching',
      desc: 'Teachers reclaim their afternoons to focus on classrooms and student learning.',
    },
  ];

  return (
    <section id="problem-solution" className="py-20 sm:py-28 bg-white border-y border-slate-200/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>The Transformation</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            From Paper Frustration to{' '}
            <span className="text-emerald-700">Digital Simplicity</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Compare the daily reality of manual record keeping with the streamlined simplicity of MahaPoshan Register.
          </p>

          {/* Mobile View Toggle */}
          <div className="pt-2 sm:hidden inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('both')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'both' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Side by Side
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('before')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'before' ? 'bg-rose-100 text-rose-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Before
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('after')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'after' ? 'bg-emerald-100 text-emerald-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              With MahaPoshan
            </button>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* LEFT: Before MahaPoshan */}
          <div
            className={`rounded-3xl p-6 sm:p-8 border border-rose-200/80 bg-gradient-to-b from-rose-50/50 via-white to-slate-50 transition-all ${
              activeTab === 'after' ? 'hidden md:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-rose-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Before MahaPoshan</h3>
                  <span className="text-xs text-rose-700 font-semibold">Manual Paperwork & Discrepancies</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-rose-600 bg-rose-100/80 px-2.5 py-1 rounded-full">
                ~45 mins / day
              </span>
            </div>

            <div className="space-y-4">
              {beforeItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-white/80 border border-rose-100/80">
                  <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{item.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-rose-100 text-center">
              <span className="text-xs text-rose-800 font-medium">
                High stress during surprise inspections & audit checks
              </span>
            </div>
          </div>

          {/* RIGHT: With MahaPoshan */}
          <div
            className={`rounded-3xl p-6 sm:p-8 border-2 border-emerald-500 bg-gradient-to-b from-emerald-50/70 via-white to-emerald-50/20 shadow-xl shadow-emerald-950/5 transition-all relative ${
              activeTab === 'before' ? 'hidden md:block' : 'block'
            }`}
          >
            {/* Top Recommended Tag */}
            <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-md tracking-wider uppercase">
              The Modern Way
            </div>

            <div className="flex items-center justify-between pb-4 mb-6 border-b border-emerald-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-700/20">
                  <CheckCircle2 className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">With MahaPoshan</h3>
                  <span className="text-xs text-emerald-800 font-semibold">100% Automated & Accurate</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                &lt; 60 seconds
              </span>
            </div>

            <div className="space-y-4">
              {afterItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-emerald-200/90 shadow-xs"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{item.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-100 text-center">
              <span className="text-xs text-emerald-800 font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Always inspection-ready with certified Part-2 records
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

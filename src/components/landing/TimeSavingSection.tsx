import React from 'react';
import {
  Clock,
  Zap,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export const TimeSavingSection: React.FC = () => {
  // Computed data points
  const manualSteps = [
    { title: '1. Count Meal Beneficiaries', time: '~10 Mins', detail: 'Tallying physical meal records and beneficiary counts across classes' },
    { title: '2. Manual Arithmetic', time: '~15 Mins', detail: 'Multiplying 19 ingredient gram allowances by hand' },
    { title: '3. Balance Checking', time: '~10 Mins', detail: 'Cross-checking stock balances against physical grain storage' },
    { title: '4. Report Compilation', time: '~15 Mins', detail: 'Re-transcribing 24 columns for inspection sheets' },
  ];

  const mahaPoshanSteps = [
    { title: '1. Enter Meals Served', time: '10 Seconds', detail: 'Type daily meals served count on mobile or desktop' },
    { title: '2. Instant Auto-Processing', time: 'Instant (0s)', detail: 'All 19 statutory ingredients & costs calculate in milliseconds' },
    { title: '3. Certified Report Ready', time: '1 Click', detail: 'Download official Schedule-II Part-2 PDF or Excel file' },
  ];

  return (
    <section id="time-saving" className="py-20 sm:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-emerald-700" />
            <span>Process Comparison</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Manual Work vs.{' '}
            <span className="text-emerald-700">MahaPoshan</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Compare the multi-step manual paperwork process with automated single-input processing.
          </p>
        </div>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto">
          {/* Manual Process Card */}
          <div className="rounded-3xl p-6 sm:p-8 bg-slate-50 border border-slate-200/90 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Manual Process</h3>
                    <span className="text-xs text-slate-500">Traditional pen & paper method</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                  Multiple Steps Daily
                </span>
              </div>

              <div className="space-y-3">
                {manualSteps.map((step, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">{step.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{step.detail}</p>
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                      {step.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-center">
              <span className="text-xs text-slate-500">
                Cumulative time lost across multiple physical logbooks every single day.
              </span>
            </div>
          </div>

          {/* MahaPoshan Process Card */}
          <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-emerald-50/80 via-white to-emerald-50/30 border-2 border-emerald-500 shadow-xl shadow-emerald-950/5 flex flex-col justify-between relative">
            <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-md uppercase tracking-wider">
              Automated Flow
            </div>

            <div>
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">With MahaPoshan</h3>
                    <span className="text-xs text-emerald-800 font-semibold">Single-point digital processing</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                  Instant Output
                </span>
              </div>

              <div className="space-y-3">
                {mahaPoshanSteps.map((step, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-2xl border border-emerald-200/90 shadow-2xs flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{step.title}</span>
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">{step.detail}</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                      {step.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-100 text-center">
              <span className="text-xs font-bold text-emerald-800">
                ✓ Zero student limits: instant calculation for schools of any size, from 10 to unlimited students.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

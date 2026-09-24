import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Utensils,
  Calculator,
  Package,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import gsap from 'gsap';

export const WorkflowSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const steps = [
    {
      id: 0,
      title: '1. Daily Meal Entry',
      sub: 'Beneficiary Meal Count',
      icon: Users,
      desc: 'Teacher logs the count of students served meals today (e.g. 148 beneficiaries) with single-tap stepper buttons.',
      preview: {
        title: 'Step 1: Meals Logged',
        stat: '148 Beneficiaries Served',
        detail: 'Class 1 to 5 • Primary Section',
      },
    },
    {
      id: 1,
      title: '2. Meal Selection',
      sub: 'Automatic Recipe Mapping',
      icon: Utensils,
      desc: 'System detects the designated day of the week and loads the approved recipe (e.g. Wednesday: Sprouted Matki Usal Rice).',
      preview: {
        title: 'Step 2: Wednesday Menu',
        stat: 'मटकी उसळ भात (Matki Usal)',
        detail: 'Pre-set in 6-Day Menu Cycle',
      },
    },
    {
      id: 2,
      title: '3. Automatic Calculation',
      sub: 'Schedule-II Norms Engine',
      icon: Calculator,
      desc: 'The engine instantly calculates exact weights for 19 commodities: 14.80 kg Rice, 2.96 kg Pulses, 0.74 kg Oil, 0.015 kg Cumin, ₹349.28 Cooking Cost.',
      preview: {
        title: 'Step 3: Instant Calculation',
        stat: '14.800 kg Rice • 2.960 kg Pulses',
        detail: 'Cooking Cost: ₹349.28 (@ ₹2.36)',
      },
    },
    {
      id: 3,
      title: '4. Stock Update',
      sub: 'Inventory Ledger Balancing',
      icon: Package,
      desc: 'Deducts consumption from total available inventory (Opening + Inward). Live closing balance is updated with zero manual paperwork.',
      preview: {
        title: 'Step 4: Stock Reconciled',
        stat: 'Closing: 109.70 kg Rice',
        detail: 'Available: 124.50 kg - 14.80 kg',
      },
    },
    {
      id: 4,
      title: '5. Monthly Report',
      sub: 'Official Part-2 Register',
      icon: FileSpreadsheet,
      desc: 'All 24 school days automatically compile into Government Format Part-2 Page 43, ready for physical printing, PDF export, or colored Excel download.',
      preview: {
        title: 'Step 5: Official Report Ready',
        stat: '24 Columns • Certified Format',
        detail: 'Ready for Headmaster Signature & Seal',
      },
    },
  ];

  // Smooth transition when changing active step
  const activeContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeContentRef.current) return;
    gsap.fromTo(
      activeContentRef.current,
      { opacity: 0.8, y: 6 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
    );
  }, [activeStep]);

  return (
    <section id="workflow" ref={containerRef} className="py-20 sm:py-28 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Interactive Workflow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            From Entry to Report in{' '}
            <span className="text-emerald-700">5 Simple Steps</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            See how daily beneficiary meal entries automatically flow through the statutory calculation engine to assemble certified government reports.
          </p>
        </div>

        {/* 5-Step Cards Navigation */}
        <div className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              const isPast = activeStep > step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-700/20 ring-2 ring-emerald-500 ring-offset-2'
                      : isPast
                      ? 'bg-emerald-50/70 text-slate-900 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isActive
                          ? 'bg-white text-emerald-800'
                          : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-emerald-700 text-emerald-100'
                          : isPast
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Step {step.id + 1}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm leading-snug">{step.title}</h4>
                    <span
                      className={`text-[11px] block mt-0.5 ${
                        isActive ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      {step.sub}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Stage Simulation Showcase */}
        <div ref={activeContentRef} className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-700 relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Stage Explanation */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active Process Phase: Step {activeStep + 1} of 5</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white">
                {steps[activeStep].title}
              </h3>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                {steps[activeStep].desc}
              </p>

              {/* Progress Stepper Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                >
                  Previous Step
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStep((prev) => (prev + 1) % steps.length)}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>{activeStep === 4 ? 'Restart Flow' : 'Next Step'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Stage Live Data Mockup */}
            <div className="lg:col-span-5">
              <div className="bg-slate-800/90 rounded-2xl p-5 sm:p-6 border border-slate-700 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-xs">
                  <span className="font-mono text-emerald-400 font-bold uppercase tracking-wider">
                    {steps[activeStep].preview.title}
                  </span>
                  <span className="text-[10px] text-slate-400">Automated Pipeline</span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-400 block font-medium">Computed Metric</span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-white">
                    {steps[activeStep].preview.stat}
                  </div>
                  <span className="text-xs text-emerald-300 block font-medium">
                    {steps[activeStep].preview.detail}
                  </span>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60 text-xs text-slate-300 space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-400 font-bold">100% Verified</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Norm Compliance:</span>
                    <span className="text-white">Maharashtra Schedule-II</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

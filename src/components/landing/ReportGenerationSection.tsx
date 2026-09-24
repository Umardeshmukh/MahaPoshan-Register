import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  Play,
  RotateCcw,
  FileCheck,
  Table,
} from 'lucide-react';

export const ReportGenerationSection: React.FC = () => {
  const [generatingState, setGeneratingState] = useState<'idle' | 'processing' | 'ready'>('ready');
  const [progress, setProgress] = useState(100);

  const handleSimulateGeneration = () => {
    setGeneratingState('processing');
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setGeneratingState('ready');
          return 100;
        }
        return prev + 25;
      });
    }, 250);
  };

  return (
    <section id="report-generation" className="py-20 sm:py-28 bg-slate-900 text-white relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold font-mono">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Automated Document Generation</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Your Monthly Report,{' '}
            <span className="text-emerald-400">Ready in Moments.</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-300">
            Witness how 24 days of daily meal records automatically assemble into certified Government Part-2 registers without a single manual calculation.
          </p>
        </div>

        {/* Interactive Generation Simulation Box */}
        <div className="max-w-4xl mx-auto bg-slate-800/90 rounded-3xl border border-slate-700 p-6 sm:p-10 shadow-2xl space-y-8">
          {/* Action Trigger Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-700">
            <div>
              <span className="text-xs text-slate-400 font-mono block">Target Period:</span>
              <h4 className="text-lg font-bold text-white mt-0.5">
                ऑगस्ट २०२६ • शासकीय नमुना भाग-२ (धान्यादी मालाचे हिशोब)
              </h4>
            </div>

            <button
              type="button"
              disabled={generatingState === 'processing'}
              onClick={handleSimulateGeneration}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {generatingState === 'processing' ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Compiling 24 Days...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Simulate Report Compilation</span>
                </>
              )}
            </button>
          </div>

          {/* 4 Pipeline Milestones */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
              <span className="text-slate-400 block text-[10px]">1. Ingest Meal Records</span>
              <span className="text-emerald-400 font-bold block">✓ 24 Days Logged</span>
              <span className="text-[10px] text-slate-500">3,552 total meals</span>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
              <span className="text-slate-400 block text-[10px]">2. Compute Commodities</span>
              <span className="text-emerald-400 font-bold block">✓ 19 Items Multiplied</span>
              <span className="text-[10px] text-slate-500">Schedule-II norms applied</span>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
              <span className="text-slate-400 block text-[10px]">3. Reconcile Stock</span>
              <span className="text-emerald-400 font-bold block">✓ Closing Balances</span>
              <span className="text-[10px] text-slate-500">Opening + Inward - Consumed</span>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
              <span className="text-slate-400 block text-[10px]">4. Format Part-2 Page 43</span>
              <span className="text-amber-400 font-bold block">✓ 24 Columns Formatted</span>
              <span className="text-[10px] text-slate-500">4 signature blocks ready</span>
            </div>
          </div>

          {/* Generated Document Preview Card */}
          <div className="bg-white text-slate-900 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h5 className="font-extrabold text-sm text-slate-900">
                    Official Register Document Ready
                  </h5>
                  <span className="text-[11px] text-slate-500">
                    Compiled successfully with zero rounding errors
                  </span>
                </div>
              </div>

              <span className="text-[11px] font-bold font-mono text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                100% Certified
              </span>
            </div>

            {/* Document Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[11px]">School:</span>
                <strong className="text-slate-900">सरस्वती विद्यालय (अनुदानित)</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">UDISE:</span>
                <strong className="text-slate-900 font-mono">27251403201</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Cooking Cost:</span>
                <strong className="text-emerald-800 font-mono font-bold">₹8,382.72</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Rice Consumed:</span>
                <strong className="text-amber-900 font-mono font-bold">355.200 kg</strong>
              </div>
            </div>

            {/* Export Actions Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 text-center sm:text-left">
                Export directly to your computer or mobile device in seconds:
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => alert('Demo Download: Excel (.xlsx) file is generated in the actual software application!')}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert('Demo Print: Certified Landscape A4 PDF is generated in the actual software application!')}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center gap-1.5 border border-slate-300 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF (Page 43)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

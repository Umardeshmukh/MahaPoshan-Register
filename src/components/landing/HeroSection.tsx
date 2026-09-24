import React, { useState, useEffect, useRef } from 'react';
import { SignUpButton } from '@clerk/react';
import {
  Sparkles,
  ArrowRight,
  Play,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Calendar,
  Users,
  Utensils,
  Plus,
  Minus,
  ShieldCheck,
  Package,
} from 'lucide-react';
import gsap from 'gsap';

export const HeroSection: React.FC = () => {
  // Interactive live dashboard state in hero
  const [studentCount, setStudentCount] = useState<number>(148);
  const [riceKg, setRiceKg] = useState<number>(14.8);
  const [pulsesKg, setPulsesKg] = useState<number>(2.96);
  const [cookingCost, setCookingCost] = useState<number>(349.28);
  const [reportGenerated, setReportGenerated] = useState<boolean>(true);

  const heroRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);

  // Recalculate metrics when meal count changes
  useEffect(() => {
    const r = Number(((studentCount * 100) / 1000).toFixed(2));
    const p = Number(((studentCount * 20) / 1000).toFixed(3));
    const c = Number((studentCount * 2.36).toFixed(2));
    setRiceKg(r);
    setPulsesKg(p);
    setCookingCost(c);
  }, [studentCount]);

  // GSAP subtle floating and entry animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Aura floating pulse
      gsap.to('.hero-aura-1', {
        x: 25,
        y: -20,
        scale: 1.1,
        duration: 7,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
      gsap.to('.hero-aura-2', {
        x: -20,
        y: 25,
        scale: 1.15,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Stagger in elements
      gsap.from('.hero-anim-item', {
        y: 30,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
      });

      // Float mockup subtly
      gsap.to(mockupRef.current, {
        y: -8,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const handleAdjustCount = (delta: number) => {
    setStudentCount((prev) => Math.max(1, prev + delta));
  };

  const handleScrollToWorkflow = () => {
    const el = document.querySelector('#workflow');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      ref={heroRef}
      className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden bg-gradient-to-b from-emerald-50/40 via-white to-slate-50/60"
    >
      {/* Background Animated Auras */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none -z-10">
        <div className="hero-aura-1 absolute top-0 left-1/4 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl" />
        <div className="hero-aura-2 absolute top-20 right-1/4 w-[420px] h-[420px] bg-teal-400/15 rounded-full blur-3xl" />
        <div className="absolute top-48 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-400/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-6 text-center lg:text-left space-y-6">
            {/* Pill Badge */}
            <div className="hero-anim-item inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300/80 text-emerald-900 text-xs font-semibold shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Built for Maharashtra Govt-Aided & State Schools • PM-POSHAN Compliant</span>
            </div>

            {/* Headline */}
            <h1 className="hero-anim-item text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
              PM-POSHAN Records,{' '}
              <span className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-600 bg-clip-text text-transparent">
                Simplified.
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="hero-anim-item text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Manage daily meal entries, grain consumption, stock, cooking costs and monthly reports — all in one simple digital platform.
            </p>

            {/* Primary & Secondary Action CTAs */}
            <div className="hero-anim-item flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer group"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </SignUpButton>

              <button
                type="button"
                onClick={handleScrollToWorkflow}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm border border-slate-300/90 shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 text-emerald-700 fill-emerald-700/20" />
                <span>See How It Works</span>
              </button>
            </div>

            {/* Trust Badges Bar */}
            <div className="hero-anim-item pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-slate-500 font-medium border-t border-slate-200/80">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero Math Errors</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Official Part-2 PDF Ready</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Works Offline & Online</span>
              </div>
            </div>
          </div>

          {/* Right Column: Animated Interactive Dashboard Mockup */}
          <div className="lg:col-span-6 relative">
            <div
              ref={mockupRef}
              className="relative mx-auto max-w-lg lg:max-w-none bg-white rounded-3xl p-4 sm:p-6 shadow-2xl shadow-emerald-950/15 border border-slate-200/90"
            >
              {/* Mockup Header Bar */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    अनु.
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">
                      सरस्वती विद्यालय (शासकीय अनुदानित)
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      UDISE: 27251403201 • 385 लाभार्थी • Std 1 to 8
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Sync
                </span>
              </div>

              {/* Mockup Interactive Stepper Strip */}
              <div className="bg-slate-50/80 rounded-2xl p-3 sm:p-4 border border-slate-200/80 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Today's Meals Served
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                        {studentCount}
                      </span>
                      <span className="text-xs text-slate-500">Beneficiaries</span>
                    </div>
                  </div>

                  {/* Interactive Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAdjustCount(-5)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs active:scale-95 transition-transform"
                      title="Decrease by 5"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustCount(5)}
                      className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center text-xs active:scale-95 transition-transform shadow-xs"
                      title="Increase by 5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Today's Dish Name */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    Menu: <strong className="text-emerald-950 font-bold">मटकी उसळ भात (Sprouted Matki Usal Rice)</strong>
                  </span>
                  <span className="font-mono text-emerald-800 font-bold bg-emerald-100/60 px-2 py-0.5 rounded">
                    Wed Cycle
                  </span>
                </div>
              </div>

              {/* 4 Dynamic Metric Tiles */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-4">
                {/* Rice Card */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
                  <span className="text-[11px] text-amber-900 font-medium block">
                    Rice (तांदूळ @ 100g)
                  </span>
                  <span className="text-lg sm:text-xl font-black font-mono text-amber-950 mt-0.5 block">
                    {riceKg.toFixed(2)} <span className="text-xs font-normal text-amber-800">kg</span>
                  </span>
                </div>

                {/* Pulses Card */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
                  <span className="text-[11px] text-emerald-900 font-medium block">
                    Pulses (मटकी @ 20g)
                  </span>
                  <span className="text-lg sm:text-xl font-black font-mono text-emerald-950 mt-0.5 block">
                    {pulsesKg.toFixed(3)} <span className="text-xs font-normal text-emerald-800">kg</span>
                  </span>
                </div>

                {/* Cooking Cost Card */}
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3">
                  <span className="text-[11px] text-blue-900 font-medium block">
                    Cooking Cost (@ ₹2.36)
                  </span>
                  <span className="text-lg sm:text-xl font-black font-mono text-blue-950 mt-0.5 block">
                    ₹{cookingCost.toFixed(2)}
                  </span>
                </div>

                {/* Stock Status Card */}
                <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3">
                  <span className="text-[11px] text-purple-900 font-medium block">
                    Stock Balance
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-purple-950 mt-1 block flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    Healthy (शिल्लक उत्तम)
                  </span>
                </div>
              </div>

              {/* Simulated Floating Notification Pill */}
              <div className="bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between shadow-lg text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold block">Monthly Schedule-II Part-2</span>
                    <span className="text-[10px] text-slate-400">Generated automatically for August 2026</span>
                  </div>
                </div>

                <span className="text-[10px] font-bold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-md font-mono">
                  Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

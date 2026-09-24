import React, { useState } from 'react';
import { SignUpButton } from '@clerk/react';
import {
  Check,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  HelpCircle,
  Clock,
  FileCheck2,
  Headphones,
} from 'lucide-react';

export const PricingSection: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Simple, Transparent Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Invest in Peace of Mind for{' '}
            <span className="text-emerald-700">Your School</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Eliminate daily calculation stress and statutory report headaches. Choose the plan that fits your school.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="pt-4 flex items-center justify-center">
            <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 inline-flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Billing
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  billingCycle === 'yearly'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-700/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Annual Billing</span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wide ${
                    billingCycle === 'yearly'
                      ? 'bg-emerald-800 text-emerald-100'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  Save ₹890 • 2 Months Free
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch mb-16">
          {/* Plan 1: Monthly Membership */}
          <div className="rounded-3xl p-6 sm:p-9 bg-slate-50 border border-slate-200 hover:border-slate-300 flex flex-col justify-between shadow-xs transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold font-mono text-slate-700 bg-slate-200/80 px-3 py-1 rounded-full uppercase tracking-wider">
                  Monthly Membership
                </span>
                <span className="text-xs text-slate-500 font-semibold">Flexible</span>
              </div>

              <h3 className="text-2xl font-black text-slate-900 mb-2">
                Monthly Plan
              </h3>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Ideal for individual teachers or schools seeking month-to-month flexibility without long-term commitments.
              </p>

              {/* Price Display */}
              <div className="mb-6 pb-6 border-b border-slate-200">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono text-slate-900">
                    ₹490
                  </span>
                  <span className="text-slate-500 text-xs sm:text-sm font-semibold">
                    / month
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Billed monthly. Cancel or renew anytime with no penalty.
                </span>
              </div>

              {/* Features List */}
              <div className="space-y-3.5 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span><strong>Unlimited Students:</strong> No student limits or per-child pricing tiers</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span>Unlimited daily meal entries & beneficiary records</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span>19 statutory Schedule-II commodity weight calculations</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span>Real-time opening, inward & closing stock balancing</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span>Daily cooking cost & subsidy tracking (@ ₹2.36)</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span>One-click PDF & Excel (.xlsx) monthly report exports</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span>Offline-first local storage & touch-friendly mobile access</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span>Standard WhatsApp & email support</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <span>Start Monthly Membership</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </SignUpButton>
              <span className="text-[11px] text-center block text-slate-500 mt-2.5">
                Instant digital activation • No physical installation required
              </span>
            </div>
          </div>

          {/* Plan 2: Annual Membership */}
          <div className="rounded-3xl p-6 sm:p-9 bg-gradient-to-b from-emerald-50/90 via-white to-emerald-50/30 border-2 border-emerald-500 shadow-xl shadow-emerald-950/10 flex flex-col justify-between relative">
            <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-md uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Recommended • Best Value</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
                  Full Academic Year
                </span>
                <span className="text-xs text-emerald-700 font-bold">2 Months Free</span>
              </div>

              <h3 className="text-2xl font-black text-slate-900 mb-2">
                Yearly Membership
              </h3>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Complete, worry-free software coverage for the entire 12-month academic cycle with cloud backup and audit readiness.
              </p>

              {/* Price Display */}
              <div className="mb-6 pb-6 border-b border-emerald-200/80">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono text-emerald-950">
                    ₹4,990
                  </span>
                  <span className="text-slate-500 text-xs sm:text-sm font-semibold">
                    / year
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                    Effectively ₹415 / month
                  </span>
                  <span className="text-[11px] text-slate-500">
                    (You save ₹890 compared to monthly)
                  </span>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-3.5 text-xs text-slate-800">
                <div className="flex items-start gap-2.5 font-bold text-emerald-900">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span>Everything in Monthly Membership, plus:</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span><strong>Unlimited Students:</strong> Serve 15, 500, or 2,500+ students with zero extra charge</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span>Full 12-month academic cycle validity without monthly renewal hassle</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span>Automatic Supabase cloud backup & two-way multi-device synchronization</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span>Official Government Format Part-2 Page 43 certified print layouts</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span>Priority WhatsApp & phone assistance during monthly audit submissions</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span>Free automatic updates whenever statutory food norms or rates update</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3] mt-0.5" />
                  <span>Official tax invoice provided for school expense reimbursement</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-emerald-200/80">
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-700/25 transition-all cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <span>Start Yearly Membership</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </SignUpButton>
              <span className="text-[11px] text-center block text-emerald-800 font-semibold mt-2.5">
                ✓ 14-day risk-free money-back guarantee • Priority support
              </span>
            </div>
          </div>
        </div>

        {/* Enterprise Trust Grid / Guarantees */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-6 border-t border-slate-200">
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">100% Maharashtra Schedule-II Compliant</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Calculations strictly follow statutory per-student gram allowances for primary & upper-primary grades.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">School Reimbursement Invoice</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Receive an official, itemized receipt eligible for school contingent or administration fund claims.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Dedicated Teacher Helpline</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Friendly support via WhatsApp in Marathi & English whenever you need assistance with data or reports.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

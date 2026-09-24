import React from 'react';
import { SignInButton } from '@clerk/react';
import { Sparkles, Mail, ShieldAlert } from 'lucide-react';
import { LegalDocType } from '../../types';

interface LandingFooterProps {
  onOpenLegal: (tab: LegalDocType) => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onOpenLegal }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-14 sm:py-16 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Description */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <span className="font-extrabold text-base text-white tracking-tight">
                MahaPoshan Register
              </span>
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed">
              The modern digital companion for Maharashtra schools to automate daily Mid-Day Meal calculations, stock tracking, and official Government Part-2 booklet reporting.
            </p>
            <div className="pt-1 flex items-center gap-2 text-slate-300">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <a
                href="mailto:poshanragister@gmail.com"
                className="hover:text-white transition-colors underline font-mono"
              >
                poshanragister@gmail.com
              </a>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Product</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="hover:text-emerald-400 transition-colors">
                  Features Overview
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-emerald-400 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#preview" className="hover:text-emerald-400 transition-colors">
                  Application Preview
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-emerald-400 transition-colors">
                  Pricing & Plans
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-emerald-400 transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Account */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Legal & Account</h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('terms')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('refund')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer text-left"
                >
                  Refund & Cancellation Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('contact')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer text-left"
                >
                  Contact & Support
                </button>
              </li>
              <li className="pt-1">
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                  >
                    Teacher / Admin Login &rarr;
                  </button>
                </SignInButton>
              </li>
            </ul>
          </div>
        </div>

        {/* Mandatory Independent Software Disclaimer Banner */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-300 leading-relaxed">
            <strong className="text-amber-300 font-bold block mb-0.5">Disclaimer:</strong>
            MahaPoshan Register is an independent software service and is not a Government of India or Government of Maharashtra application. It is a private productivity utility developed to facilitate accurate school-level arithmetic and register formatting under standard Schedule-II guidelines.
          </p>
        </div>

        {/* Bottom Bar: Copyright */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© 2026 MahaPoshan Register. All rights reserved.</p>
          <p>Engineered for Maharashtra Schools • Local-First & Cloud-Synced</p>
        </div>
      </div>
    </footer>
  );
};

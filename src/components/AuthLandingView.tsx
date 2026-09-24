import React, { useState } from 'react';
import { SignInButton, SignUpButton } from '@clerk/react';
import { LegalModal } from './LegalModal';
import { LegalDocType } from '../types';
import {
  BookOpen,
  FileCheck2,
  ShieldCheck,
  Sparkles,
  Calculator,
  ArrowRight,
  School,
  Lock,
  FileSpreadsheet,
  Mail,
} from 'lucide-react';

export const AuthLandingView: React.FC = () => {
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [activeLegalTab, setActiveLegalTab] = useState<LegalDocType>('terms');

  const openLegal = (tab: LegalDocType) => {
    setActiveLegalTab(tab);
    setLegalModalOpen(true);
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-amber-50/30 to-slate-100 flex flex-col justify-between font-sans">
      {/* Top Banner Ribbon */}
      <div className="bg-slate-900 text-slate-200 px-4 py-2 text-xs font-medium flex items-center justify-between shadow-xs">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="font-semibold tracking-wide text-white">
              MahaPoshan Register
            </span>
            <span className="hidden sm:inline-block text-slate-400 text-[11px]">
              • शाळा व शिक्षकांसाठी स्वतंत्र डिजिटल सहाय्यक
            </span>
          </div>
          <span className="text-amber-300/90 text-[11px] font-mono">
            खाजगी सोल्यूशन (Private SaaS Solution)
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14 flex-1 flex flex-col items-center justify-center">
        {/* Title & Branding */}
        <div className="text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-300 text-amber-900 text-xs font-semibold mb-6 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>शाळा व शिक्षकांसाठी स्मार्ट डिजिटल हिशोब सोल्यूशन</span>
          </div>

          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-amber-700 text-white flex items-center justify-center shadow-lg shadow-amber-700/20 mb-5">
            <FileSpreadsheet className="w-8 h-8 sm:w-10 sm:h-10 text-amber-100" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            MahaPoshan Register
          </h1>
          <h2 className="text-lg sm:text-2xl font-bold text-amber-800 mt-1">
            शालेय पोषण आहार हिशोब व नोंदवही असिस्टंट
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            दैनिक पोषण आहार हिशोब, धान्यादी मालाचा साठा, आवक-जावक आणि मासिक नोंदवही 
            अचूक व सुलभरीत्या व्यवस्थापित करण्यासाठी विकसित केलेले खाजगी डिजिटल साधन.
          </p>
        </div>

        {/* Compulsory Login & Action Card */}
        <div className="w-full max-w-md mt-8 bg-white rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-200/80 p-6 sm:p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-amber-700" />
          </div>

          <h3 className="text-lg font-bold text-slate-900">
            वापरण्यासाठी लॉग इन आवश्यक
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-normal">
            सदर ॲप हे शाळा व शिक्षकांसाठी स्वतंत्र सदस्यत्व (Subscription) तत्त्वावर उपलब्ध आहे. 
            वापरासाठी कृपया लॉग इन अथवा नोंदणी करा.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <SignInButton mode="modal">
              <button
                type="button"
                className="w-full py-3 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-700/25 transition-all cursor-pointer"
              >
                <span>लॉग इन करा (Sign In)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer border border-slate-200"
              >
                नवीन खात्यासाठी नोंदणी करा (Sign Up)
              </button>
            </SignUpButton>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              सुरक्षित प्रमाणीकरण
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-amber-700" />
              शाळा व शिक्षक सोल्यूशन
            </span>
          </div>

          <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-center">
            <p className="text-[11px] text-amber-900 font-semibold flex items-center justify-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-700" />
              <span>मदत व संपर्क (Contact Us):</span>
              <a
                href="mailto:poshanragister@gmail.com"
                className="font-mono underline font-bold hover:text-amber-950"
              >
                poshanragister@gmail.com
              </a>
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl mt-12">
          <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
              <Calculator className="w-5 h-5 text-amber-700" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">स्वयंचलित परिमाण व खर्च</h4>
            <p className="text-xs text-slate-600 mt-1">
              विद्यार्थी संख्येनुसार तांदूळ, डाळ, तेल व भाजीपाला खर्चाचा अचूक दैनिक हिशोब.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5 text-emerald-700" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">मासिक साठा व नोंदवही</h4>
            <p className="text-xs text-slate-600 mt-1">
              मासिक आवक, खर्च आणि शिल्लक साठ्याचा परिपूर्ण ताळेबंद एका नजरेत.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center mb-3">
              <FileCheck2 className="w-5 h-5 text-blue-700" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">एक्सेल (.xlsx) व अहवाल</h4>
            <p className="text-xs text-slate-600 mt-1">
              आपल्या सोयीसाठी एका क्लिकवर रंगीत एक्सेल शीट व सुलभ प्रिंट अहवाल.
            </p>
          </div>
        </div>
      </div>

      {/* Footer with 4 Mandatory Legal Links */}
      <footer className="border-t border-slate-200 bg-white/80 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left sm:text-left">
            <p className="font-semibold text-slate-700">
              © 2026 MahaPoshan Register • शाळा व शिक्षकांसाठी खाजगी सॉफ्टवेअर सोल्यूशन
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              सदर ॲप्लिकेशन ही कोणत्याही शासकीय विभागाशी संलग्न अथवा शासनमान्य अधिकृत प्रणाली नसून स्वतंत्र डिजिटल मदत साधन आहे.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
            <button
              type="button"
              onClick={() => openLegal('terms')}
              className="text-slate-600 hover:text-amber-800 hover:underline cursor-pointer transition-colors"
            >
              1. Terms & Conditions
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => openLegal('privacy')}
              className="text-slate-600 hover:text-amber-800 hover:underline cursor-pointer transition-colors"
            >
              2. Privacy Policy
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => openLegal('refund')}
              className="text-slate-600 hover:text-amber-800 hover:underline cursor-pointer transition-colors"
            >
              3. Refund Policy
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => openLegal('contact')}
              className="text-slate-600 hover:text-amber-800 hover:underline cursor-pointer transition-colors"
            >
              4. Contact & Legal
            </button>
            <span className="text-slate-300">•</span>
            <a
              href="mailto:poshanragister@gmail.com"
              className="text-amber-800 hover:text-amber-950 font-bold hover:underline inline-flex items-center gap-1"
              title="अधिकृत संपर्क ईमेल"
            >
              <Mail className="w-3 h-3 text-amber-700" />
              <span>poshanragister@gmail.com</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Legal Documents Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        initialTab={activeLegalTab}
        onClose={() => setLegalModalOpen(false)}
      />
    </div>
  );
};

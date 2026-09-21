import React, { useState } from 'react';
import { LegalDocType } from '../types';
import { LEGAL_DOCS } from '../lib/legal-docs';
import {
  FileText,
  ShieldCheck,
  RotateCcw,
  Building,
  X,
  Printer,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalDocType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'terms',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LegalDocType>(initialTab);

  // Sync initial tab when modal opens
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const currentDoc = LEGAL_DOCS[activeTab];

  const tabs: { id: LegalDocType; labelEn: string; labelMr: string; icon: any }[] = [
    { id: 'terms', labelEn: 'Terms & Conditions', labelMr: 'नियम व अटी', icon: FileText },
    { id: 'privacy', labelEn: 'Privacy Policy', labelMr: 'गोपनीयता धोरण', icon: ShieldCheck },
    { id: 'refund', labelEn: 'Refund Policy', labelMr: 'परतावा धोरण', icon: RotateCcw },
    { id: 'contact', labelEn: 'Contact / Legal', labelMr: 'संपर्क व माहिती', icon: Building },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div
        className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-snug">
                MahaPoshan Register • कायदेशीर कागदपत्रे व धोरणे
              </h3>
              <p className="text-[11px] text-slate-400">
                Official Compliance, Privacy & User Agreement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Print document"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-5 flex items-center gap-1.5 overflow-x-auto py-2 shrink-0 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.labelMr}</span>
                <span className={`text-[10px] hidden sm:inline ${isActive ? 'text-amber-200' : 'text-slate-400'}`}>
                  ({tab.labelEn})
                </span>
              </button>
            );
          })}
        </div>

        {/* Document Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-slate-800">
          {/* Header Banner */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono text-[10px] font-bold uppercase">
                  Version {currentDoc.version}
                </span>
                <span className="text-xs text-slate-500">
                  शेवटचा बदल: {currentDoc.lastUpdated}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                {currentDoc.titleMr}{' '}
                <span className="text-slate-500 text-sm font-normal">({currentDoc.titleEn})</span>
              </h2>
            </div>
            <p className="text-xs text-slate-600 max-w-sm">
              {currentDoc.summary}
            </p>
          </div>

          {/* Clauses / Sections */}
          <div className="space-y-5">
            {currentDoc.sections.map((sec, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs hover:border-amber-300 transition-colors"
              >
                <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-mono flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span>{sec.headingMr}</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 ml-7">
                  {sec.headingEn}
                </p>

                {/* Marathi Content */}
                <div className="mt-3 ml-7 bg-slate-50/80 rounded-lg p-3 border border-slate-100 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                  {sec.contentMr}
                </div>

                {/* English Content */}
                <div className="mt-2 ml-7 text-[11px] sm:text-xs text-slate-500 leading-relaxed italic whitespace-pre-line border-l-2 border-slate-200 pl-3">
                  {sec.contentEn}
                </div>
              </div>
            ))}
          </div>

          {/* Compliance & Audit Footer Note */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">कायदेशीर मान्यता व नोंदणी हमी</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                शाळा नोंदणी करताना आपण या नियम व अटींशी सहमत असल्याचे संमतीपत्र (Digital Audit Stamp) आपल्या युझर आयडीसह सुरक्षितरित्या नोंदवले जाते.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 text-xs">
          <div className="text-[11px] text-slate-500 hidden sm:block">
            MahaPoshan Register • महाराष्ट्र शासन शालेय पोषण आहार (PM POSHAN)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs transition-colors cursor-pointer ml-auto"
          >
            समजले, बंद करा (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

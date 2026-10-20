import React, { useState, useEffect } from 'react';
import {
  Download,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Printer,
  Calendar,
  ShieldAlert,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { AppData, LanguageMode } from '../types';

interface MonthlyBackupReminderModalProps {
  appData: AppData;
  language: LanguageMode;
  onNavigateTab: (tab: 'daily' | 'register' | 'admin' | 'print') => void;
}

export const MonthlyBackupReminderModal: React.FC<MonthlyBackupReminderModalProps> = ({
  appData,
  language,
  onNavigateTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only check in browser
    if (typeof window === 'undefined') return;

    const today = new Date();
    const dayOfMonth = today.getDate();
    // Prompt during the last 6 days of the month (25th to end) or first 3 days of the next month
    const isEndOfMonthWindow = dayOfMonth >= 25 || dayOfMonth <= 3;
    if (!isEndOfMonthWindow) return;

    // Check if dismissed recently (cooldown of 48 hours per session)
    const currentMonthKey = today.toISOString().slice(0, 7); // e.g. "2026-10"
    const storageKey = `mahaposhan_backup_reminder_dismissed_${currentMonthKey}`;
    const dismissedAt = localStorage.getItem(storageKey);

    if (dismissedAt) {
      const hoursSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 3600);
      if (hoursSinceDismiss < 48) {
        return; // Don't annoy the user if they saw it in the last 48 hours
      }
    }

    // Small delay so user logs in cleanly before alert pops up
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    const today = new Date();
    const currentMonthKey = today.toISOString().slice(0, 7);
    const storageKey = `mahaposhan_backup_reminder_dismissed_${currentMonthKey}`;
    localStorage.setItem(storageKey, Date.now().toString());
    setIsOpen(false);
  };

  const handleGoToReports = () => {
    handleDismiss();
    onNavigateTab('print');
  };

  const handleGoToBackup = () => {
    handleDismiss();
    onNavigateTab('admin');
  };

  if (!isOpen) return null;

  const currentMonthName = new Date().toLocaleString('mr-IN', { month: 'long', year: 'numeric' });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-amber-950 text-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200 block">
                  {language === 'en' ? 'End-of-Month Data Protection' : 'महिनाअखेर डेटा सुरक्षा स्मरणपत्र'}
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  {language === 'en'
                    ? 'Save & Export Your Monthly MDM Register'
                    : 'मासिक अहवाल डाऊनलोड करून सुरक्षित जतन करा'}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm text-slate-700">
          {/* School Identifier */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">
                {appData.profile.schoolName || 'शाळा प्रोफाइल'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                UDISE: {appData.profile.udiseNumber || 'नोंदणीकृत'} • कालावधी: {currentMonthName}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
              {currentMonthName}
            </span>
          </div>

          {/* 12-Month Data Retention Warning Callout */}
          <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300/80 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-950 text-xs sm:text-sm">
                {language === 'en'
                  ? '⚠️ 12-Month Data Retention Policy Alert'
                  : '⚠️ महत्त्वाचा नियम: १२ महिन्यांचे डेटा धोरण'}
              </h4>
              <p className="text-[11px] sm:text-xs text-amber-900 leading-relaxed">
                {language === 'en'
                  ? 'To comply with system storage limits, historical records are stored for 12 months. Data older than 12 months is automatically purged. Please download your official PDF and Excel reports every month to maintain your school records safely.'
                  : 'क्लाउड सुरक्षा नियमांनुसार आपल्या शाळेचा डेटा १२ महिने (१ वर्ष) सुरक्षित राहतो. १२ महिन्यांनंतर जुना डेटा स्वयंचलितपणे हटवला जातो. शासकीय तपासणीसाठी प्रत्येक महिन्याचा अहवाल (PDF व Excel) डाऊनलोड करून शाळेच्या संगणकावर कायमस्वरूपी सेव्ह ठेवा.'}
              </p>
            </div>
          </div>

          {/* Action List */}
          <div className="space-y-2">
            <p className="font-bold text-slate-800 text-xs">
              {language === 'en' ? 'Recommended Actions:' : 'आपण आता काय करावे?'}
            </p>

            <button
              type="button"
              onClick={handleGoToReports}
              className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-between transition-colors shadow-xs cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-rose-400" />
                <span>
                  {language === 'en'
                    ? 'Download Official Booklet (PDF & Excel)'
                    : 'शासकीय अहवाल (प्रपत्र-२) PDF व Excel डाउनलोड करा'}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={handleGoToBackup}
              className="w-full p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-between border border-slate-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>
                  {language === 'en'
                    ? 'Download Full JSON Data Backup (Settings)'
                    : 'संपूर्ण शाळेचा JSON डेटा बॅकअप डाऊनलोड करा'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">सेटिंग्ज</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-3 sm:p-4 border-t border-slate-200/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500">
            {language === 'en' ? 'Keep offline copies safe' : 'दप्तरी नोंदी सुरक्षित ठेवा'}
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-colors cursor-pointer"
          >
            {language === 'en' ? 'Remind Me Later' : 'मी डाउनलोड केले आहे / नंतर आठवण करा'}
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { SchoolProfile, LanguageMode } from '../types';
import {
  Utensils,
  CalendarDays,
  BookOpen,
  Settings,
  School,
  FileText,
  Cloud,
  RefreshCw,
  Gift,
} from 'lucide-react';
import { Show, SignInButton, UserButton } from '@clerk/react';
import { SyncStatus } from '../lib/cloud-sync';


interface HeaderProps {
  profile: SchoolProfile;
  activeTab: 'daily' | 'register' | 'admin' | 'print';
  setActiveTab: (tab: 'daily' | 'register' | 'admin' | 'print') => void;
  language: LanguageMode;
  setLanguage: (lang: LanguageMode) => void;
  daysRemaining?: number;
  isSuperAdmin?: boolean;
  syncStatus?: SyncStatus;
  onOpenSuperAdmin?: () => void;
  onOpenReferral?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  daysRemaining,
  isSuperAdmin,
  syncStatus,
  onOpenSuperAdmin,
  onOpenReferral,
}) => {
  return (
    <>
      {/* Top Header */}
      <header className="no-print bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        {/* Top Maharashtra State Ribbon */}
        <div className="bg-amber-800 text-amber-50 px-4 py-1 text-[11px] font-medium flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            <span className="truncate">
              {language === 'en'
                ? 'Govt. of Maharashtra • PM POSHAN'
                : 'महाराष्ट्र शासन • प्रधानमंत्री पोषण शक्ती निर्माण योजना'}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] text-amber-200">
            {syncStatus === 'syncing' && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-200 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>क्लाउड सिंक होत आहे...</span>
              </span>
            )}
            {syncStatus === 'synced' && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-300 font-sans" title="डेटा Supabase क्लाउडवर सुरक्षितपणे जतन झाला आहे">
                <Cloud className="w-3 h-3 text-emerald-300" />
                <span>क्लाउड सुरक्षित</span>
              </span>
            )}
            {syncStatus === 'error' && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-300 font-sans" title="स्थानिक साठवणूक चालू आहे">
                <Cloud className="w-3 h-3 text-amber-400" />
                <span>स्थानिक डेटा</span>
              </span>
            )}
            <span>UDISE: {profile.udiseNumber || 'नोंदणी आवश्यक'}</span>
          </div>
        </div>


        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3">
          {/* School Name & Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Utensils className="w-5 h-5 text-amber-700" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
                {profile.schoolName || 'शाळा प्रोफाइल (School Profile)'}
              </h1>
              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                <School className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">केंद्र: {profile.centerCluster || 'नोंदवलेले नाही'}</span>
                <span>•</span>
                <span className="text-amber-800 font-medium">दैनिक खर्च नोंदवही</span>
              </p>
            </div>
          </div>

          {/* Actions: Desktop Tabs & Language Switch */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop Navigation Tabs (Hidden on Mobile) */}
            <nav className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <button
                id="tab-daily-entry"
                type="button"
                onClick={() => setActiveTab('daily')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'daily'
                    ? 'bg-white text-amber-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-4 h-4 text-amber-700" />
                <span>{language === 'en' ? 'Daily Entry' : 'दैनिक नोंद'}</span>
              </button>

              <button
                id="tab-monthly-register"
                type="button"
                onClick={() => setActiveTab('register')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-white text-amber-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4 text-amber-700" />
                <span>{language === 'en' ? 'Monthly Register' : 'मासिक नोंदवही'}</span>
              </button>

              <button
                id="tab-official-report"
                type="button"
                onClick={() => setActiveTab('print')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'print'
                    ? 'bg-white text-amber-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-rose-600" />
                <span>{language === 'en' ? 'Report (PDF)' : 'शासकीय अहवाल'}</span>
              </button>

              <button
                id="tab-admin-settings"
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-white text-amber-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Settings className="w-4 h-4 text-amber-700" />
                <span>{language === 'en' ? 'Settings' : 'सेटिंग्ज व मेन्यू'}</span>
              </button>
            </nav>

            {/* Language Switch */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-medium">
              <button
                id="lang-mr"
                type="button"
                onClick={() => setLanguage('mr')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs ${
                  language === 'mr'
                    ? 'bg-amber-700 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                मराठी
              </button>
              <button
                id="lang-dual"
                type="button"
                onClick={() => setLanguage('dual')}
                className={`hidden sm:inline-block px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs ${
                  language === 'dual'
                    ? 'bg-amber-700 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                मराठी/EN
              </button>
              <button
                id="lang-en"
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs ${
                  language === 'en'
                    ? 'bg-amber-700 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
            </div>

            {/* Clerk Authentication Controls & Subscription Status */}
            <div className="flex items-center gap-2 pl-1">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white transition-all cursor-pointer shadow-xs"
                  >
                    {language === 'en' ? 'Sign In' : 'लॉग इन'}
                  </button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <div className="flex items-center gap-2">
                  {isSuperAdmin && onOpenSuperAdmin && (
                    <button
                      type="button"
                      onClick={onOpenSuperAdmin}
                      className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-[10px] border border-amber-500/40 cursor-pointer shadow-xs"
                      title="Super Admin कन्सोल उघडा"
                    >
                      <span>⚡ Super Admin</span>
                    </button>
                  )}

                  {!isSuperAdmin && typeof daysRemaining === 'number' && (
                    <span
                      className={`hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        daysRemaining > 30
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : daysRemaining > 7
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      सदस्यत्व: {daysRemaining} दिवस
                    </span>
                  )}

                  {onOpenReferral && (
                    <button
                      type="button"
                      onClick={onOpenReferral}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-bold text-[11px] shadow-xs cursor-pointer border border-amber-500/40 transition-all hover:scale-105 active:scale-95"
                      title="इतर शाळा जोडा आणि रोख बक्षीस मिळवा!"
                    >
                      <Gift className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                      <span className="hidden sm:inline">रेफर करा</span>
                      <span className="px-1.5 py-0.5 bg-amber-400 text-amber-950 rounded-md text-[9px] font-black">
                        ₹100
                      </span>
                    </button>
                  )}

                  <UserButton />
                </div>
              </Show>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Ergonomic Bottom Navigation Bar (Visible only on mobile screens) */}
      <nav
        aria-label="Mobile Navigation"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-lg px-2 py-1.5 flex items-center justify-around safe-area-pb"
      >
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'daily'
              ? 'text-amber-800 bg-amber-50/80 font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <CalendarDays className={`w-5 h-5 ${activeTab === 'daily' ? 'text-amber-700' : 'text-slate-400'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">
            {language === 'en' ? 'Daily' : 'दैनिक नोंद'}
          </span>
          {activeTab === 'daily' && (
            <span className="w-1 h-1 rounded-full bg-amber-600 mt-0.5"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('register')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'register'
              ? 'text-amber-800 bg-amber-50/80 font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <BookOpen className={`w-5 h-5 ${activeTab === 'register' ? 'text-amber-700' : 'text-slate-400'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">
            {language === 'en' ? 'Register' : 'मासिक वही'}
          </span>
          {activeTab === 'register' && (
            <span className="w-1 h-1 rounded-full bg-amber-600 mt-0.5"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('print')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'print'
              ? 'text-amber-800 bg-amber-50/80 font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <FileText className={`w-5 h-5 ${activeTab === 'print' ? 'text-rose-600' : 'text-slate-400'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">
            {language === 'en' ? 'Report' : 'अहवाल (PDF)'}
          </span>
          {activeTab === 'print' && (
            <span className="w-1 h-1 rounded-full bg-rose-600 mt-0.5"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'admin'
              ? 'text-amber-800 bg-amber-50/80 font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Settings className={`w-5 h-5 ${activeTab === 'admin' ? 'text-amber-700' : 'text-slate-400'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">
            {language === 'en' ? 'Settings' : 'सेटिंग्ज'}
          </span>
          {activeTab === 'admin' && (
            <span className="w-1 h-1 rounded-full bg-amber-600 mt-0.5"></span>
          )}
        </button>
      </nav>
    </>
  );
};

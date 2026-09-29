import React, { useState } from 'react';
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
  Mail,
  Copy,
  Check,
  X,
  Menu,
  KeyRound,
} from 'lucide-react';
import { Show, SignInButton, UserButton } from '@clerk/react';
import { SyncStatus } from '../lib/cloud-sync';
import { Badge } from './ui';
import { AdminLoginModal } from './AdminLoginModal';
import { isAdminAuthenticated } from '../lib/subscription-store';


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
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState(false);

  return (
    <>
      {/* Top Header */}
      <header className="no-print bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        {/* Top Maharashtra State Ribbon */}
        <div className="bg-amber-800 text-amber-50 px-3 sm:px-4 py-1 text-[10px] sm:text-[11px] font-medium flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-1.5 truncate">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            <span className="truncate">
              {language === 'en'
                ? 'MDM Nutrition, Accurate Records.'
                : 'शालेय पोषण, अचूक हिशोब.'}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 font-mono text-[10px] sm:text-[11px] text-amber-200">
            {syncStatus === 'syncing' && (
              <span className="inline-flex items-center gap-1 text-amber-200 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span className="hidden sm:inline">क्लाउड सिंक होत आहे...</span>
              </span>
            )}
            {syncStatus === 'synced' && (
              <span className="inline-flex items-center gap-1 text-emerald-300 font-sans" title="डेटा Supabase क्लाउडवर सुरक्षितपणे जतन झाला आहे">
                <Cloud className="w-3 h-3 text-emerald-300" />
                <span className="hidden sm:inline">क्लाउड सुरक्षित</span>
              </span>
            )}
            {syncStatus === 'error' && (
              <span className="inline-flex items-center gap-1 text-amber-300 font-sans" title="स्थानिक साठवणूक चालू आहे">
                <Cloud className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">स्थानिक डेटा</span>
              </span>
            )}
            <span className="truncate max-w-[130px] sm:max-w-none">UDISE: {profile.udiseNumber || 'नोंदणी आवश्यक'}</span>
            <span className="hidden lg:inline text-amber-300/40">•</span>
            <button
              type="button"
              onClick={() => setContactModalOpen(true)}
              className="hidden lg:inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
              title="Admin & Support Email"
            >
              <Mail className="w-3 h-3 text-amber-300" />
              <span>poshanragister@gmail.com</span>
            </button>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3">
          {/* School Name & Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Utensils className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 text-xs sm:text-base leading-tight truncate">
                {profile.schoolName || 'शाळा प्रोफाइल (School Profile)'}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                <School className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">केंद्र: {profile.centerCluster || 'नोंदवलेले नाही'}</span>
                <span>•</span>
                <span className="text-amber-800 font-medium">दैनिक खर्च नोंदवही</span>
              </p>
            </div>
          </div>

          {/* Desktop Actions (Hidden on Mobile) */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {/* Desktop Navigation Tabs */}
            <nav className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <button
                id="tab-daily-entry"
                type="button"
                onClick={() => setActiveTab('daily')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'daily'
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'register'
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'print'
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <FileText className="w-4 h-4 text-rose-600" />
                <span>{language === 'en' ? 'Report (Print)' : 'शासकीय अहवाल'}</span>
              </button>

              <button
                id="tab-admin-settings"
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'admin'
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Settings className="w-4 h-4 text-amber-700" />
                <span>{language === 'en' ? 'Profile & Settings' : 'प्रोफाईल व सेटिंग्ज'}</span>
              </button>
            </nav>

            {/* Language Switch */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-medium">
              <button
                id="lang-mr"
                type="button"
                onClick={() => setLanguage('mr')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs ${language === 'mr'
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
                className={`hidden sm:inline-block px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs ${language === 'dual'
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
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs ${language === 'en'
                  ? 'bg-amber-700 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                EN
              </button>
            </div>

            {/* Clerk Authentication Controls & Subscription Status */}
            <div className="flex items-center gap-2 pl-1">
              {/* Contact Us Button */}
              <button
                id="btn-contact-us"
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold text-xs border border-slate-200/90 transition-all cursor-pointer shadow-2xs"
                title={language === 'en' ? 'Contact Us / Support' : 'संपर्क व मदत'}
              >
                <Mail className="w-3.5 h-3.5 text-amber-700" />
                <span>{language === 'en' ? 'Contact Us' : 'संपर्क'}</span>
              </button>

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
                  <button
                    type="button"
                    onClick={() => {
                      if ((isSuperAdmin || isAdminAuthenticated()) && onOpenSuperAdmin) {
                        onOpenSuperAdmin();
                      } else {
                        setAdminLoginModalOpen(true);
                      }
                    }}
                    className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs border border-amber-500/40 cursor-pointer shadow-xs transition-colors"
                    title="प्रशासक लॉगिन (Admin Login)"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isSuperAdmin || isAdminAuthenticated() ? 'Super Admin' : 'Admin Login'}</span>
                  </button>


                  {onOpenReferral && (
                    <button
                      type="button"
                      onClick={onOpenReferral}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-bold text-[11px] shadow-xs cursor-pointer border border-amber-500/40 transition-all hover:scale-105 active:scale-95"
                      title="इतर शाळा जोडा आणि बक्षीस मिळवा!"
                    >
                      <Gift className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                      <span>रेफर करा</span>
                    </button>
                  )}

                  <UserButton />
                </div>
              </Show>
            </div>
          </div>

          {/* Mobile Right Controls: Referral, Language Toggle, UserButton & Hamburger Menu */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            {/* Quick Language Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextLang: LanguageMode = language === 'mr' ? 'dual' : language === 'dual' ? 'en' : 'mr';
                setLanguage(nextLang);
              }}
              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold border border-slate-200"
              title="भाषा बदला (Language)"
            >
              {language === 'mr' ? 'मराठी' : language === 'dual' ? 'MR/EN' : 'EN'}
            </button>

            <Show when="signed-out">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-700 hover:bg-amber-800 text-white shadow-xs"
                >
                  {language === 'en' ? 'Sign In' : 'लॉग इन'}
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <div className="flex items-center gap-1.5">
                {onOpenReferral && (
                  <button
                    type="button"
                    onClick={onOpenReferral}
                    className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors"
                    title="रेफर करा"
                  >
                    <Gift className="w-4 h-4 text-amber-700" />
                  </button>
                )}
                <UserButton />
              </div>
            </Show>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end font-sans animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="bg-amber-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-700/80 flex items-center justify-center shrink-0">
                  <Utensils className="w-4 h-4 text-amber-200" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm leading-tight truncate">
                    {profile.schoolName || 'शाळा प्रोफाइल'}
                  </h3>
                  <p className="text-[10px] text-amber-200 truncate mt-0.5">
                    UDISE: {profile.udiseNumber || 'नोंदणी आवश्यक'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">

              {/* Navigation Items */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  मेनू पर्याय (Navigation)
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('daily');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeTab === 'daily'
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <CalendarDays className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>दैनिक नोंद (Daily Entry)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>मासिक नोंदवही (Monthly Register)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('print');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeTab === 'print'
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>शासकीय अहवाल (Print Report)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Settings className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{language === 'en' ? 'Profile & Settings' : 'प्रोफाईल व सेटिंग्ज'}</span>
                </button>
              </div>

              {/* Language Selection */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  भाषा (Language)
                </span>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLanguage('mr')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center ${
                      language === 'mr'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    मराठी
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('dual')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center ${
                      language === 'dual'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    मराठी/EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center ${
                      language === 'en'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {onOpenReferral && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenReferral();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Gift className="w-4 h-4 text-amber-300" />
                    <span>रेफर करा आणि बक्षीस मिळवा!</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setContactModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-amber-700" />
                  <span>संपर्क व ग्राहक सेवा</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if ((isSuperAdmin || isAdminAuthenticated()) && onOpenSuperAdmin) {
                      onOpenSuperAdmin();
                    } else {
                      setAdminLoginModalOpen(true);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold border border-amber-500/40 cursor-pointer shadow-xs transition-colors"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>{isSuperAdmin || isAdminAuthenticated() ? '⚡ Super Admin Console' : '🔐 ॲडमिन लॉगिन (Admin Login)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Ergonomic Bottom Navigation Bar (Visible only on mobile screens) */}
      <nav
        aria-label="Mobile Navigation"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-lg px-2 py-1.5 flex items-center justify-around safe-area-pb"
      >
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${activeTab === 'daily'
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
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${activeTab === 'register'
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
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${activeTab === 'print'
            ? 'text-amber-800 bg-amber-50/80 font-bold'
            : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
        >
          <FileText className={`w-5 h-5 ${activeTab === 'print' ? 'text-rose-600' : 'text-slate-400'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">
            {language === 'en' ? 'Report' : 'शासकीय अहवाल'}
          </span>
          {activeTab === 'print' && (
            <span className="w-1 h-1 rounded-full bg-rose-600 mt-0.5"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${activeTab === 'admin'
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

      {/* Contact Us Modal (Direct email presentation - no text/chat box) */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-400/20">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {language === 'en' ? 'Contact Us' : 'संपर्क व मदत'}
                  </h3>
                  <p className="text-[11px] text-amber-200">
                    {language === 'en' ? 'Admin & Official Support' : 'ॲडमिन व ग्राहक सेवा'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContactModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'en'
                  ? 'For any queries, technical support, account activation, or questions regarding MahaPoshan Register, please send an email directly to our official administration address:'
                  : 'महापोषण रजिस्टर बाबत कोणताही प्रश्न, तांत्रिक अडचण, खाते मंजुरी किंवा मार्गदर्शनासाठी कृपया खालील अधिकृत ॲडमिन ईमेलवर थेट ईमेल पाठवा:'}
              </p>

              {/* Email Address Highlight Card */}
              <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 text-center space-y-2">
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                  {language === 'en' ? 'Official Support & Admin Email' : 'अधिकृत सपोर्ट व ॲडमिन ईमेल'}
                </span>
                <div className="font-mono text-base sm:text-lg font-bold text-amber-950 select-all break-all bg-white px-3 py-2 rounded-xl border border-amber-200 shadow-2xs">
                  poshanragister@gmail.com
                </div>
                <p className="text-[11px] text-slate-500">
                  {language === 'en'
                    ? 'Emails are monitored regularly for swift assistance.'
                    : 'आपल्या सर्व प्रश्नांना या ईमेलद्वारे सत्वर मार्गदर्शन केले जाईल.'}
                </p>
              </div>

              {/* Direct Actions: Mailto & Copy */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <a
                  href="mailto:poshanragister@gmail.com?subject=MahaPoshan%20Register%20Query"
                  className="px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 text-center cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>{language === 'en' ? 'Send Email' : 'ईमेल पाठवा'}</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('poshanragister@gmail.com');
                    setCopiedEmail(true);
                    setTimeout(() => setCopiedEmail(false), 2000);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">{language === 'en' ? 'Copied!' : 'कॉपी झाले!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>{language === 'en' ? 'Copy Email' : 'ईमेल कॉपी करा'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setContactModalOpen(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                {language === 'en' ? 'Close' : 'बंद करा'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Login Modal */}
      <AdminLoginModal
        isOpen={adminLoginModalOpen}
        onClose={() => setAdminLoginModalOpen(false)}
        onLoginSuccess={() => {
          setAdminLoginModalOpen(false);
          if (onOpenSuperAdmin) {
            onOpenSuperAdmin();
          }
        }}
      />
    </>
  );
};

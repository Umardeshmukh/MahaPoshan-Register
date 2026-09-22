import React, { useState, useEffect } from 'react';
import {
  AppData,
  DailyRegisterEntry,
  MonthlyStockInward,
  SchoolProfile,
  Ingredient,
  DishRecipe,
  LanguageMode,
  AppConfig,
} from './types';
import {
  getInitialData,
  saveAppData,
  clearRegisterEntries,
  createEmptyCleanAppData,
} from './lib/storage';
import { useUser } from '@clerk/react';
import { Header } from './components/Header';
import { DailyEntryView } from './components/DailyEntryView';
import { MonthlyRegisterView } from './components/MonthlyRegisterView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { OfficialPrintView } from './components/OfficialPrintView';
import { AuthLandingView } from './components/AuthLandingView';
import { AccessPendingView } from './components/AccessPendingView';
import { SuperAdminPanel } from './components/SuperAdminPanel';
import { getUserAccessStatus, checkCloudAccessStatus } from './lib/subscription-store';
import {
  pullUserDataFromCloud,
  syncDailyEntryToCloud,
  syncDeleteDailyEntryFromCloud,
  syncStockInwardToCloud,
  syncSchoolProfileToCloud,
  syncFullAppDataToCloud,
  subscribeSyncStatus,
  SyncStatus,
  purgeUserRegisterDataFromCloud,
  purgeUserDataFromCloud,
} from './lib/cloud-sync';
import { LegalModal } from './components/LegalModal';
import { ReferralCard } from './components/ReferralCard';
import { LegalDocType } from './types';

export default function App() {
  const [appData, setAppData] = useState<AppData>(() => getInitialData());
  const [activeTab, setActiveTab] = useState<'daily' | 'register' | 'admin' | 'print'>('daily');
  const [printMonthKey, setPrintMonthKey] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [targetDailyDate, setTargetDailyDate] = useState<string | undefined>(undefined);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // Clerk Auth & Subscription state
  const { isLoaded, isSignedIn, user } = useUser();
  const [accessRefreshTrigger, setAccessRefreshTrigger] = useState(0);

  // Legal & Referral Modals state
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [activeLegalTab, setActiveLegalTab] = useState<LegalDocType>('terms');
  const [referralModalOpen, setReferralModalOpen] = useState(false);

  const handleOpenLegal = (tab: LegalDocType) => {
    setActiveLegalTab(tab);
    setLegalModalOpen(true);
  };

  // Subscribe to live cloud sync status
  useEffect(() => {
    return subscribeSyncStatus(setSyncStatus);
  }, []);

  // Track secret route for Super Admin: #super-admin or /super-admin
  const [isSuperAdminRoute, setIsSuperAdminRoute] = useState<boolean>(() => {
    return (
      window.location.hash === '#super-admin' ||
      window.location.pathname.includes('/super-admin')
    );
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setIsSuperAdminRoute(
        window.location.hash === '#super-admin' ||
        window.location.pathname.includes('/super-admin')
      );
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Sync to local storage whenever appData updates
  useEffect(() => {
    saveAppData(appData);
  }, [appData]);

  // Hydrate from Supabase Cloud Database on user login
  useEffect(() => {
    if (isSignedIn && user?.id) {
      pullUserDataFromCloud(user.id).then((cloudData) => {
        const hasCloudEntries =
          cloudData?.dailyEntries && Object.keys(cloudData.dailyEntries).length > 0;
        const hasCloudStock =
          cloudData?.stockInward && Object.keys(cloudData.stockInward).length > 0;
        const hasCloudProfile =
          !!(cloudData?.profile && cloudData.profile.schoolName && !cloudData.profile.schoolName.includes('बोरगाव'));

        if (hasCloudProfile || hasCloudEntries || hasCloudStock) {
          setAppData((prev) => {
            const merged: AppData = {
              ...prev,
              profile: hasCloudProfile && cloudData?.profile ? cloudData.profile : prev.profile,
              dailyEntries: cloudData?.dailyEntries || {},
              stockInward: cloudData?.stockInward || {},
            };
            saveAppData(merged);
            return merged;
          });
        } else {
          // Brand new user signup or clean cloud database
          // Ensure zero daily entries and zero stock inward
          const access = getUserAccessStatus(user.id, user.primaryEmailAddress?.emailAddress);
          const req = access.request;

          setAppData((prev) => {
            const cleanProfile: SchoolProfile = {
              schoolName: req?.schoolName || prev.profile.schoolName || '',
              udiseNumber: req?.udiseNumber || prev.profile.udiseNumber || '',
              centerCluster: req?.centerCluster || prev.profile.centerCluster || '',
              standardCategory: 'इयत्ता १ ली ते ५ वी (प्राथमिक)',
              district: req?.district || prev.profile.district || '',
              taluka: prev.profile.taluka || '',
              headmasterName: req?.userName || user.fullName || prev.profile.headmasterName || '',
              inchargeTeacher: prev.profile.inchargeTeacher || '',
              cookName: prev.profile.cookName || '',
            };

            const cleanApp: AppData = {
              ...prev,
              profile: cleanProfile,
              dailyEntries: {}, // Clean database: absolutely NO entries for a new user
              stockInward: {},  // Clean database: absolutely NO stock inward for a new user
            };

            saveAppData(cleanApp);

            // Sync clean school profile to cloud only if schoolName was provided
            if (cleanProfile.schoolName) {
              syncSchoolProfileToCloud(
                cleanProfile,
                user.id,
                user.primaryEmailAddress?.emailAddress,
                user.fullName || undefined
              ).catch((err) => console.warn('Profile sync notice:', err));
            }

            return cleanApp;
          });
        }
      });
    }
  }, [isSignedIn, user?.id]);

  const handleSetLanguage = (lang: LanguageMode) => {
    setAppData((prev) => ({
      ...prev,
      language: lang,
      config: prev.config
        ? {
            ...prev.config,
            general: {
              ...prev.config.general,
              language: lang,
            },
          }
        : undefined,
    }));
  };

  const handleSaveDailyEntry = (entry: DailyRegisterEntry) => {
    setAppData((prev) => ({
      ...prev,
      dailyEntries: {
        ...prev.dailyEntries,
        [entry.id]: entry,
      },
    }));

    if (user?.id) {
      syncDailyEntryToCloud(entry, user.id);
    }
  };

  const handleDeleteDailyEntry = (dateKey: string) => {
    setAppData((prev) => {
      const nextEntries = { ...prev.dailyEntries };
      delete nextEntries[dateKey];
      return {
        ...prev,
        dailyEntries: nextEntries,
      };
    });

    if (user?.id) {
      syncDeleteDailyEntryFromCloud(dateKey, user.id);
    }
  };

  const handleUpdateStockInward = (
    monthKey: string,
    inward: MonthlyStockInward
  ) => {
    setAppData((prev) => ({
      ...prev,
      stockInward: {
        ...prev.stockInward,
        [monthKey]: inward,
      },
    }));

    if (user?.id) {
      syncStockInwardToCloud(monthKey, inward, user.id);
    }
  };

  const handleUpdateConfig = (newConfig: AppConfig) => {
    setAppData((prev) => ({
      ...prev,
      config: newConfig,
      profile: newConfig.general.school,
      ingredients: newConfig.rates.ingredients,
      recipes: newConfig.menu.weeklyRecipes,
      language: newConfig.general.language,
    }));
  };

  const handleUpdateProfile = (profile: SchoolProfile) => {
    setAppData((prev) => ({
      ...prev,
      profile,
      config: prev.config
        ? {
            ...prev.config,
            general: {
              ...prev.config.general,
              school: profile,
            },
            states: {
              ...prev.config.states,
              district: profile.district,
            },
            lastUpdated: new Date().toISOString(),
          }
        : undefined,
    }));

    if (user?.id) {
      syncSchoolProfileToCloud(
        profile,
        user.id,
        user.primaryEmailAddress?.emailAddress,
        user.fullName || undefined
      );
    }
  };


  const handleUpdateIngredients = (ingredients: Ingredient[]) => {
    setAppData((prev) => {
      const itemRates: Record<string, number> = {};
      ingredients.forEach((i) => {
        itemRates[i.id] = i.ratePerKg;
      });
      return {
        ...prev,
        ingredients,
        config: prev.config
          ? {
              ...prev.config,
              rates: {
                ...prev.config.rates,
                ingredients,
                itemRates,
                lastUpdated: new Date().toISOString(),
              },
              lastUpdated: new Date().toISOString(),
            }
          : undefined,
      };
    });
  };

  const handleUpdateRecipes = (recipes: DishRecipe[]) => {
    setAppData((prev) => ({
      ...prev,
      recipes,
      config: prev.config
        ? {
            ...prev.config,
            menu: {
              ...prev.config.menu,
              weeklyRecipes: recipes,
            },
            lastUpdated: new Date().toISOString(),
          }
        : undefined,
    }));
  };

  const handleRestoreData = (restored: AppData) => {
    setAppData(restored);
  };

  const handleClearRegisterData = async () => {
    setAppData((prev) => clearRegisterEntries(prev));
    if (user?.id) {
      await purgeUserRegisterDataFromCloud(user.id);
    }
  };

  const handleResetAllData = async () => {
    setAppData((prev) => createEmptyCleanAppData(prev.profile));
    if (user?.id) {
      await purgeUserDataFromCloud(user.id);
    }
  };

  const handleRecalculateEntries = (
    updatedEntries: Record<string, DailyRegisterEntry>
  ) => {
    setAppData((prev) => ({
      ...prev,
      dailyEntries: updatedEntries,
    }));
  };

  const handleNavigateToDaily = (dateStr?: string) => {
    if (dateStr) {
      setTargetDailyDate(dateStr);
    }
    setActiveTab('daily');
  };

  const handleOpenPrintView = (monthKey: string) => {
    setPrintMonthKey(monthKey);
    setActiveTab('print');
  };

  const accessStatus = getUserAccessStatus(
    user?.id,
    user?.primaryEmailAddress?.emailAddress
  );

  // Auto-sync school profile from user's access registration request if current profile school name is empty
  useEffect(() => {
    if (isSignedIn && accessStatus.request?.schoolName && !appData.profile.schoolName) {
      const req = accessStatus.request;
      setAppData((prev) => {
        if (prev.profile.schoolName) return prev;
        const updatedProfile: SchoolProfile = {
          ...prev.profile,
          schoolName: req.schoolName,
          udiseNumber: req.udiseNumber || prev.profile.udiseNumber,
          centerCluster: req.centerCluster || prev.profile.centerCluster,
          district: req.district || prev.profile.district,
          headmasterName: req.userName || prev.profile.headmasterName,
        };
        const updated: AppData = {
          ...prev,
          profile: updatedProfile,
        };
        saveAppData(updated);
        return updated;
      });
    }
  }, [isSignedIn, accessStatus.request, appData.profile.schoolName]);

  // Check live access status directly against Supabase on login / refresh
  useEffect(() => {
    if (isSignedIn && user?.id) {
      checkCloudAccessStatus(user.id, user.primaryEmailAddress?.emailAddress).then((liveStatus) => {
        if (liveStatus && liveStatus !== accessStatus.status) {
          setAccessRefreshTrigger((c) => c + 1);
        }
      });
    }
  }, [isSignedIn, user?.id, accessRefreshTrigger, accessStatus.status]);

  // 1. Super Admin Secret Route Gate: /super-admin or #super-admin
  if (isSuperAdminRoute) {
    return (
      <SuperAdminPanel
        currentUserEmail={user?.primaryEmailAddress?.emailAddress}
        onExit={() => {
          window.location.hash = '';
          if (window.location.pathname.includes('/super-admin')) {
            window.history.pushState({}, '', '/');
          }
          setIsSuperAdminRoute(false);
        }}
      />
    );
  }

  // 2. Loading state while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">प्रणाली लोड होत आहे...</p>
        </div>
      </div>
    );
  }

  // 3. Compulsory Sign-In Gate: Show Landing Page if not signed in
  if (!isSignedIn) {
    return <AuthLandingView />;
  }

  // 4. Subscription & Access Approval Gate: Show pending/expired view if not approved
  if (accessStatus.status !== 'active') {
    return (
      <AccessPendingView
        initialRequest={accessStatus.request}
        status={accessStatus.status}
        onRefresh={() => setAccessRefreshTrigger((c) => c + 1)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Header is shown on screen, hidden in print mode */}
      {activeTab !== 'print' && (
        <Header
          profile={appData.profile}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          language={appData.language}
          setLanguage={handleSetLanguage}
          daysRemaining={accessStatus.daysRemaining}
          isSuperAdmin={accessStatus.isSuperAdmin}
          syncStatus={syncStatus}
          onOpenSuperAdmin={() => {
            window.location.hash = '#super-admin';
            setIsSuperAdminRoute(true);
          }}
          onOpenReferral={() => setReferralModalOpen(true)}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 pb-24 md:pb-10">
        {activeTab === 'daily' && (
          <DailyEntryView
            ingredients={appData.ingredients}
            recipes={appData.recipes}
            dailyEntries={appData.dailyEntries}
            language={appData.language}
            initialDate={targetDailyDate}
            onSaveEntry={handleSaveDailyEntry}
            onDeleteEntry={handleDeleteDailyEntry}
            onNavigateToRegister={() => setActiveTab('register')}
          />
        )}

        {activeTab === 'register' && (
          <MonthlyRegisterView
            appData={appData}
            language={appData.language}
            onUpdateStockInward={handleUpdateStockInward}
            onNavigateToDaily={handleNavigateToDaily}
            onOpenPrintView={handleOpenPrintView}
          />
        )}

        {activeTab === 'admin' && (
          <AdminSettingsView
            appData={appData}
            language={appData.language}
            onUpdateConfig={handleUpdateConfig}
            onUpdateProfile={handleUpdateProfile}
            onUpdateIngredients={handleUpdateIngredients}
            onUpdateRecipes={handleUpdateRecipes}
            onRestoreData={handleRestoreData}
            onRecalculateEntries={handleRecalculateEntries}
            onClearRegisterData={handleClearRegisterData}
            onResetAllData={handleResetAllData}
          />
        )}

        {activeTab === 'print' && (
          <OfficialPrintView
            monthKey={printMonthKey}
            appData={appData}
            onClose={() => setActiveTab('register')}
          />
        )}
      </main>

      {/* Footer with 4 Mandatory Legal Links */}
      {activeTab !== 'print' && (
        <footer className="no-print hidden md:block bg-white border-t border-slate-200/80 py-4 px-4 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-700">
                महाराष्ट्र शासन • शालेय पोषण आहार योजना (PM POSHAN) • शाळा स्तरवार दैनिक खर्च नोंदवही
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Offline-ready • स्थानिक साठवणूक (Local Storage) • सुरक्षित क्लाउड सिंक
              </p>
            </div>

            {/* Legal Documents Links */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              <button
                type="button"
                onClick={() => handleOpenLegal('terms')}
                className="text-slate-600 hover:text-amber-800 hover:underline cursor-pointer transition-colors"
              >
                1. Terms & Conditions
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => handleOpenLegal('privacy')}
                className="text-slate-600 hover:text-amber-800 hover:underline cursor-pointer transition-colors"
              >
                2. Privacy Policy
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => handleOpenLegal('refund')}
                className="text-slate-600 hover:text-amber-800 hover:underline cursor-pointer transition-colors"
              >
                3. Refund Policy
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => handleOpenLegal('contact')}
                className="text-slate-600 hover:text-amber-800 hover:underline cursor-pointer transition-colors"
              >
                4. Contact & Legal
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Legal Documents Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        initialTab={activeLegalTab}
        onClose={() => setLegalModalOpen(false)}
      />

      {/* Referral Modal */}
      {referralModalOpen && (
        <ReferralCard
          isModal={true}
          user={user}
          schoolName={appData.profile.schoolName}
          udiseNumber={appData.profile.udiseNumber}
          onClose={() => setReferralModalOpen(false)}
        />
      )}
    </div>
  );
}

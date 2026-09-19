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
import { getInitialData, saveAppData } from './lib/storage';
import { Header } from './components/Header';
import { DailyEntryView } from './components/DailyEntryView';
import { MonthlyRegisterView } from './components/MonthlyRegisterView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { OfficialPrintView } from './components/OfficialPrintView';

export default function App() {
  const [appData, setAppData] = useState<AppData>(() => getInitialData());
  const [activeTab, setActiveTab] = useState<'daily' | 'register' | 'admin' | 'print'>('daily');
  const [printMonthKey, setPrintMonthKey] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [targetDailyDate, setTargetDailyDate] = useState<string | undefined>(undefined);

  // Sync to local storage whenever appData updates
  useEffect(() => {
    saveAppData(appData);
  }, [appData]);

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

      {/* Footer */}
      {activeTab !== 'print' && (
        <footer className="no-print hidden md:block bg-white border-t border-slate-200/80 py-5 px-4 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              महाराष्ट्र शासन • शालेय पोषण आहार योजना (PM POSHAN) • शाळा स्तरवार दैनिक खर्च नोंदवही
            </p>
            <p className="text-slate-400">
              Offline-ready • स्थानिक साठवणूक (Local Storage) • सुरक्षित डेटा
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

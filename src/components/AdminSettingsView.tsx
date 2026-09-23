import React, { useState, useMemo } from 'react';
import {
  SchoolProfile,
  Ingredient,
  DishRecipe,
  AppData,
  LanguageMode,
  DailyRegisterEntry,
  AppConfig,
  GeneralSettings,
  StateNormConfig,
  MenuConfig,
} from '../types';
import {
  exportDataAsJSON,
  exportConfigAsJSON,
  createDefaultSeedData,
  createDefaultAppConfig,
  clearRegisterEntries,
  createEmptyCleanAppData,
} from '../lib/storage';
import {
  OFFICIAL_REGISTER_COLUMNS,
  DEFAULT_INGREDIENTS,
  DEFAULT_RECIPES,
  DEFAULT_SCHOOL_PROFILE,
  AVAILABLE_PULSE_OPTIONS,
  MENU_PRESETS,
  MAHARASHTRA_DIVISIONS,
  ACADEMIC_YEARS,
} from '../lib/constants';
import {
  recalculateEntriesCost,
  formatINR,
  calculateDayConsumption,
} from '../lib/mdm-calculator';
import {
  School,
  Utensils,
  DollarSign,
  Save,
  CheckCircle2,
  Database,
  Download,
  Upload,
  RotateCcw,
  Sliders,
  AlertTriangle,
  Search,
  Filter,
  Calculator,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Info,
  ArrowRight,
  AlertCircle,
  Check,
  Settings,
  Calendar,
  Copy,
  FileCode,
  Layers,
  Plus,
  Trash2,
  ShieldCheck,
  HelpCircle,
  CheckCheck,
} from 'lucide-react';

interface AdminSettingsViewProps {
  appData: AppData;
  language: LanguageMode;
  initialTab?: 'general' | 'menu' | 'rates' | 'config';
  onUpdateConfig?: (config: AppConfig) => void;
  onUpdateProfile: (profile: SchoolProfile) => void;
  onUpdateIngredients: (ingredients: Ingredient[]) => void;
  onUpdateRecipes: (recipes: DishRecipe[]) => void;
  onRestoreData: (restored: AppData) => void;
  onRecalculateEntries?: (updatedEntries: Record<string, DailyRegisterEntry>) => void;
  onClearRegisterData?: () => void;
  onResetAllData?: () => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  appData,
  language,
  initialTab = 'general',
  onUpdateConfig,
  onUpdateProfile,
  onUpdateIngredients,
  onUpdateRecipes,
  onRestoreData,
  onRecalculateEntries,
  onClearRegisterData,
  onResetAllData,
}) => {
  // Extract or initialize the config node
  const activeConfig = useMemo(() => {
    return (
      appData.config ||
      createDefaultAppConfig(
        appData.profile,
        appData.ingredients,
        appData.recipes,
        appData.language
      )
    );
  }, [appData]);

  // Local state copies for editing
  const [activeTab, setActiveTab] = useState<'general' | 'menu' | 'rates' | 'config'>(initialTab);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [copiedConfig, setCopiedConfig] = useState<boolean>(false);

  // General Settings Form state
  const [generalForm, setGeneralForm] = useState<GeneralSettings>({
    school: { ...appData.profile },
    academicYear: activeConfig.general?.academicYear || '2026-2027',
    workingDaysPerMonthDefault: activeConfig.general?.workingDaysPerMonthDefault || 24,
    language: activeConfig.general?.language || appData.language || 'dual',
    showMarathiDigitsInReports: activeConfig.general?.showMarathiDigitsInReports || false,
    officialRegisterTitle:
      activeConfig.general?.officialRegisterTitle ||
      'शाळा स्तरावर ठेवायची दैनिक खर्च नोंदवही भाग-२ (धान्यादी मालाचे हिशोब)',
    officialRegisterPageNumber: activeConfig.general?.officialRegisterPageNumber || '४३',
    tollFreeHelpline: activeConfig.general?.tollFreeHelpline || '१८०० २३३ ९९८८',
    autoCalculateCost: activeConfig.general?.autoCalculateCost ?? true,
    autoSaveIntervalSeconds: activeConfig.general?.autoSaveIntervalSeconds || 5,
  });

  // State Norms Form state
  const [stateNormsForm, setStateNormsForm] = useState<StateNormConfig>({
    ...activeConfig.states,
    district: appData.profile.district || activeConfig.states?.district || 'पुणे',
    division: activeConfig.states?.division || 'पुणे विभाग (Pune)',
    category: activeConfig.states?.category || 'primary',
    cookingCostNormPerStudent:
      activeConfig.states?.category === 'upper_primary' ? 8.17 : 5.45,
  });

  // Menu Form state
  const [recipesForm, setRecipesForm] = useState<DishRecipe[]>(
    JSON.parse(JSON.stringify(appData.recipes || DEFAULT_RECIPES))
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>('mh_standard');
  const [supplementConfig, setSupplementConfig] = useState({
    enabled: activeConfig.menu?.enableEggOrFruitSupplement ?? true,
    dayOfWeek: activeConfig.menu?.supplementDayOfWeek ?? 3,
    nameMr: activeConfig.menu?.supplementNameMr || 'अंडे / केळी / चिक्की / राजगिरा लाडू',
    rate: activeConfig.menu?.supplementRatePerServing || 5.0,
  });

  // Rates & Ingredients Form state
  const [ingredientsForm, setIngredientsForm] = useState<Ingredient[]>(
    JSON.parse(JSON.stringify(appData.ingredients || DEFAULT_INGREDIENTS))
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [simStudents, setSimStudents] = useState<number>(100);
  const [simDishId, setSimDishId] = useState<string>(recipesForm[0]?.id || 'mon_masoor');
  const [showRecalcModal, setShowRecalcModal] = useState<boolean>(false);
  const [recalcMonth, setRecalcMonth] = useState<string>('current');

  // Helper for notification toasts
  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // 2-Step User Data Deletion Modal state (asks two times)
  const [deleteModalType, setDeleteModalType] = useState<'register_only' | 'all_data' | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [deleteCheckbox, setDeleteCheckbox] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');

  const handleOpenUserDeleteModal = (type: 'register_only' | 'all_data') => {
    setDeleteModalType(type);
    setDeleteStep(1);
    setDeleteConfirmText('');
    setDeleteCheckbox(false);
    setDeleteError('');
  };

  const handleProceedUserDeleteStep2 = () => {
    setDeleteStep(2);
    setDeleteError('');
  };

  const handleConfirmUserDeletion = () => {
    if (!deleteCheckbox) {
      setDeleteError(
        language === 'en'
          ? 'Please check the box to confirm you understand this action.'
          : 'कृपया पुष्टीकरण बॉक्सवर टिक करा.'
      );
      return;
    }

    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError(
        language === 'en'
          ? 'Please type DELETE in capital letters to confirm.'
          : 'कृपया पुष्टी करण्यासाठी मोठ्या अक्षरात DELETE टाईप करा.'
      );
      return;
    }

    if (deleteModalType === 'register_only') {
      if (onClearRegisterData) {
        onClearRegisterData();
      } else {
        const cleared = clearRegisterEntries(appData);
        onRestoreData(cleared);
      }
      triggerToast(
        language === 'en'
          ? 'All daily register entries and stock data have been deleted.'
          : 'सर्व दैनिक नोंदी व साठा डेटा यशस्वीरीत्या हटवण्यात आला!'
      );
    } else if (deleteModalType === 'all_data') {
      if (onResetAllData) {
        onResetAllData();
      } else {
        const fresh = createEmptyCleanAppData(appData.profile);
        onRestoreData(fresh);
      }
      triggerToast(
        language === 'en'
          ? 'All school data has been reset successfully.'
          : 'सर्व शाळा डेटा यशस्वीरीत्या हटवून रीसेट करण्यात आला!'
      );
    }

    setDeleteModalType(null);
  };

  // 1. SAVE GENERAL SETTINGS
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();

    // Synchronize school profile
    onUpdateProfile(generalForm.school);

    // Build updated full config node
    const updatedConfig: AppConfig = {
      ...activeConfig,
      lastUpdated: new Date().toISOString(),
      general: {
        ...generalForm,
      },
      states: {
        ...stateNormsForm,
        district: generalForm.school.district,
        lastRecalculatedAt: new Date().toISOString(),
      },
      rates: {
        ...activeConfig.rates,
        primaryStudentCookingNorm: stateNormsForm.cookingCostNormPerStudent,
      },
    };

    if (onUpdateConfig) {
      onUpdateConfig(updatedConfig);
    }

    triggerToast('सर्व सामान्य सेटिंग्ज व शाळा माहिती यशस्वीरीत्या जतन झाली!');
  };

  // 2. SAVE MENU SETTINGS
  const handleSaveMenu = () => {
    onUpdateRecipes(recipesForm);

    const updatedConfig: AppConfig = {
      ...activeConfig,
      lastUpdated: new Date().toISOString(),
      menu: {
        weeklyRecipes: recipesForm,
        rotationCycleDays: 6,
        enableEggOrFruitSupplement: supplementConfig.enabled,
        supplementDayOfWeek: supplementConfig.dayOfWeek,
        supplementNameMr: supplementConfig.nameMr,
        supplementRatePerServing: supplementConfig.rate,
        defaultServingTime: '12:30 PM',
      },
    };

    if (onUpdateConfig) {
      onUpdateConfig(updatedConfig);
    }

    triggerToast('६ दिवसांचे मेन्यू चक्र व पूरक आहार सेटिंग्ज यशस्वीरीत्या जतन झाले!');
  };

  // Apply Preset Menu
  const handleApplyPreset = () => {
    const preset = MENU_PRESETS.find((p) => p.id === selectedPresetId);
    if (!preset) return;

    if (
      window.confirm(
        `तुम्हाला "${preset.nameMr}" हा मेन्यू प्रीसेट लागू करायचा आहे का? वर्तमान मेन्यू बदलला जाईल.`
      )
    ) {
      const cloned = JSON.parse(JSON.stringify(preset.recipes));
      setRecipesForm(cloned);
      onUpdateRecipes(cloned);

      if (preset.id === 'mh_upper_primary') {
        setStateNormsForm((prev) => ({
          ...prev,
          category: 'upper_primary',
          categoryNameMr: 'इयत्ता ६ वी ते ८ वी (उच्च प्राथमिक)',
          cookingCostNormPerStudent: 8.17,
          riceGramNorm: 150,
          pulseGramNorm: 30,
        }));
      } else if (preset.id === 'mh_standard') {
        setStateNormsForm((prev) => ({
          ...prev,
          category: 'primary',
          categoryNameMr: 'इयत्ता १ ली ते ५ वी (प्राथमिक)',
          cookingCostNormPerStudent: 5.45,
          riceGramNorm: 100,
          pulseGramNorm: 20,
        }));
      }

      triggerToast(`"${preset.nameMr}" यशस्वीरीत्या मेन्यूमध्ये लागू केला!`);
    }
  };

  // Add Custom Dish to Menu
  const handleAddCustomDish = () => {
    const newDish: DishRecipe = {
      id: `custom_${Date.now()}`,
      dayOfWeek: recipesForm.length + 1,
      dayNameMr: 'पर्यायी दिवस',
      dayNameEn: 'Special Day',
      nameMr: 'पौष्टिक वरण-भात व भाजी',
      nameEn: 'Nutritious Varan Bhaat',
      pulseIngredientId: 'tur_dal',
      pulseGrams: 20,
      includesRice: true,
      riceGrams: 100,
    };
    setRecipesForm((prev) => [...prev, newDish]);
    triggerToast('नवीन मेन्यू प्रकार जोडला गेला. कृपया नाव व डाळ तपासून जतन करा.');
  };

  const handleRemoveDish = (id: string) => {
    if (recipesForm.length <= 1) {
      alert('कमीत कमी एक मेन्यू असणे आवश्यक आहे!');
      return;
    }
    if (confirm('हा मेन्यू काढून टाकायचा आहे का?')) {
      setRecipesForm((prev) => prev.filter((d) => d.id !== id));
      triggerToast('मेन्यू हटवला गेला.');
    }
  };

  // 3. SAVE RATES & INGREDIENTS
  const handleSaveIngredients = () => {
    onUpdateIngredients(ingredientsForm);

    const itemRates: Record<string, number> = {};
    ingredientsForm.forEach((ing) => {
      itemRates[ing.id] = ing.ratePerKg;
    });

    const updatedConfig: AppConfig = {
      ...activeConfig,
      lastUpdated: new Date().toISOString(),
      rates: {
        ...activeConfig.rates,
        itemRates,
        ingredients: ingredientsForm,
        lastUpdated: new Date().toISOString(),
      },
    };

    if (onUpdateConfig) {
      onUpdateConfig(updatedConfig);
    }

    triggerToast('साहित्याचे दर, ग्रॅम प्रमाण व खर्च स्टेट्स यशस्वीरीत्या जतन झाले!');
  };

  // Helper for ingredient rate/gram editing
  const handleRateChange = (id: string, newRate: number) => {
    const val = Math.max(0, Number(newRate) || 0);
    setIngredientsForm((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, ratePerKg: val } : ing))
    );
  };

  const handleAdjustRate = (id: string, delta: number) => {
    setIngredientsForm((prev) =>
      prev.map((ing) =>
        ing.id === id ? { ...ing, ratePerKg: Math.max(0, (ing.ratePerKg || 0) + delta) } : ing
      )
    );
  };

  const handleGramsChange = (id: string, newGrams: number) => {
    const val = Math.max(0, Number(newGrams) || 0);
    setIngredientsForm((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, defaultGrams: val } : ing))
    );
  };

  const handleResetDefaultRates = () => {
    if (
      window.confirm(
        'तुम्हाला सर्व साहित्याचे खरेदी दर मूळ प्रमाणित शासकीय/बाजारातील सरासरी दरांवर रीसेट करायचे आहेत का?'
      )
    ) {
      const reset = ingredientsForm.map((ing) => {
        const def = DEFAULT_INGREDIENTS.find((d) => d.id === ing.id);
        return def
          ? { ...ing, ratePerKg: def.ratePerKg, defaultGrams: def.defaultGrams }
          : ing;
      });
      setIngredientsForm(reset);
      onUpdateIngredients(reset);
      triggerToast('साहित्याचे दर मूळ प्रमाणित दरांवर रीसेट झाले!');
    }
  };

  // Recalculate historical daily entries
  const handleRecalculateSavedEntries = () => {
    if (!onRecalculateEntries) {
      triggerToast('नोंदी अद्ययावत करण्याची सुविधा उपलब्ध नाही.');
      return;
    }

    onUpdateIngredients(ingredientsForm);

    const currentMonthKey = `${new Date().getFullYear()}-${String(
      new Date().getMonth() + 1
    ).padStart(2, '0')}`;

    const targetMonth =
      recalcMonth === 'all'
        ? undefined
        : recalcMonth === 'current'
        ? currentMonthKey
        : recalcMonth;

    const result = recalculateEntriesCost(
      appData.dailyEntries,
      ingredientsForm,
      targetMonth
    );

    onRecalculateEntries(result.updatedEntries);
    setShowRecalcModal(false);
    triggerToast(
      `यशस्वी! ${result.recalculatedCount} जतन केलेल्या दैनंदिन नोंदींचा खर्च नवीन दरांनुसार पुन्हा मोजला गेला.`
    );
  };

  // Copy config JSON
  const handleCopyConfigJSON = () => {
    const configToCopy = appData.config || activeConfig;
    navigator.clipboard.writeText(JSON.stringify(configToCopy, null, 2));
    setCopiedConfig(true);
    triggerToast('संपूर्ण Config Node क्लिपबोर्डवर कॉपी झाला!');
    setTimeout(() => setCopiedConfig(false), 3000);
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (parsed.profile || parsed.config)) {
          onRestoreData(parsed);
          if (parsed.profile) setGeneralForm((prev) => ({ ...prev, school: parsed.profile }));
          if (parsed.ingredients) setIngredientsForm(parsed.ingredients);
          if (parsed.recipes) setRecipesForm(parsed.recipes);
          triggerToast('बॅकअप डेटा यशस्वीरीत्या रिस्टोअर झाला!');
        } else {
          alert('अवैध डेटा फॉरमॅट. कृपया वैध PM POSHAN JSON फाईल निवडा.');
        }
      } catch (err) {
        alert('फाईल वाचताना त्रुटी आली. कृपया योग्य फाईल तपासा.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Official Column Number map
  const officialColMap = useMemo(() => {
    const map = new Map<string, number>();
    OFFICIAL_REGISTER_COLUMNS.forEach((col) => {
      map.set(col.id, col.colNum);
    });
    return map;
  }, []);

  // Live Cost Simulator
  const activeSimRecipe = useMemo(() => {
    return recipesForm.find((r) => r.id === simDishId) || recipesForm[0];
  }, [recipesForm, simDishId]);

  const simCalculation = useMemo(() => {
    if (!activeSimRecipe || simStudents <= 0) {
      return null;
    }
    return calculateDayConsumption(simStudents, activeSimRecipe, ingredientsForm);
  }, [simStudents, activeSimRecipe, ingredientsForm]);

  // Filtered ingredients
  const filteredIngredients = useMemo(() => {
    return ingredientsForm.filter((ing) => {
      if (selectedCategory !== 'all' && ing.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchMr = ing.nameMr.toLowerCase().includes(q);
        const matchEn = ing.nameEn.toLowerCase().includes(q);
        return matchMr || matchEn;
      }
      return true;
    });
  }, [ingredientsForm, selectedCategory, searchQuery]);

  const categoriesList = [
    { id: 'all', labelMr: 'सर्व साहित्य', count: ingredientsForm.length },
    {
      id: 'pulse',
      labelMr: 'कडधान्ये व डाळी',
      count: ingredientsForm.filter((i) => i.category === 'pulse').length,
    },
    {
      id: 'grain',
      labelMr: 'तांदूळ / धान्य',
      count: ingredientsForm.filter((i) => i.category === 'grain').length,
    },
    {
      id: 'condiment',
      labelMr: 'मसाले व मीठ',
      count: ingredientsForm.filter((i) => i.category === 'condiment').length,
    },
    {
      id: 'oil',
      labelMr: 'खाद्यतेल',
      count: ingredientsForm.filter((i) => i.category === 'oil').length,
    },
    {
      id: 'vegetable',
      labelMr: 'भाजीपाला',
      count: ingredientsForm.filter((i) => i.category === 'vegetable').length,
    },
    {
      id: 'supplementary',
      labelMr: 'पूरक आहार',
      count: ingredientsForm.filter((i) => i.category === 'supplementary').length,
    },
  ];

  // Helper to compute cost per plate for a recipe
  const computeDishCostPerStudent = (recipe: DishRecipe) => {
    const calc = calculateDayConsumption(1, recipe, ingredientsForm);
    return calc.totalCookingCost;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Toast Notification */}
      {saveToast && (
        <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2.5 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Main Admin Header and Navigation Tabs */}
      <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              प्रशासकीय नियंत्रण कक्ष (Admin Master Panel)
            </span>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Config Node v{activeConfig.version || 2}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            शाळा सेटिंग्ज, मेन्यू चक्र, साहित्य दर व कॉन्फिग
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            शाळा प्रोफाईल, ६ दिवसांचे मेन्यू चक्र, दर निश्चिती आणि कॉन्फिग नोडचे सर्व सामान्य सेटिंग्ज उपलब्ध आहेत
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 text-xs sm:text-sm font-medium overflow-x-auto w-full lg:w-auto gap-1">
          <button
            id="tab-btn-general"
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-white text-amber-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4 text-amber-700" />
            <span>सामान्य (General)</span>
          </button>

          <button
            id="tab-btn-menu"
            type="button"
            onClick={() => setActiveTab('menu')}
            className={`px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'menu'
                ? 'bg-white text-amber-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Utensils className="w-4 h-4 text-amber-700" />
            <span>मेन्यू (Menu)</span>
          </button>

          <button
            id="tab-btn-rates"
            type="button"
            onClick={() => setActiveTab('rates')}
            className={`px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'rates'
                ? 'bg-white text-amber-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4 text-amber-700" />
            <span>साहित्य प्रमाण (Matrix)</span>
          </button>

          <button
            id="tab-btn-config"
            type="button"
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-white text-amber-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-4 h-4 text-blue-700" />
            <span>कॉन्फिग (Config)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GENERAL SETTINGS (सामान्य सेटिंग्ज) */}
      {/* ========================================================================= */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="space-y-6">
          {/* Action banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-700" />
                <span>सर्व सामान्य व प्रशासकीय सेटिंग्ज (General Settings)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                शैक्षणिक वर्ष, इयत्ता श्रेणी, नोंदवही शीर्षक, शाळा प्रोफाईल व अधिकारी माहिती कॉन्फिग नोडमध्ये सुरक्षित केली जाते
              </p>
            </div>
            <button
              id="save-general-btn"
              type="submit"
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>सामान्य सेटिंग्ज जतन करा</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1.1 Academic & Government State Norms */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-700" />
                  <span>शैक्षणिक वर्ष व शासकीय निकष (Academic & Norms)</span>
                </h4>
                <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                  config.states & general
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    शैक्षणिक वर्ष (Academic Year):
                  </label>
                  <select
                    value={generalForm.academicYear}
                    onChange={(e) =>
                      setGeneralForm({ ...generalForm, academicYear: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {ACADEMIC_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    इयत्ता वर्गवारी (Standard Category):
                  </label>
                  <select
                    value={stateNormsForm.category}
                    onChange={(e) => {
                      const cat = e.target.value as 'primary' | 'upper_primary';
                      setStateNormsForm({
                        ...stateNormsForm,
                        category: cat,
                        categoryNameMr:
                          cat === 'upper_primary'
                            ? 'इयत्ता ६ वी ते ८ वी (उच्च प्राथमिक)'
                            : 'इयत्ता १ ली ते ५ वी (प्राथमिक)',
                        cookingCostNormPerStudent: cat === 'upper_primary' ? 8.17 : 5.45,
                        riceGramNorm: cat === 'upper_primary' ? 150 : 100,
                        pulseGramNorm: cat === 'upper_primary' ? 30 : 20,
                      });
                      setGeneralForm({
                        ...generalForm,
                        school: {
                          ...generalForm.school,
                          standardCategory:
                            cat === 'upper_primary'
                              ? 'इयत्ता ६ वी ते ८ वी (उच्च प्राथमिक)'
                              : 'इयत्ता १ ली ते ५ वी (प्राथमिक)',
                        },
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="primary">इयत्ता १ ली ते ५ वी (प्राथमिक - Primary)</option>
                    <option value="upper_primary">इयत्ता ६ वी ते ८ वी (उच्च प्राथमिक - Upper Primary)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    प्रशासकीय विभाग (Division):
                  </label>
                  <select
                    value={stateNormsForm.division}
                    onChange={(e) =>
                      setStateNormsForm({ ...stateNormsForm, division: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {MAHARASHTRA_DIVISIONS.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    मासिक सरासरी कामाचे दिवस (Working Days):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={generalForm.workingDaysPerMonthDefault}
                    onChange={(e) =>
                      setGeneralForm({
                        ...generalForm,
                        workingDaysPerMonthDefault: parseInt(e.target.value, 10) || 24,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    शासकीय पाककला खर्च दर प्रति विद्यार्थी:
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      step="0.01"
                      value={stateNormsForm.cookingCostNormPerStudent}
                      onChange={(e) =>
                        setStateNormsForm({
                          ...stateNormsForm,
                          cookingCostNormPerStudent: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono font-bold text-amber-900"
                    />
                    <span className="ml-2 font-bold text-slate-600 text-xs">₹/विद्यार्थी</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    (महाराष्ट्र शासन निकष: प्राथमिक ₹५.४५ / उच्च प्राथमिक ₹८.१७)
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    खर्च गणना पद्धती (Auto Calculate Cost):
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="toggle-auto-cost"
                      checked={generalForm.autoCalculateCost}
                      onChange={(e) =>
                        setGeneralForm({
                          ...generalForm,
                          autoCalculateCost: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <label htmlFor="toggle-auto-cost" className="text-slate-800 font-semibold cursor-pointer">
                      दरानुसार स्वयंचलित खर्च मोजा
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 1.2 Official Register & Print Customization */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-700" />
                  <span>नोंदवही अहवाल व प्रिंट सेटिंग्ज (Register & Print)</span>
                </h4>
                <span className="text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-semibold">
                  config.general
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    नोंदवही अधिकृत शीर्षक (Register Header Title):
                  </label>
                  <input
                    type="text"
                    value={generalForm.officialRegisterTitle}
                    onChange={(e) =>
                      setGeneralForm({
                        ...generalForm,
                        officialRegisterTitle: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      नोंदवही पृष्ठ क्रमांक (Page No.):
                    </label>
                    <input
                      type="text"
                      value={generalForm.officialRegisterPageNumber}
                      onChange={(e) =>
                        setGeneralForm({
                          ...generalForm,
                          officialRegisterPageNumber: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      तक्रार निवारण टोल-फ्री क्रमांक:
                    </label>
                    <input
                      type="text"
                      value={generalForm.tollFreeHelpline}
                      onChange={(e) =>
                        setGeneralForm({
                          ...generalForm,
                          tollFreeHelpline: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    अहवालात मराठी देवनागरी आकडे दर्शवा (उदा. १२३ vs 123):
                  </label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="checkbox"
                      id="toggle-marathi-digits"
                      checked={generalForm.showMarathiDigitsInReports}
                      onChange={(e) =>
                        setGeneralForm({
                          ...generalForm,
                          showMarathiDigitsInReports: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <label htmlFor="toggle-marathi-digits" className="text-slate-800 font-semibold cursor-pointer">
                      अहवालाच्या प्रिंट व PDF मध्ये देवनागरी आकडे वापरा
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 1.3 School Profile */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4 lg:col-span-2">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <School className="w-4 h-4 text-amber-700" />
                  <span>शाळा व शिक्षक तपशील (School & Staff Profile)</span>
                </h4>
                <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                  config.general.school
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    शाळेचे नाव (School Name):
                  </label>
                  <input
                    type="text"
                    value={generalForm.school.schoolName}
                    onChange={(e) =>
                      setGeneralForm({
                        ...generalForm,
                        school: { ...generalForm.school, schoolName: e.target.value },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    यु-डायस क्रमांक (UDISE No.):
                  </label>
                  <input
                    type="text"
                    value={generalForm.school.udiseNumber}
                    onChange={(e) =>
                      setGeneralForm({
                        ...generalForm,
                        school: { ...generalForm.school, udiseNumber: e.target.value },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    केंद्र / बीट (Center/Cluster):
                  </label>
                  <input
                    type="text"
                    value={generalForm.school.centerCluster}
                    onChange={(e) =>
                      setGeneralForm({
                        ...generalForm,
                        school: { ...generalForm.school, centerCluster: e.target.value },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    तालुका (Taluka):
                  </label>
                  <input
                    type="text"
                    value={generalForm.school.taluka}
                    onChange={(e) =>
                      setGeneralForm({
                        ...generalForm,
                        school: { ...generalForm.school, taluka: e.target.value },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    जिल्हा (District):
                  </label>
                  <input
                    type="text"
                    value={generalForm.school.district}
                    onChange={(e) =>
                      setGeneralForm({
                        ...generalForm,
                        school: { ...generalForm.school, district: e.target.value },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    मुख्याध्यापकांचे नाव (Headmaster):
                  </label>
                  <input
                    type="text"
                    value={generalForm.school.headmasterName}
                    onChange={(e) =>
                      setGeneralForm({
                        ...generalForm,
                        school: { ...generalForm.school, headmasterName: e.target.value },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    पोषण आहार प्रभारी शिक्षक (In-charge Teacher):
                  </label>
                  <input
                    type="text"
                    value={generalForm.school.inchargeTeacher}
                    onChange={(e) =>
                      setGeneralForm({
                        ...generalForm,
                        school: { ...generalForm.school, inchargeTeacher: e.target.value },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    मुख्य स्वयंपाकी / मदतनीस नाव (Cook / Helper):
                  </label>
                  <input
                    type="text"
                    value={generalForm.school.cookName}
                    onChange={(e) =>
                      setGeneralForm({
                        ...generalForm,
                        school: { ...generalForm.school, cookName: e.target.value },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MENU SETTINGS (मेन्यू व्यवस्थापन - Change menu from settings) */}
      {/* ========================================================================= */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          {/* Header & Save Action */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  config.menu (साप्ताहिक मेन्यू नोड)
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2 mt-1">
                <Utensils className="w-5 h-5 text-amber-700" />
                <span>शासकीय ६-दिवसीय चक्राकार मेन्यू व्यवस्थापन (Weekly Rotation Menu)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                येथून शिक्षक सोमवार ते शनिवारचा मेन्यू, वापरले जाणारे कडधान्य/डाळ आणि प्रति विद्यार्थी ग्रॅम प्रमाण बदलू शकतात
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAddCustomDish}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>नवीन मेन्यू जोडा</span>
              </button>

              <button
                id="save-menu-btn"
                type="button"
                onClick={handleSaveMenu}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>मेन्यू बदल जतन करा</span>
              </button>
            </div>
          </div>

          {/* Preset Menu Selector */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  प्रमाणित शासकीय मेन्यू टेम्पलेट्स (Quick Presets)
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  एका क्लिकवर प्रमाणित मेन्यू लागू करा
                </h4>
                <p className="text-xs text-slate-600">
                  महाराष्ट्र शासन पोषण आहार नियमांनुसार प्राथमिक (१ली ते ५वी) व उच्च प्राथमिक (६वी ते ८वी) मेन्यू एका क्लिकवर निवडा
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {MENU_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.nameMr}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleApplyPreset}
                  className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>हा मेन्यू लागू करा</span>
                </button>
              </div>
            </div>
          </div>

          {/* 6-Day Menu Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipesForm.map((recipe, index) => {
              const estimatedPlateCost = computeDishCostPerStudent(recipe);

              return (
                <div
                  key={recipe.id}
                  className="border border-slate-200 rounded-2xl p-5 bg-white shadow-xs hover:border-amber-400 transition-all space-y-4 relative group"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">
                        #{recipe.dayOfWeek}
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          {recipe.dayNameMr}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {recipe.dayNameEn}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
                        title="साहित्य दरानुसार प्रति थाळी अंदाजे खर्च"
                      >
                        {formatINR(estimatedPlateCost)} / थाळी
                      </span>

                      {recipesForm.length > 6 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDish(recipe.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          title="हा मेन्यू काढा"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dish Name */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      मेन्यू नाव (मराठी):
                    </label>
                    <input
                      type="text"
                      value={recipe.nameMr}
                      onChange={(e) => {
                        const updated = [...recipesForm];
                        updated[index].nameMr = e.target.value;
                        setRecipesForm(updated);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Pulse Picker */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      वापरले जाणारे कडधान्य / डाळ (Pulse):
                    </label>
                    <select
                      value={recipe.pulseIngredientId}
                      onChange={(e) => {
                        const updated = [...recipesForm];
                        updated[index].pulseIngredientId = e.target.value;
                        setRecipesForm(updated);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {AVAILABLE_PULSE_OPTIONS.map((pulse) => (
                        <option key={pulse.id} value={pulse.id}>
                          {pulse.nameMr} ({pulse.nameEn})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pulse Grams & Rice Grams */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Pulse Grams */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        कडधान्य प्रमाण:
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={recipe.pulseGrams}
                          onChange={(e) => {
                            const updated = [...recipesForm];
                            updated[index].pulseGrams =
                              parseInt(e.target.value, 10) || 0;
                            setRecipesForm(updated);
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 text-center"
                        />
                        <span className="text-[11px] font-bold text-slate-500">g</span>
                      </div>
                      <div className="flex justify-center gap-1 mt-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...recipesForm];
                            updated[index].pulseGrams = Math.max(0, updated[index].pulseGrams - 5);
                            setRecipesForm(updated);
                          }}
                          className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-700 hover:bg-slate-100"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...recipesForm];
                            updated[index].pulseGrams = updated[index].pulseGrams + 5;
                            setRecipesForm(updated);
                          }}
                          className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-700 hover:bg-slate-100"
                        >
                          +5
                        </button>
                      </div>
                    </div>

                    {/* Rice Grams */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        तांदूळ प्रमाण:
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="250"
                          value={recipe.riceGrams}
                          onChange={(e) => {
                            const updated = [...recipesForm];
                            updated[index].riceGrams =
                              parseInt(e.target.value, 10) || 0;
                            setRecipesForm(updated);
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 text-center"
                        />
                        <span className="text-[11px] font-bold text-slate-500">g</span>
                      </div>
                      <div className="flex justify-center gap-1 mt-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...recipesForm];
                            updated[index].riceGrams = Math.max(0, updated[index].riceGrams - 25);
                            setRecipesForm(updated);
                          }}
                          className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-700 hover:bg-slate-100"
                        >
                          -25
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...recipesForm];
                            updated[index].riceGrams = updated[index].riceGrams + 25;
                            setRecipesForm(updated);
                          }}
                          className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-700 hover:bg-slate-100"
                        >
                          +25
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Supplementary Nutrition Config (पूरक आहार) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <span>साप्ताहिक पूरक आहार सेटिंग्ज (Supplementary Nutrition: Egg / Fruit / Chikki)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  शासकीय आदेशानुसार विद्यार्थ्यांना आठवड्यातून १ दिवस देण्यात येणारा पूरक आहार
                </p>
              </div>
              <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                config.menu.supplement
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="toggle-supplement"
                  checked={supplementConfig.enabled}
                  onChange={(e) =>
                    setSupplementConfig({ ...supplementConfig, enabled: e.target.checked })
                  }
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <label htmlFor="toggle-supplement" className="font-bold text-slate-800 cursor-pointer">
                  पूरक आहार योजना लागू आहे
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  पूरक आहार वार (Day of Week):
                </label>
                <select
                  disabled={!supplementConfig.enabled}
                  value={supplementConfig.dayOfWeek}
                  onChange={(e) =>
                    setSupplementConfig({
                      ...supplementConfig,
                      dayOfWeek: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="1">सोमवार (Monday)</option>
                  <option value="2">मंगळवार (Tuesday)</option>
                  <option value="3">बुधवार (Wednesday - शिफारस केलेले)</option>
                  <option value="4">गुरुवार (Thursday)</option>
                  <option value="5">शुक्रवार (Friday)</option>
                  <option value="6">शनिवार (Saturday)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  पूरक आहार घटक नाव:
                </label>
                <input
                  type="text"
                  disabled={!supplementConfig.enabled}
                  value={supplementConfig.nameMr}
                  onChange={(e) =>
                    setSupplementConfig({ ...supplementConfig, nameMr: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  प्रति विद्यार्थी अनुदान दर:
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    step="0.5"
                    disabled={!supplementConfig.enabled}
                    value={supplementConfig.rate}
                    onChange={(e) =>
                      setSupplementConfig({
                        ...supplementConfig,
                        rate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono disabled:opacity-50"
                  />
                  <span className="ml-2 font-bold text-slate-600 text-xs">₹</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RATES & COST STATES (साहित्य दर व स्टेट्स) */}
      {/* ========================================================================= */}
      {activeTab === 'rates' && (
        <div className="space-y-6">
          {/* Main Top Header & Action Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    config.rates & config.states
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2 mt-1">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                  <span>साहित्य प्रमाण व पाककला खर्च व्यवस्थापन (Ingredient Matrix & Cooking Norm)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  येथे निश्चित केलेल्या एका विद्यार्थ्याच्या मॅट्रिक्सनुसार (उदा. डाळी २०g, जिरे ०.१०g, तेल ५ml) एकूण शिधा मोजला जातो व पाककला खर्च प्रति विद्यार्थी स्थिर ₹२.३६ प्रमाणे मोजला जातो.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetDefaultRates}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>प्रमाणित दर रीसेट</span>
                </button>

                {onRecalculateEntries && (
                  <button
                    type="button"
                    onClick={() => setShowRecalcModal(true)}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                    <span>नोंदींचा खर्च पुन्हा मोजा</span>
                  </button>
                )}

                <button
                  id="save-rates-btn"
                  type="button"
                  onClick={handleSaveIngredients}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>नवीन दर जतन करा</span>
                </button>
              </div>
            </div>

            {/* Live Cost Simulator Strip */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <span>थेट खर्च सिम्युलेटर (Live Cost Simulator)</span>
                    <span className="text-[10px] bg-amber-200/70 text-amber-950 px-1.5 py-0.5 rounded font-mono">
                      Real-time
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/80">
                    खालील दर बदलताच विद्यार्थ्यांच्या दैनंदिन पाककला खर्चाचा थेट अंदाज पहा
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-amber-200 text-xs">
                  <span className="text-slate-600 font-medium">विद्यार्थी:</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={simStudents}
                    onChange={(e) => setSimStudents(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-14 font-mono font-bold text-slate-900 focus:outline-none border-b border-amber-400 text-center"
                  />
                </div>

                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-amber-200 text-xs">
                  <span className="text-slate-600 font-medium">मेन्यू:</span>
                  <select
                    value={simDishId}
                    onChange={(e) => setSimDishId(e.target.value)}
                    className="font-medium text-slate-900 focus:outline-none bg-transparent"
                  >
                    {recipesForm.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.dayNameMr} - {r.nameMr}
                      </option>
                    ))}
                  </select>
                </div>

                {simCalculation && (
                  <div className="bg-amber-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs">
                    <span>एकूण खर्च:</span>
                    <span className="font-mono text-sm text-amber-300">
                      {formatINR(simCalculation.totalCookingCost)}
                    </span>
                    <span className="text-[10px] text-amber-200 font-normal">
                      ({formatINR(simCalculation.totalCookingCost / simStudents)}/वि.)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Category Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {categoriesList.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                      selectedCategory === cat.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat.labelMr}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        selectedCategory === cat.id
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative shrink-0 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="साहित्य शोधा..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Rates Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-4 w-12 text-center">स्तंभ क्र.</th>
                    <th className="py-3 px-4">साहित्याचे नाव (मराठी / इंग्रजी)</th>
                    <th className="py-3 px-4">प्रवर्ग (Category)</th>
                    <th className="py-3 px-4 text-center">प्रति वि. ग्रॅम</th>
                    <th className="py-3 px-4 text-right w-44">बाजारभाव दर (₹ प्रति किलो/लिटर)</th>
                    <th className="py-3 px-4 text-center w-32">जलद बदल (Quick +/-)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIngredients.map((ing) => {
                    const colNum = officialColMap.get(ing.id);

                    return (
                      <tr
                        key={ing.id}
                        className="hover:bg-amber-50/30 transition-colors group"
                      >
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                          {colNum ? (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-semibold text-[11px]">
                              #{colNum}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {ing.nameMr}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {ing.nameEn}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {ing.category}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center border border-slate-200 rounded-lg bg-slate-50 px-2 py-1">
                            <input
                              type="number"
                              min="0"
                              max="500"
                              step="0.01"
                              value={ing.defaultGrams}
                              onChange={(e) =>
                                handleGramsChange(ing.id, parseFloat(e.target.value))
                              }
                              className="w-16 font-mono font-bold text-slate-900 text-center bg-transparent focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500 ml-1">
                              {ing.unit}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="font-bold text-slate-700">₹</span>
                            <input
                              type="number"
                              min="0"
                              max="2000"
                              step="1"
                              value={ing.ratePerKg}
                              onChange={(e) =>
                                handleRateChange(ing.id, parseFloat(e.target.value))
                              }
                              className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-right font-mono font-bold text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                            <span className="text-[11px] text-slate-500 ml-0.5">
                              /{ing.unit === 'ml' ? 'L' : 'kg'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAdjustRate(ing.id, -5)}
                              className="w-7 h-7 rounded bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 font-mono text-xs font-bold transition-colors cursor-pointer"
                              title="₹५ ने कमी करा"
                            >
                              -5
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustRate(ing.id, 5)}
                              className="w-7 h-7 rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 font-mono text-xs font-bold transition-colors cursor-pointer"
                              title="₹५ ने वाढवा"
                            >
                              +5
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CONFIG NODE & BACKUP (कॉन्फिग नोड व बॅकअप) */}
      {/* ========================================================================= */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Config Node Overview Cards */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-base">
                    कॉन्फिग नोड व डेटा स्टेट्स (Application Configuration Node)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  सर्व दर, शासकीय निकष (states), मेन्यू चक्र व सामान्य सेटिंग्ज साठवणारे अधिकृत कॉन्फिग मॉड्युल
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyConfigJSON}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
                >
                  {copiedConfig ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">कॉपी झाले!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Config JSON कॉपी करा</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => exportConfigAsJSON(activeConfig, generalForm.school.schoolName)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Config JSON डाऊनलोड करा</span>
                </button>
              </div>
            </div>

            {/* 4 Node Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pillar 1: Rates */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    config.rates
                  </span>
                  <DollarSign className="w-4 h-4 text-amber-700" />
                </div>
                <h5 className="font-bold text-sm text-slate-900">साहित्य दर नोड</h5>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• एकूण साहित्याचे दर: {ingredientsForm.length} वस्तू</li>
                  <li>• प्राथमिक norm: ₹{stateNormsForm.cookingCostNormPerStudent}</li>
                  <li>• उच्च प्राथमिक norm: ₹8.17</li>
                </ul>
              </div>

              {/* Pillar 2: Menu */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    config.menu
                  </span>
                  <Utensils className="w-4 h-4 text-emerald-700" />
                </div>
                <h5 className="font-bold text-sm text-slate-900">साप्ताहिक मेन्यू नोड</h5>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• चक्र कालावधी: {recipesForm.length} दिवस</li>
                  <li>• कडधान्य प्रकार: ६ डाळी/कडधान्ये</li>
                  <li>• पूरक आहार: {supplementConfig.enabled ? 'सक्षम' : 'अक्षम'}</li>
                </ul>
              </div>

              {/* Pillar 3: General */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                    config.general
                  </span>
                  <Settings className="w-4 h-4 text-blue-700" />
                </div>
                <h5 className="font-bold text-sm text-slate-900">सामान्य सेटिंग्ज नोड</h5>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• शैक्षणिक वर्ष: {generalForm.academicYear}</li>
                  <li>• मासिक सरासरी दिवस: {generalForm.workingDaysPerMonthDefault}</li>
                  <li>• UDISE: {generalForm.school.udiseNumber || 'नोंदवलेला नाही'}</li>
                </ul>
              </div>

              {/* Pillar 4: States */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                    config.states
                  </span>
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                </div>
                <h5 className="font-bold text-sm text-slate-900">राज्य निकष व स्टेट्स</h5>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• राज्य: {stateNormsForm.stateCode} (महाराष्ट्र)</li>
                  <li>• वर्गवारी: {stateNormsForm.category}</li>
                  <li>• विभाग: {stateNormsForm.division.split(' ')[0]}</li>
                </ul>
              </div>
            </div>

            {/* Interactive Live JSON Tree Viewer */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-slate-500" />
                  थेट कॉन्फिग नोड संरचना (Live Config JSON Tree):
                </span>
                <span className="text-[11px] font-mono text-slate-400">Read-only live representation</span>
              </div>
              <pre className="bg-slate-950 text-emerald-400 font-mono text-[11px] p-4 rounded-xl max-h-72 overflow-auto border border-slate-800 shadow-inner select-all">
                {JSON.stringify(appData.config || activeConfig, null, 2)}
              </pre>
            </div>
          </div>

          {/* Data Backup & Restore Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-700" />
                <span>डेटा बॅकअप, रिस्टोअर व नमुना डेटा (Persistence & Backup)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                शिक्षकांचा डेटा फोन/कॉम्प्युटरवर सुरक्षित ठेवण्यासाठी JSON बॅकअप फाईल डाउनलोड करा
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Export Full JSON */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-2">
                    <Download className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    संपूर्ण शाळा डेटा डाऊनलोड करा
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    सर्व दैनिक नोंदी, साठा, कॉन्फिग नोड आणि दर एका JSON फाईलमध्ये सेव्ह करा.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => exportDataAsJSON(appData)}
                  className="mt-4 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON फाईल डाऊनलोड करा</span>
                </button>
              </div>

              {/* 2. Import JSON */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold mb-2">
                    <Upload className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    बॅकअप फाईल रिस्टोअर करा
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    पूर्वी जतन केलेली JSON फाईल निवडून सर्व नोंदी व कॉन्फिग पुन्हा मिळवा.
                  </p>
                </div>
                <label className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>बॅकअप फाईल निवडा</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 3. Sample Seed Data */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-2">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    नमुना शाळा डेटा रीलोड करा
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    चाचणीसाठी महाराष्ट्र शासकीय प्राथमिक शाळेचा संपूर्ण नमुना डेटा व साहित्याचे दर भरा.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        'नमुना शाळा डेटा रीलोड करायचा आहे का? वर्तमान डेटा बदलला जाईल.'
                      )
                    ) {
                      const fresh = createDefaultSeedData();
                      onRestoreData(fresh);
                      setGeneralForm({
                        school: fresh.profile,
                        academicYear: '2026-2027',
                        workingDaysPerMonthDefault: 24,
                        language: 'dual',
                        showMarathiDigitsInReports: false,
                        officialRegisterTitle:
                          'शाळा स्तरावर ठेवायची दैनिक खर्च नोंदवही भाग-२ (धान्यादी मालाचे हिशोब)',
                        officialRegisterPageNumber: '४३',
                        tollFreeHelpline: '१८०० २३३ ९९८८',
                        autoCalculateCost: true,
                        autoSaveIntervalSeconds: 5,
                      });
                      setIngredientsForm(fresh.ingredients);
                      setRecipesForm(fresh.recipes);
                      triggerToast('नमुना डेटा व प्रमाणित मेन्यू यशस्वीरित्या लोड झाला!');
                    }
                  }}
                  className="mt-4 w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>नमुना डेटा लोड करा</span>
                </button>
              </div>
            </div>

          </div>

          {/* Danger Zone: User Data Deletion Card (2-Step Protected) */}
          <div className="bg-rose-50/50 border border-rose-200 rounded-2xl shadow-xs p-6 space-y-4">
            <div className="border-b border-rose-200/80 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-rose-950 text-base flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                  <span>
                    {language === 'en'
                      ? 'Danger Zone: Data Deletion & Reset'
                      : 'धोकादायक क्षेत्र: डेटा हटवणे व रीसेट (Danger Zone)'}
                  </span>
                </h3>
                <p className="text-xs text-rose-800/80 mt-0.5">
                  {language === 'en'
                    ? 'Permanently delete your recorded daily registers, stock records, or reset account data.'
                    : 'तुमचा दैनिक खर्च नोंदवही डेटा, आवक साठा कायमचा हटवा अथवा संपूर्ण डेटा पूर्ववत रीसेट करा.'}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-rose-200/70 border border-rose-300 text-rose-900 text-[10px] font-bold">
                {language === 'en' ? '2-Step Confirmation' : '२-टप्प्यांची पुष्टीकरण विचारणा'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Option A: Delete Register Entries & Stock Only */}
              <div className="border border-rose-200 rounded-xl p-4 bg-white flex flex-col justify-between shadow-xs">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold mb-2">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {language === 'en'
                      ? 'Clear Register Entries & Stock Data'
                      : 'नोंदवही व साठा डेटा हटवा'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'en'
                      ? 'Deletes all daily entries and stock inwards while keeping your school profile and custom rates intact.'
                      : 'शाळा माहिती व दर सुरक्षित ठेवून फक्त सर्व दैनिक नोंदी आणि धान्यादी मालाचा साठा पुसून टाका.'}
                  </p>
                  <div className="mt-2 text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-0.5">
                    <div>
                      {language === 'en' ? 'Daily Entries:' : 'दैनिक नोंदी:'}{' '}
                      <strong className="text-rose-700 font-bold">{Object.keys(appData.dailyEntries || {}).length}</strong>
                    </div>
                    <div>
                      {language === 'en' ? 'Stock Months:' : 'साठा महिने:'}{' '}
                      <strong className="text-rose-700 font-bold">{Object.keys(appData.stockInward || {}).length}</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenUserDeleteModal('register_only')}
                  className="mt-4 w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {language === 'en' ? 'Delete Register Data (Ask 2 Times)' : 'नोंदवही डेटा हटवा (२ विचारणा)'}
                  </span>
                </button>
              </div>

              {/* Option B: Reset All School Data */}
              <div className="border border-rose-300 rounded-xl p-4 bg-white flex flex-col justify-between shadow-xs">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold mb-2">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {language === 'en'
                      ? 'Reset & Delete All School Data'
                      : 'सर्व शाळा डेटा पूर्णपणे हटवा व रीसेट करा'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'en'
                      ? 'Completely wipes all recorded entries, stock, custom rates, recipes, and resets to clean initial blank register.'
                      : 'सर्व नोंदी, साठा, मेन्यू व बदललेले दर पुसून नोंदवही पूर्ववत कोरी (Blank) करा.'}
                  </p>
                  <div className="mt-2 text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    ⚠️ {language === 'en' ? 'Irreversible: Purges from cloud & browser.' : 'कायमचे: क्लाउड व स्थानिक ब्राउझरवरून नष्ट होईल.'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenUserDeleteModal('all_data')}
                  className="mt-4 w-full py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {language === 'en' ? 'Reset All Data (Ask 2 Times)' : 'सर्व डेटा नष्ट व रीसेट करा (२ विचारणा)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2-Step User Data Deletion Modal (Asks user 2 times) */}
      {deleteModalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-rose-200 text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Trash2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {deleteModalType === 'register_only'
                        ? (language === 'en' ? 'Delete Register Data' : 'नोंदवही डेटा हटवा')
                        : (language === 'en' ? 'Reset All School Data' : 'सर्व शाळा डेटा नष्ट व रीसेट करा')}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                      {deleteStep === 1
                        ? (language === 'en' ? 'Confirmation 1 of 2' : 'पुष्टीकरण १/२')
                        : (language === 'en' ? 'Confirmation 2 of 2' : 'पुष्टीकरण २/२')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {deleteStep === 1
                      ? (language === 'en' ? 'First Ask: Review data to be deleted' : 'पहिली विचारणा: हटवण्यात येणारा डेटा तपासा')
                      : (language === 'en' ? 'Second Ask: Final confirmation to erase data' : 'दुसरी विचारणा: डेटा कायमचा नष्ट करण्याचे अंतिम पुष्टीकरण')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalType(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* School Context */}
            <div className="my-3.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs flex justify-between items-center">
              <div>
                <strong className="text-slate-900 block">{appData.profile.schoolName}</strong>
                <span className="text-[11px] text-slate-500 font-mono">UDISE: {appData.profile.udiseNumber}</span>
              </div>
              <div className="text-right text-[11px]">
                <div className="font-bold text-rose-700">{Object.keys(appData.dailyEntries || {}).length} daily entries</div>
                <div className="text-slate-500">{Object.keys(appData.stockInward || {}).length} stock months</div>
              </div>
            </div>

            {/* STEP 1: First Confirmation Prompt */}
            {deleteStep === 1 && (
              <div className="space-y-3.5">
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-xs font-bold text-amber-900">
                      {language === 'en' ? 'First Confirmation:' : 'पहिले पुष्टीकरण (First Ask):'}
                    </strong>
                    <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                      {deleteModalType === 'register_only'
                        ? (language === 'en'
                            ? 'Are you sure you want to delete all daily entries and stock records? You will be asked once more before data is deleted.'
                            : 'तुम्हाला खात्री आहे का की तुम्ही सर्व दैनिक नोंदवही नोंदी व साठा तपशील हटवू इच्छिता? यानंतर आणखी एकदा अंतिम विचारणा केली जाईल.')
                        : (language === 'en'
                            ? 'Are you sure you want to reset all school data? All records, custom rates, and registers will be cleared. You will be asked once more before deletion.'
                            : 'तुम्हाला खात्री आहे का की तुम्ही सर्व शाळा डेटा नष्ट करून रीसेट करू इच्छिता? यानंतर अंतिम विचारणा केली जाईल.')}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-slate-600 text-[11px]">
                  <div className="font-bold text-slate-800">
                    {language === 'en' ? 'What will happen:' : 'या कृतीचे परिणाम:'}
                  </div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      {language === 'en'
                        ? `All ${Object.keys(appData.dailyEntries || {}).length} recorded daily entries will be removed.`
                        : `सर्व ${Object.keys(appData.dailyEntries || {}).length} दैनिक नोंदी पुसल्या जातील.`}
                    </li>
                    <li>
                      {language === 'en'
                        ? `All ${Object.keys(appData.stockInward || {}).length} monthly stock registers will be cleared.`
                        : `सर्व ${Object.keys(appData.stockInward || {}).length} महिन्यांचा आवक साठा रिकामा होईल.`}
                    </li>
                    <li>
                      {language === 'en'
                        ? 'Deletions will synchronize with your cloud account.'
                        : 'क्लाउड सिंकमधील नोंदी देखील तात्काळ पुसल्या जातील.'}
                    </li>
                  </ul>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleProceedUserDeleteStep2}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>{language === 'en' ? 'Proceed to Step 2 (Final Confirmation) →' : 'होय, पुढे जा (टप्पा २: अंतिम पुष्टीकरण) →'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteModalType(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    {language === 'en' ? 'Cancel' : 'रद्द करा'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Second & Final Confirmation */}
            {deleteStep === 2 && (
              <div className="space-y-3.5">
                <div className="p-3.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-950 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-xs font-bold text-rose-900">
                      {language === 'en' ? 'Second & Final Confirmation:' : 'दुसरे व अंतिम पुष्टीकरण (Final Ask):'}
                    </strong>
                    <p className="text-[11px] text-rose-800 mt-1 leading-relaxed">
                      {language === 'en'
                        ? 'This action CANNOT be undone. Once deleted, your data cannot be recovered unless you previously exported a JSON backup.'
                        : 'ही कृती मागे घेता येणार नाही! एकदा डेटा नष्ट केल्यास तो पुन्हा मिळवता येणार नाही (जोपर्यंत तुमच्याकडे JSON बॅकअप नसेल).'}
                    </p>
                  </div>
                </div>

                {deleteError && (
                  <div className="p-2.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold">
                    {deleteError}
                  </div>
                )}

                {/* Checkbox */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    id="ack-user-delete"
                    checked={deleteCheckbox}
                    onChange={(e) => setDeleteCheckbox(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <label htmlFor="ack-user-delete" className="text-[11px] text-slate-700 cursor-pointer leading-tight">
                    {language === 'en'
                      ? 'I understand that this will permanently erase my recorded data from this device and cloud.'
                      : 'होय, मला समजले आहे की यामुळे माझा नोंदवही डेटा या डिव्हाइसवरून व क्लाउडवरून कायमचा नष्ट होईल.'}
                  </label>
                </div>

                {/* Type DELETE */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    {language === 'en'
                      ? 'Type DELETE in capital letters to confirm:'
                      : 'पुष्टी करण्यासाठी मोठ्या अक्षरात DELETE टाईप करा:'}
                  </label>
                  <input
                    type="text"
                    placeholder="DELETE"
                    value={deleteConfirmText}
                    onChange={(e) => {
                      setDeleteConfirmText(e.target.value);
                      setDeleteError('');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 uppercase focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmUserDeletion}
                    disabled={!deleteCheckbox || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{language === 'en' ? 'Permanently Delete Data Now' : 'होय, डेटा कायमचा नष्ट करा'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteStep(1)}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    {language === 'en' ? 'Back' : 'मागे'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteModalType(null)}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    {language === 'en' ? 'Cancel' : 'रद्द करा'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recalculate Modal */}
      {showRecalcModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <h3 className="font-bold text-slate-900 text-base">
                जतन केलेल्या नोंदींचा खर्च पुन्हा मोजा
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              तुम्ही साहित्याचे दर बदलले असल्यास, जुन्या नोंदींवर नवीन दर लागू करण्यासाठी ही सुविधा वापरा.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                कोणत्या महिन्याच्या नोंदी अद्ययावत करायच्या आहेत?
              </label>
              <select
                value={recalcMonth}
                onChange={(e) => setRecalcMonth(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none"
              >
                <option value="current">चालू महिना (Current Month Only)</option>
                <option value="all">सर्व महिने व सर्व ऐतिहासिक नोंदी (All Recorded Days)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRecalcModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={handleRecalculateSavedEntries}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>पुन्हा मोजणी सुरू करा</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

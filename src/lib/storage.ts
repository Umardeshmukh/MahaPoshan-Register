import {
  AppData,
  DailyRegisterEntry,
  MonthlyStockInward,
  SchoolProfile,
  Ingredient,
  DishRecipe,
  LanguageMode,
  AppConfig,
  ExportMetadata,
  UserRole,
} from '../types';
import {
  DEFAULT_SCHOOL_PROFILE,
  DEFAULT_INGREDIENTS,
  DEFAULT_RECIPES,
} from './constants';
import { calculateDayConsumption, getDayInfo } from './mdm-calculator';
import { logStructuredEvent } from './observability';
import { recordStateTransitionAudit } from './subscription-store';

const STORAGE_KEY = 'pm_poshan_mdm_data_v1';
export const EXPORT_SCHEMA_VERSION = '2.0.0';
export const APP_RELEASE_VERSION = '2.4.0';

/**
 * StorageEngineAdapter prepares the local-first persistence layer for seamless
 * IndexedDB migration when multi-year school registers approach localStorage's 5MB quota,
 * without breaking synchronous reads required by the current UI.
 */
export interface StorageEngineAdapter {
  readonly backendName: 'localStorage' | 'indexedDB-hybrid';
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  getUsageBytes(): number;
  isNearQuotaLimit(): boolean;
}

class LocalStorageEngineAdapter implements StorageEngineAdapter {
  readonly backendName = 'localStorage' as const;
  private readonly QUOTA_WARN_BYTES = 3.5 * 1024 * 1024; // 3.5 MB warning threshold

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      logStructuredEvent({
        category: 'SYNC_FAILURE',
        level: 'error',
        message: `LocalStorage write failed for key ${key} (quota or storage error)`,
        context: { key, byteLength: value.length, error: String(err) },
      });
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  async getItemAsync(key: string): Promise<string | null> {
    return this.getItem(key);
  }

  async setItemAsync(key: string, value: string): Promise<void> {
    this.setItem(key, value);
  }

  getUsageBytes(): number {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          const v = localStorage.getItem(k) || '';
          total += (k.length + v.length) * 2;
        }
      }
      return total;
    } catch {
      return 0;
    }
  }

  isNearQuotaLimit(): boolean {
    return this.getUsageBytes() >= this.QUOTA_WARN_BYTES;
  }
}

export const storageEngine: StorageEngineAdapter = new LocalStorageEngineAdapter();

export function createDefaultAppConfig(
  profile: SchoolProfile = DEFAULT_SCHOOL_PROFILE,
  ingredients: Ingredient[] = DEFAULT_INGREDIENTS,
  recipes: DishRecipe[] = DEFAULT_RECIPES,
  language: LanguageMode = 'dual'
): AppConfig {
  const itemRates: Record<string, number> = {};
  ingredients.forEach((ing) => {
    itemRates[ing.id] = ing.ratePerKg;
  });

  return {
    version: 2,
    lastUpdated: new Date().toISOString(),
    rates: {
      itemRates,
      ingredients,
      primaryStudentCookingNorm: 5.45,
      upperPrimaryStudentCookingNorm: 8.17,
      selectedNorm: 'primary',
      lastUpdated: new Date().toISOString(),
    },
    menu: {
      weeklyRecipes: recipes,
      rotationCycleDays: 6,
      enableEggOrFruitSupplement: true,
      supplementDayOfWeek: 3, // Wednesday
      supplementNameMr: 'अंडे / केळी / चिक्की / राजगिरा लाडू',
      supplementRatePerServing: 5.0,
      defaultServingTime: '12:30 PM',
    },
    general: {
      school: profile,
      academicYear: '2026-2027',
      workingDaysPerMonthDefault: 24,
      language,
      showMarathiDigitsInReports: false,
      officialRegisterTitle: 'शाळा स्तरावर ठेवायची दैनिक खर्च नोंदवही भाग-२ (धान्यादी मालाचे हिशोब)',
      officialRegisterPageNumber: '४३',
      tollFreeHelpline: '१८०० २३३ ९९८८',
      autoCalculateCost: true,
      autoSaveIntervalSeconds: 5,
    },
    states: {
      stateCode: 'MH',
      stateName: 'महाराष्ट्र शासन (Maharashtra State)',
      category: 'primary',
      categoryNameMr: 'इयत्ता १ ली ते ५ वी (प्राथमिक)',
      cookingCostNormPerStudent: 5.45,
      riceGramNorm: 100,
      pulseGramNorm: 20,
      vegetableGramNorm: 50,
      oilGramNorm: 5,
      saltGramNorm: 2,
      condimentGramNorm: 4.5,
      district: profile.district || 'पुणे',
      division: 'पुणे विभाग (Pune)',
      academicYear: '2026-2027',
      lastRecalculatedAt: new Date().toISOString(),
      recalculationStatus: 'synced',
    },
  };
}

export function syncAppDataConfig(data: AppData): AppData {
  if (!data.config) {
    data.config = createDefaultAppConfig(
      data.profile,
      data.ingredients,
      data.recipes,
      data.language
    );
  } else {
    // Keep internal config nodes synchronized
    if (!data.config.rates) {
      data.config.rates = {
        itemRates: {},
        ingredients: data.ingredients || DEFAULT_INGREDIENTS,
        primaryStudentCookingNorm: 5.45,
        upperPrimaryStudentCookingNorm: 8.17,
        selectedNorm: 'primary',
        lastUpdated: new Date().toISOString(),
      };
    }
    if (!data.config.menu) {
      data.config.menu = {
        weeklyRecipes: data.recipes || DEFAULT_RECIPES,
        rotationCycleDays: 6,
        enableEggOrFruitSupplement: true,
        supplementDayOfWeek: 3,
        supplementNameMr: 'अंडे / केळी / चिक्की',
        supplementRatePerServing: 5.0,
        defaultServingTime: '12:30 PM',
      };
    }
    if (!data.config.general) {
      data.config.general = {
        school: data.profile || DEFAULT_SCHOOL_PROFILE,
        academicYear: '2026-2027',
        workingDaysPerMonthDefault: 24,
        language: data.language || 'dual',
        showMarathiDigitsInReports: false,
        officialRegisterTitle: 'शाळा स्तरावर ठेवायची दैनिक खर्च नोंदवही भाग-२ (धान्यादी मालाचे हिशोब)',
        officialRegisterPageNumber: '४३',
        tollFreeHelpline: '१८०० २३३ ९९८८',
        autoCalculateCost: true,
        autoSaveIntervalSeconds: 5,
      };
    }
    if (!data.config.states) {
      data.config.states = {
        stateCode: 'MH',
        stateName: 'महाराष्ट्र शासन (Maharashtra State)',
        category: 'primary',
        categoryNameMr: 'इयत्ता १ ली ते ५ वी (प्राथमिक)',
        cookingCostNormPerStudent: 5.45,
        riceGramNorm: 100,
        pulseGramNorm: 20,
        vegetableGramNorm: 50,
        oilGramNorm: 5,
        saltGramNorm: 2,
        condimentGramNorm: 4.5,
        district: data.profile?.district || 'पुणे',
        division: 'पुणे विभाग (Pune)',
        academicYear: '2026-2027',
        lastRecalculatedAt: new Date().toISOString(),
        recalculationStatus: 'synced',
      };
    }

    // Mirror to top-level fields
    data.profile = data.config.general.school || data.profile;
    data.ingredients = data.config.rates.ingredients || data.ingredients;
    data.recipes = data.config.menu.weeklyRecipes || data.recipes;
    data.language = data.config.general.language || data.language;
  }

  return data;
}

export function getInitialData(): AppData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: AppData = JSON.parse(saved);
      if (parsed && (parsed.profile || parsed.config)) {
        // Detect legacy demo seed data (Borgaon Budruk / 27251403201 / sample 12 entries) and purge it
        const isLegacyDemo =
          parsed.profile?.udiseNumber === '27251403201' ||
          (parsed.profile?.schoolName && parsed.profile.schoolName.includes('बोरगाव')) ||
          (parsed.dailyEntries && Object.keys(parsed.dailyEntries).length === 12 && !!parsed.dailyEntries['2026-09-01']);

        if (isLegacyDemo) {
          localStorage.removeItem(STORAGE_KEY);
          return createEmptyCleanAppData();
        }

        // Merge and update ingredients to conform to official matrix norms
        const sourceIngredients = parsed.config?.rates?.ingredients || parsed.ingredients;
        if (sourceIngredients) {
          parsed.ingredients = DEFAULT_INGREDIENTS.map((def) => {
            const existing = sourceIngredients.find((i: Ingredient) => i.id === def.id);
            return {
              ...def,
              defaultGrams: def.defaultGrams,
              unit: def.unit,
              ratePerKg: 0,
              ...(existing ? { nameMr: existing.nameMr || def.nameMr } : {}),
            };
          });
        } else {
          parsed.ingredients = DEFAULT_INGREDIENTS;
        }
        if (parsed.config?.rates) {
          parsed.config.rates.ingredients = parsed.ingredients;
        }

        // Automatically migrate to the official recipes if using legacy 6-recipe format,
        // and append any newly added default dishes (e.g. moong_khichdi) while preserving custom ones.
        const sourceRecipes = parsed.config?.menu?.weeklyRecipes || parsed.recipes;
        const hasLegacyRecipes =
          !sourceRecipes ||
          sourceRecipes.length < 11 ||
          sourceRecipes.some((r: DishRecipe) =>
            ['mon_masoor', 'tue_moong', 'wed_tur', 'thu_matki', 'fri_chavli', 'sat_soya'].includes(r.id)
          ) ||
          !sourceRecipes.some((r: DishRecipe) => r.id === 'veg_pulao');

        if (hasLegacyRecipes) {
          parsed.recipes = DEFAULT_RECIPES;
        } else {
          const updatedRecipes = sourceRecipes.map((r: DishRecipe) => {
            const defRecipe = DEFAULT_RECIPES.find((d) => d.id === r.id);
            if (defRecipe) {
              return {
                ...r,
                pulseGrams: defRecipe.pulseGrams,
                riceGrams: defRecipe.riceGrams,
                nameMr: defRecipe.nameMr,
                nameEn: defRecipe.nameEn,
                pulseIngredientId: defRecipe.pulseIngredientId,
                customCondiments: defRecipe.customCondiments || r.customCondiments,
              };
            }
            return r;
          });
          const existingIds = new Set(updatedRecipes.map((r: DishRecipe) => r.id));
          for (const defRecipe of DEFAULT_RECIPES) {
            if (!existingIds.has(defRecipe.id)) {
              updatedRecipes.push(defRecipe);
            }
          }
          parsed.recipes = updatedRecipes;
        }
        if (parsed.config?.menu) {
          parsed.config.menu.weeklyRecipes = parsed.recipes;
        }
        return syncAppDataConfig(parsed);
      }
    }
  } catch (err) {
    console.error('Failed to read from localStorage:', err);
  }

  return createEmptyCleanAppData();
}

export function saveAppData(data: AppData): void {
  try {
    const synced = syncAppDataConfig(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

/**

 * Creates rich, realistic sample data for Maharashtra Primary School (1st to 5th)
 * with all ingredient rates and menu recipes fully populated.
 */
export function createDefaultSeedData(): AppData {
  const currentMonth = '2026-09';
  const initialStock: MonthlyStockInward = {
    rice: { openingStockKg: 120, receivedStockKg: 200 },
    masoor_dal: { openingStockKg: 15, receivedStockKg: 25 },
    moong_dal: { openingStockKg: 18, receivedStockKg: 25 },
    tur_dal: { openingStockKg: 20, receivedStockKg: 30 },
    matki: { openingStockKg: 12, receivedStockKg: 20 },
    chavli: { openingStockKg: 14, receivedStockKg: 20 },
    soya_vadi: { openingStockKg: 10, receivedStockKg: 15 },
    cumin: { openingStockKg: 200, receivedStockKg: 300 },
    mustard: { openingStockKg: 200, receivedStockKg: 300 },
    turmeric: { openingStockKg: 250, receivedStockKg: 250 },
    chili_masala: { openingStockKg: 500, receivedStockKg: 1000 },
    oil: { openingStockKg: 15, receivedStockKg: 20 },
    salt: { openingStockKg: 1000, receivedStockKg: 2000 },
    vegetables: { openingStockKg: 25, receivedStockKg: 80 },
    green_peas: { openingStockKg: 10, receivedStockKg: 25 },
  };

  const sampleEntries: Record<string, DailyRegisterEntry> = {};

  // Seed sample school days for 2026-09-01 through 2026-09-14
  const sampleDays = [
    { date: '2026-09-01', students: 68 }, // Tue - Moong
    { date: '2026-09-02', students: 72 }, // Wed - Tur
    { date: '2026-09-03', students: 70 }, // Thu - Matki
    { date: '2026-09-04', students: 74 }, // Fri - Chavli
    { date: '2026-09-05', students: 65 }, // Sat - Soya
    // 06 is Sun
    { date: '2026-09-07', students: 71 }, // Mon - Masoor
    { date: '2026-09-08', students: 75 }, // Tue - Moong
    { date: '2026-09-09', students: 69 }, // Wed - Tur
    { date: '2026-09-10', students: 73 }, // Thu - Matki
    { date: '2026-09-11', students: 70 }, // Fri - Chavli
    { date: '2026-09-12', students: 64 }, // Sat - Soya
    // 13 is Sun
    { date: '2026-09-14', students: 72 }, // Mon - Masoor
  ];

  sampleDays.forEach((item) => {
    const dayInfo = getDayInfo(item.date);
    const recipe =
      DEFAULT_RECIPES.find((r) => r.dayOfWeek === dayInfo.dayOfWeek) ||
      DEFAULT_RECIPES[0];

    const calc = calculateDayConsumption(item.students, recipe, DEFAULT_INGREDIENTS);

    const itemsMap: DailyRegisterEntry['items'] = {};
    calc.items.forEach((it) => {
      itemsMap[it.ingredientId] = {
        grams: it.totalGrams,
        kg: it.totalKg,
        rate: it.ratePerKg,
        cost: it.cost,
      };
    });

    sampleEntries[item.date] = {
      id: item.date,
      date: item.date,
      dayOfWeek: dayInfo.dayOfWeek,
      dayNameMr: dayInfo.dayNameMr,
      dayNameEn: dayInfo.dayNameEn,
      dishId: recipe.id,
      dishNameMr: recipe.nameMr,
      dishNameEn: recipe.nameEn,
      studentCount: item.students,
      items: itemsMap,
      totalGrainsPulsesKg: calc.totalGrainsPulsesKg,
      totalVegetablesKg: calc.totalVegetablesKg,
      totalCookingCost: calc.totalCookingCost,
      remarks: 'नियमित उपस्थिती व ताजे अन्न वाटप',
      savedAt: new Date(item.date + 'T14:30:00').toISOString(),
    };
  });

  const appConfig = createDefaultAppConfig(
    DEFAULT_SCHOOL_PROFILE,
    DEFAULT_INGREDIENTS,
    DEFAULT_RECIPES,
    'dual'
  );

  const appData: AppData = {
    config: appConfig,
    profile: DEFAULT_SCHOOL_PROFILE,
    ingredients: DEFAULT_INGREDIENTS,
    recipes: DEFAULT_RECIPES,
    dailyEntries: sampleEntries,
    stockInward: {
      [currentMonth]: initialStock,
    },
    language: 'dual',
  };

  saveAppData(appData);
  return appData;
}

export const createDefaultCleanData = createEmptyCleanAppData;

/**
 * Creates completely blank, fresh AppData with zero daily entries and empty stock,
 * preserving school profile if provided.
 */
export function createEmptyCleanAppData(profile: SchoolProfile = DEFAULT_SCHOOL_PROFILE): AppData {
  const appConfig = createDefaultAppConfig(profile, DEFAULT_INGREDIENTS, DEFAULT_RECIPES, 'dual');
  const cleanData: AppData = {
    config: appConfig,
    profile,
    ingredients: DEFAULT_INGREDIENTS,
    recipes: DEFAULT_RECIPES,
    dailyEntries: {},
    stockInward: {},
    language: 'dual',
  };
  saveAppData(cleanData);
  return cleanData;
}

/**
 * Clears all recorded daily entries and monthly stock inward, keeping school profile and recipe configs intact.
 */
export function clearRegisterEntries(data: AppData): AppData {
  const updated: AppData = {
    ...data,
    dailyEntries: {},
    stockInward: {},
  };
  saveAppData(updated);
  return updated;
}



export interface ExportOptions {
  userId?: string;
  userRole?: UserRole;
  requestedSchoolId?: string;
  requestedUdise?: string;
}

/**
 * Validates tenant isolation, strips any foreign school records, attaches schema/version metadata,
 * and records an immutable audit log for the school data export.
 */
export function prepareValidatedExportPayload(
  data: AppData,
  options?: ExportOptions
): { success: boolean; payload?: AppData; error?: string } {
  try {
    const synced = syncAppDataConfig(data);
    const ownSchoolId = synced.profile?.id || '';
    const ownUdise = (synced.profile?.udiseNumber || '').trim();
    const effectiveRole: UserRole = options?.userRole || synced.profile?.role || 'SCHOOL_ADMIN';
    const effectiveUserId = options?.userId || 'local_school_admin';

    // Enforce strict tenant boundary: SCHOOL_ADMIN and TEACHER can ONLY export their own school
    if (effectiveRole !== 'SUPER_ADMIN') {
      if (
        options?.requestedSchoolId &&
        options.requestedSchoolId !== ownSchoolId &&
        options.requestedSchoolId !== ownUdise
      ) {
        const errMsg = 'Security Violation: SCHOOL_ADMIN can only export their own school data';
        logStructuredEvent({
          category: 'EXPORT_FAILURE',
          level: 'error',
          message: errMsg,
          userId: effectiveUserId,
          schoolId: ownSchoolId || ownUdise,
          context: {
            effectiveRole,
            ownSchoolId,
            ownUdise,
            requestedSchoolId: options.requestedSchoolId,
          },
        });
        return { success: false, error: errMsg };
      }

      if (options?.requestedUdise && options.requestedUdise.trim() !== ownUdise) {
        const errMsg = 'Security Violation: Cross-school export by UDISE is strictly prohibited';
        logStructuredEvent({
          category: 'EXPORT_FAILURE',
          level: 'error',
          message: errMsg,
          userId: effectiveUserId,
          schoolId: ownSchoolId || ownUdise,
          context: {
            effectiveRole,
            ownUdise,
            requestedUdise: options.requestedUdise,
          },
        });
        return { success: false, error: errMsg };
      }
    }

    // Filter dailyEntries so no foreign school's records can ever be included in the export
    const filteredDailyEntries: Record<string, DailyRegisterEntry> = {};
    let strippedCount = 0;

    for (const [dateKey, entry] of Object.entries(synced.dailyEntries || {})) {
      const entrySchoolId = entry.schoolId;
      const belongsToOwnSchool =
        !entrySchoolId ||
        entrySchoolId === ownSchoolId ||
        entrySchoolId === ownUdise;

      if (belongsToOwnSchool) {
        filteredDailyEntries[dateKey] = entry;
      } else {
        strippedCount++;
      }
    }

    if (strippedCount > 0) {
      logStructuredEvent({
        category: 'SECURITY_VIOLATION',
        level: 'warn',
        message: `Stripped ${strippedCount} foreign school daily entries during export`,
        userId: effectiveUserId,
        schoolId: ownSchoolId || ownUdise,
        context: { strippedCount },
      });
    }

    const exportMetadata: ExportMetadata = {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      appVersion: APP_RELEASE_VERSION,
      exportedAt: new Date().toISOString(),
      schoolId: ownSchoolId || ownUdise || 'local_school',
      udiseNumber: ownUdise,
      schoolName: synced.profile?.schoolName || '',
      exportedByUserId: effectiveUserId,
      exportedByRole: effectiveRole,
      recordCounts: {
        dailyEntries: Object.keys(filteredDailyEntries).length,
        stockMonths: Object.keys(synced.stockInward || {}).length,
      },
    };

    const payload: AppData = {
      ...synced,
      dailyEntries: filteredDailyEntries,
      exportMetadata,
    };

    // Audit the export
    recordStateTransitionAudit({
      requestId: `export_${ownUdise || 'school'}_${Date.now()}`,
      schoolId: exportMetadata.schoolId,
      userId: effectiveUserId,
      adminId: effectiveUserId,
      previousStatus: 'DATA_ACTIVE',
      newStatus: 'DATA_EXPORTED',
      reason: `School data exported (schema v${EXPORT_SCHEMA_VERSION}, ${exportMetadata.recordCounts.dailyEntries} daily entries)`,
      timestamp: exportMetadata.exportedAt,
    });

    logStructuredEvent({
      category: 'EXPORT_AUDIT',
      level: 'info',
      message: `Audited school data export completed for UDISE ${ownUdise || 'N/A'}`,
      userId: effectiveUserId,
      schoolId: exportMetadata.schoolId,
      context: {
        schemaVersion: exportMetadata.schemaVersion,
        appVersion: exportMetadata.appVersion,
        exportedByRole: effectiveRole,
        recordCounts: exportMetadata.recordCounts,
      },
    });

    return { success: true, payload };
  } catch (err) {
    logStructuredEvent({
      category: 'EXPORT_FAILURE',
      level: 'error',
      message: 'Failed preparing school data export',
      context: { error: String(err) },
    });
    return { success: false, error: String(err) };
  }
}

export function exportDataAsJSON(
  data: AppData,
  options?: ExportOptions
): { success: boolean; payload?: AppData; error?: string } {
  const result = prepareValidatedExportPayload(data, options);
  if (!result.success || !result.payload) {
    return result;
  }

  if (typeof document !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
    const jsonStr = JSON.stringify(result.payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PM_POSHAN_MDM_Data_${result.payload.profile.udiseNumber || 'school'}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return result;
}

export function exportConfigAsJSON(config: AppConfig, schoolName?: string): void {
  if (typeof document === 'undefined') return;
  const jsonStr = JSON.stringify(config, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PM_POSHAN_Config_Node_${(schoolName || 'school').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

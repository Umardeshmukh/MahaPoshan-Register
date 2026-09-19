import {
  Ingredient,
  DishRecipe,
  DailyCalculationResult,
  ItemConsumption,
  DailyRegisterEntry,
  MonthlyStockInward,
  MonthSummary,
} from '../types';
import { MARATHI_DAYS, ENGLISH_DAYS, MARATHI_MONTHS, ENGLISH_MONTHS } from './constants';

/**
 * Pure calculation function for daily consumption based on student count, chosen dish recipe, and ingredient rates.
 */
export function calculateDayConsumption(
  students: number,
  recipe: DishRecipe,
  allIngredients: Ingredient[]
): DailyCalculationResult {
  const validStudents = Math.max(0, Number(students) || 0);
  const items: ItemConsumption[] = [];

  let totalGrainsPulsesKg = 0;
  let totalVegetablesKg = 0;
  let totalCookingCost = 0;

  // 1. If rice is included in recipe
  if (recipe.includesRice) {
    const riceIngredient = allIngredients.find((ing) => ing.id === 'rice');
    if (riceIngredient) {
      const gramsPerStudent = recipe.riceGrams || riceIngredient.defaultGrams;
      const totalGrams = validStudents * gramsPerStudent;
      const totalKg = Number((totalGrams / 1000).toFixed(4));
      const rate = riceIngredient.ratePerKg || 0;
      const cost = Number((totalKg * rate).toFixed(2));

      totalGrainsPulsesKg += totalKg;
      totalCookingCost += cost;

      items.push({
        ingredientId: riceIngredient.id,
        nameMr: riceIngredient.nameMr,
        nameEn: riceIngredient.nameEn,
        category: 'grain',
        gramsPerStudent,
        totalGrams,
        totalKg,
        ratePerKg: rate,
        cost,
      });
    }
  }

  // 2. Pulse / Main legume for the day
  const pulseIngredient = allIngredients.find(
    (ing) => ing.id === recipe.pulseIngredientId
  );
  if (pulseIngredient) {
    const gramsPerStudent = recipe.pulseGrams || pulseIngredient.defaultGrams;
    const totalGrams = validStudents * gramsPerStudent;
    const totalKg = Number((totalGrams / 1000).toFixed(4));
    const rate = pulseIngredient.ratePerKg || 0;
    const cost = Number((totalKg * rate).toFixed(2));

    totalGrainsPulsesKg += totalKg;
    totalCookingCost += cost;

    items.push({
      ingredientId: pulseIngredient.id,
      nameMr: pulseIngredient.nameMr,
      nameEn: pulseIngredient.nameEn,
      category: 'pulse',
      gramsPerStudent,
      totalGrams,
      totalKg,
      ratePerKg: rate,
      cost,
    });
  }

  // 3. Daily Fixed Condiments and Vegetables
  const fixedIngredients = allIngredients.filter(
    (ing) => ing.isFixedDaily && ing.id !== 'rice'
  );

  for (const ing of fixedIngredients) {
    // Check if recipe has a custom override for this ingredient
    const gramsPerStudent = recipe.customCondiments?.[ing.id] ?? ing.defaultGrams;
    const totalGrams = validStudents * gramsPerStudent;
    const totalKg = Number((totalGrams / 1000).toFixed(4));
    const rate = ing.ratePerKg || 0;
    const cost = Number((totalKg * rate).toFixed(2));

    if (ing.category === 'vegetable') {
      totalVegetablesKg += totalKg;
    }
    totalCookingCost += cost;

    items.push({
      ingredientId: ing.id,
      nameMr: ing.nameMr,
      nameEn: ing.nameEn,
      category: ing.category,
      gramsPerStudent,
      totalGrams,
      totalKg,
      ratePerKg: rate,
      cost,
    });
  }

  return {
    studentCount: validStudents,
    dishId: recipe.id,
    dishNameMr: recipe.nameMr,
    dishNameEn: recipe.nameEn,
    items,
    totalGrainsPulsesKg: Number(totalGrainsPulsesKg.toFixed(3)),
    totalVegetablesKg: Number(totalVegetablesKg.toFixed(3)),
    totalCookingCost: Number(totalCookingCost.toFixed(2)),
  };
}

/**
 * Calculates monthly summary and closing balance matrix
 */
export function calculateMonthSummary(
  monthKey: string, // YYYY-MM
  entries: DailyRegisterEntry[],
  stockInward: MonthlyStockInward,
  ingredients: Ingredient[]
): MonthSummary {
  // Filter entries that belong to this month
  const monthEntries = entries.filter(
    (e) => e.date.startsWith(monthKey) && !e.isHoliday && e.studentCount > 0
  );

  let totalWorkingDays = monthEntries.length;
  let totalBeneficiaries = 0;
  let totalCost = 0;
  let totalGrainsPulsesKg = 0;
  let totalVegetablesKg = 0;

  const itemConsumptions: MonthSummary['itemConsumptions'] = {};

  // Initialize for all ingredients
  ingredients.forEach((ing) => {
    const inward = stockInward[ing.id] || { openingStockKg: 0, receivedStockKg: 0 };
    const openingStockKg = Number(inward.openingStockKg || 0);
    const receivedStockKg = Number(inward.receivedStockKg || 0);
    const totalAvailableKg = Number((openingStockKg + receivedStockKg).toFixed(4));

    itemConsumptions[ing.id] = {
      totalKg: 0,
      totalCost: 0,
      openingStockKg,
      receivedStockKg,
      totalAvailableKg,
      closingBalanceKg: totalAvailableKg,
    };
  });

  // Aggregate monthly consumption
  monthEntries.forEach((entry) => {
    totalBeneficiaries += entry.studentCount;
    totalCost += entry.totalCookingCost;
    totalGrainsPulsesKg += entry.totalGrainsPulsesKg;
    totalVegetablesKg += entry.totalVegetablesKg;

    Object.entries(entry.items || {}).forEach(([ingId, data]) => {
      if (itemConsumptions[ingId]) {
        itemConsumptions[ingId].totalKg = Number(
          (itemConsumptions[ingId].totalKg + data.kg).toFixed(4)
        );
        itemConsumptions[ingId].totalCost = Number(
          (itemConsumptions[ingId].totalCost + data.cost).toFixed(2)
        );
      }
    });
  });

  // Calculate closing balance
  Object.keys(itemConsumptions).forEach((ingId) => {
    const item = itemConsumptions[ingId];
    item.closingBalanceKg = Number(
      (item.totalAvailableKg - item.totalKg).toFixed(4)
    );
  });

  return {
    monthKey,
    totalWorkingDays,
    totalBeneficiaries,
    totalCost: Number(totalCost.toFixed(2)),
    totalGrainsPulsesKg: Number(totalGrainsPulsesKg.toFixed(3)),
    totalVegetablesKg: Number(totalVegetablesKg.toFixed(3)),
    itemConsumptions,
  };
}

/**
 * Format currency in Indian Rupees format (e.g. ₹ 1,234.50)
 */
export function formatINR(amount: number): string {
  const rounded = Number(amount || 0).toFixed(2);
  const parts = rounded.split('.');
  const intPart = parts[0];
  const decPart = parts[1];

  // Indian number grouping: 3 digits from right, then groups of 2
  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt =
    otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  return `₹${formattedInt}.${decPart}`;
}

/**
 * Convert Date string YYYY-MM-DD to Day of Week Info
 */
export function getDayInfo(dateStr: string): {
  dayOfWeek: number;
  dayNameMr: string;
  dayNameEn: string;
} {
  const d = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday ...
  return {
    dayOfWeek,
    dayNameMr: MARATHI_DAYS[dayOfWeek] || '',
    dayNameEn: ENGLISH_DAYS[dayOfWeek] || '',
  };
}

/**
 * Format Date to standard Indian format DD/MM/YYYY
 */
export function formatDateIndian(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Get Month Name in Marathi and English from YYYY-MM
 */
export function getMonthNames(monthKey: string): { mr: string; en: string; year: string } {
  const [year, monthStr] = monthKey.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  return {
    mr: MARATHI_MONTHS[monthIdx] || '',
    en: ENGLISH_MONTHS[monthIdx] || '',
    year: year || '',
  };
}

/**
 * Convert numbers to Marathi (Devanagari) digits: 0-9 -> ०-९
 */
export function toMarathiDigits(num: number | string): string {
  const marathiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return String(num).replace(/[0-9]/g, (w) => marathiDigits[+w]);
}

/**
 * Recalculates cooking costs of saved daily entries based on the updated ingredient rates set in Admin.
 * Can recalculate for a specific month (YYYY-MM) or all recorded entries.
 */
export function recalculateEntriesCost(
  entries: Record<string, DailyRegisterEntry>,
  ingredients: Ingredient[],
  targetMonth?: string
): {
  updatedEntries: Record<string, DailyRegisterEntry>;
  recalculatedCount: number;
} {
  const ingredientMap = new Map<string, Ingredient>();
  ingredients.forEach((ing) => ingredientMap.set(ing.id, ing));

  const nextEntries: Record<string, DailyRegisterEntry> = {};
  let recalculatedCount = 0;

  for (const [dateKey, entry] of Object.entries(entries)) {
    // If targetMonth is specified, only recalculate entries belonging to that month
    if (targetMonth && !dateKey.startsWith(targetMonth)) {
      nextEntries[dateKey] = entry;
      continue;
    }

    // Skip holidays or entries with zero students
    if (entry.isHoliday || entry.studentCount <= 0) {
      nextEntries[dateKey] = entry;
      continue;
    }

    const updatedItems = { ...entry.items };
    let totalCookingCost = 0;

    for (const [itemId, itemData] of Object.entries(updatedItems)) {
      const currentIng = ingredientMap.get(itemId);
      const rate = currentIng !== undefined ? currentIng.ratePerKg : itemData.rate;
      const cost = Number((itemData.kg * rate).toFixed(2));

      updatedItems[itemId] = {
        ...itemData,
        rate,
        cost,
      };
      totalCookingCost += cost;
    }

    nextEntries[dateKey] = {
      ...entry,
      items: updatedItems,
      totalCookingCost: Number(totalCookingCost.toFixed(2)),
    };
    recalculatedCount++;
  }

  return {
    updatedEntries: nextEntries,
    recalculatedCount,
  };
}


import { Ingredient, DishRecipe, SchoolProfile } from '../types';

export const CONSTANT_COOKING_COST_PER_STUDENT = 2.36; // Constant rate of ₹2.36 per student

export const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  schoolName: '',
  udiseNumber: '',
  centerCluster: '',
  standardCategory: 'इयत्ता १ ली ते ५ वी (प्राथमिक)',
  district: '',
  taluka: '',
  headmasterName: '',
  inchargeTeacher: '',
  cookName: '',
  totalStudents: 70,
};

export const DEFAULT_INGREDIENTS: Ingredient[] = [
  // Rice
  {
    id: 'rice',
    nameMr: 'तांदूळ',
    nameEn: 'Rice',
    category: 'grain',
    defaultGrams: 100,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: true,
  },
  // Main Pulses / Legumes for the 6-day rotation
  {
    id: 'masoor_dal',
    nameMr: 'मसूरडाळ',
    nameEn: 'Masoor Dal',
    category: 'pulse',
    defaultGrams: 20,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: false,
  },
  {
    id: 'moong_dal',
    nameMr: 'मूगडाळ',
    nameEn: 'Moong Dal',
    category: 'pulse',
    defaultGrams: 20,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: false,
  },
  {
    id: 'tur_dal',
    nameMr: 'तूरडाळ',
    nameEn: 'Tur Dal',
    category: 'pulse',
    defaultGrams: 20,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: false,
  },
  {
    id: 'matki',
    nameMr: 'मटकी',
    nameEn: 'Matki (Moth Beans)',
    category: 'pulse',
    defaultGrams: 20,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: false,
  },
  {
    id: 'chavli',
    nameMr: 'चवळी',
    nameEn: 'Chavli (Black-eyed Peas)',
    category: 'pulse',
    defaultGrams: 20,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: false,
  },
  {
    id: 'soya_vadi',
    nameMr: 'सोया वडी',
    nameEn: 'Soya Vadi (Soy Chunks)',
    category: 'pulse',
    defaultGrams: 20,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: false,
  },
  // Daily Fixed Condiments
  {
    id: 'cumin',
    nameMr: 'जिरे',
    nameEn: 'Cumin (Jeera)',
    category: 'condiment',
    defaultGrams: 0.1,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: true,
  },
  {
    id: 'mustard',
    nameMr: 'मोहरी',
    nameEn: 'Mustard Seeds (Mohri)',
    category: 'condiment',
    defaultGrams: 0.1,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: true,
  },
  {
    id: 'turmeric',
    nameMr: 'हळद',
    nameEn: 'Turmeric (Haldi)',
    category: 'condiment',
    defaultGrams: 0.15,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: true,
  },
  {
    id: 'chili_masala',
    nameMr: 'तिखट/मसाला',
    nameEn: 'Chili/Garam Masala',
    category: 'condiment',
    defaultGrams: 2,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: true,
  },
  {
    id: 'oil',
    nameMr: 'सोयाबीन तेल',
    nameEn: 'Soybean Oil (Soya tel)',
    category: 'oil',
    defaultGrams: 5,
    ratePerKg: 0,
    unit: 'ml',
    isFixedDaily: true,
  },
  {
    id: 'salt',
    nameMr: 'मीठ',
    nameEn: 'Salt (Meeth)',
    category: 'condiment',
    defaultGrams: 1.3,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: true,
  },
  {
    id: 'vegetables',
    nameMr: 'भाजीपाला',
    nameEn: 'Fresh Vegetables',
    category: 'vegetable',
    defaultGrams: 50,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: true,
  },
  {
    id: 'green_peas',
    nameMr: 'वाटाणा',
    nameEn: 'Green Peas (Watana)',
    category: 'vegetable',
    defaultGrams: 20,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: false,
  },
  {
    id: 'moong',
    nameMr: 'मूग',
    nameEn: 'Moong (Whole)',
    category: 'pulse',
    defaultGrams: 20,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: false,
  },
  {
    id: 'harbhara',
    nameMr: 'हरभरा',
    nameEn: 'Harbhara / Chana',
    category: 'pulse',
    defaultGrams: 20,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: false,
  },
  {
    id: 'purak_aahar',
    nameMr: 'पूरक आहार (अंडे/केळी)',
    nameEn: 'Purak Aahar (Egg/Banana)',
    category: 'supplementary',
    defaultGrams: 1,
    ratePerKg: 0,
    unit: 'nag',
    isFixedDaily: false,
  },
  {
    id: 'gul_sakhar',
    nameMr: 'गूळ / साखर',
    nameEn: 'Gud Sakhar (Jaggery/Sugar)',
    category: 'condiment',
    defaultGrams: 30,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: false,
  },
  {
    id: 'milk_powder',
    nameMr: 'दूध / दूध पावडर',
    nameEn: 'Milk / Milk Powder',
    category: 'supplementary',
    defaultGrams: 0,
    ratePerKg: 0,
    unit: 'gm',
    isFixedDaily: false,
  },
];

/**
 * The 19 material columns (columns 5 to 23) in Maharashtra MDM Official Register Part 2
 * "शाळा स्तरावर ठेवण्याची दैनिक खर्च नोंदवही भाग-२ (धान्यादी मालाचे हिशोब)"
 */
export const OFFICIAL_REGISTER_COLUMNS = [
  { colNum: 5, id: 'moong_dal', nameMr: 'मूगडाळ', nameEn: 'Moong Dal' },
  { colNum: 6, id: 'tur_dal', nameMr: 'तूरडाळ', nameEn: 'Tur Dal' },
  { colNum: 7, id: 'masoor_dal', nameMr: 'मसूरडाळ', nameEn: 'Masoor Dal' },
  { colNum: 8, id: 'matki', nameMr: 'मटकी', nameEn: 'Matki' },
  { colNum: 9, id: 'moong', nameMr: 'मूग', nameEn: 'Moong Whole' },
  { colNum: 10, id: 'chavli', nameMr: 'चवळी', nameEn: 'Chavli' },
  { colNum: 11, id: 'harbhara', nameMr: 'हरभरा', nameEn: 'Harbhara / Chana' },
  { colNum: 12, id: 'green_peas', nameMr: 'वाटाणा', nameEn: 'Peas / Vatana' },
  { colNum: 13, id: 'cumin', nameMr: 'जिरे', nameEn: 'Cumin' },
  { colNum: 14, id: 'mustard', nameMr: 'मोहरी', nameEn: 'Mustard' },
  { colNum: 15, id: 'turmeric', nameMr: 'हळद', nameEn: 'Turmeric' },
  { colNum: 16, id: 'chili_masala', nameMr: 'मिरची पावडर / मसाला', nameEn: 'Chili Powder / Masala' },
  { colNum: 17, id: 'oil', nameMr: 'सोयाबीन तेल', nameEn: 'Soybean Oil' },
  { colNum: 18, id: 'salt', nameMr: 'मीठ', nameEn: 'Salt' },
  { colNum: 19, id: 'vegetables', nameMr: 'भाजीपाला', nameEn: 'Vegetables' },
  { colNum: 20, id: 'purak_aahar', nameMr: 'पूरक आहार', nameEn: 'Supplementary Food' },
  { colNum: 21, id: 'soya_vadi', nameMr: 'सोया वडी', nameEn: 'Soya Vadi' },
  { colNum: 22, id: 'gul_sakhar', nameMr: 'गूळ / साखर', nameEn: 'Jaggery / Sugar' },
  { colNum: 23, id: 'milk_powder', nameMr: 'दूध / दूध पावडर', nameEn: 'Milk / Milk Powder' },
] as const;

/**
 * Pulses & legumes calculated in KG at the end of the month
 */
export const PULSE_IDS = [
  'moong_dal',
  'tur_dal',
  'masoor_dal',
  'matki',
  'moong',
  'chavli',
  'harbhara',
  'green_peas',
  'soya_vadi',
] as const;

/**
 * Spices & condiments calculated in GRAMS at the end of the month
 */
export const SPICE_IDS = [
  'cumin',
  'mustard',
  'turmeric',
  'chili_masala',
  'salt',
] as const;

export function isPulse(id: string): boolean {
  return (PULSE_IDS as readonly string[]).includes(id);
}

export function isSpice(id: string): boolean {
  return (SPICE_IDS as readonly string[]).includes(id);
}

export function getColumnUnitLabel(id: string): string {
  if (id === 'purak_aahar') return 'नग';
  return 'कि.ग्रॅ.'; // All grains, pulses, spices, oil, vegetables in KG
}

export function getStockInDisplayUnit(rawVal: number, ingredientId: string): number {
  if (rawVal <= 0) return 0;
  if (isSpice(ingredientId) && rawVal > 20) {
    // If raw stock was previously entered in grams (> 20 g, e.g. 200g, 500g), convert to kg
    return rawVal / 1000;
  }
  return rawVal;
}

export const DEFAULT_RECIPES: DishRecipe[] = [
  {
    id: 'veg_pulao',
    dayOfWeek: 1, // Monday default
    dayNameMr: 'सोमवार',
    dayNameEn: 'Monday',
    nameMr: 'व्हेजिटेबल पुलाव',
    nameEn: 'Vegetable Pulao',
    pulseIngredientId: 'green_peas',
    pulseGrams: 20,
    includesRice: true,
    riceGrams: 100,
    customCondiments: {
      vegetables: 50,
    },
  },
  {
    id: 'masale_bhaat',
    dayOfWeek: 2, // Tuesday default
    dayNameMr: 'मंगळवार',
    dayNameEn: 'Tuesday',
    nameMr: 'मसाले भात',
    nameEn: 'Masale Bhaat',
    pulseIngredientId: 'tur_dal',
    pulseGrams: 20,
    includesRice: true,
    riceGrams: 100,
    customCondiments: {
      vegetables: 50,
    },
  },
  {
    id: 'matar_pulao',
    dayOfWeek: 3, // Wednesday default
    dayNameMr: 'बुधवार',
    dayNameEn: 'Wednesday',
    nameMr: 'मटार पुलाव',
    nameEn: 'Matar Pulao',
    pulseIngredientId: 'green_peas',
    pulseGrams: 20,
    includesRice: true,
    riceGrams: 100,
    customCondiments: {
      vegetables: 50,
    },
  },
  {
    id: 'moong_dal_khichdi',
    dayOfWeek: 4, // Thursday default
    dayNameMr: 'गुरुवार',
    dayNameEn: 'Thursday',
    nameMr: 'मुगडाळ खिचडी',
    nameEn: 'Moong Dal Khichdi',
    pulseIngredientId: 'moong_dal',
    pulseGrams: 20,
    includesRice: true,
    riceGrams: 100,
    customCondiments: {
      vegetables: 50,
    },
  },
  {
    id: 'chavli_khichdi',
    dayOfWeek: 5, // Friday default
    dayNameMr: 'शुक्रवार',
    dayNameEn: 'Friday',
    nameMr: 'चवळी खिचडी',
    nameEn: 'Chavli Khichdi',
    pulseIngredientId: 'chavli',
    pulseGrams: 20,
    includesRice: true,
    riceGrams: 100,
    customCondiments: {
      vegetables: 50,
    },
  },
  {
    id: 'chana_pulao',
    dayOfWeek: 6, // Saturday default
    dayNameMr: 'शनिवार',
    dayNameEn: 'Saturday',
    nameMr: 'चना पुलाव',
    nameEn: 'Chana Pulao',
    pulseIngredientId: 'harbhara',
    pulseGrams: 20,
    includesRice: true,
    riceGrams: 100,
    customCondiments: {
      vegetables: 50,
    },
  },
  {
    id: 'soybean_pulao',
    dayOfWeek: 1,
    dayNameMr: 'सोयाबीन पुलाव',
    dayNameEn: 'Soybean Pulao',
    nameMr: 'सोयाबीन पुलाव',
    nameEn: 'Soybean Pulao',
    pulseIngredientId: 'soya_vadi',
    pulseGrams: 20,
    includesRice: true,
    riceGrams: 100,
    customCondiments: {
      vegetables: 50,
    },
  },
  {
    id: 'masuri_pulao',
    dayOfWeek: 2,
    dayNameMr: 'मसुरी पुलाव',
    dayNameEn: 'Masuri Pulao',
    nameMr: 'मसुरी पुलाव',
    nameEn: 'Masuri Pulao',
    pulseIngredientId: 'masoor_dal',
    pulseGrams: 20,
    includesRice: true,
    riceGrams: 100,
    customCondiments: {
      vegetables: 50,
    },
  },
  {
    id: 'moong_shevga_varan_bhaat',
    dayOfWeek: 3,
    dayNameMr: 'मुग शेवगा वरण भात',
    dayNameEn: 'Moong Shevga Varan Bhaat',
    nameMr: 'मुग शेवगा वरण भात',
    nameEn: 'Moong Shevga Varan Bhaat',
    pulseIngredientId: 'moong_dal',
    pulseGrams: 20,
    includesRice: true,
    riceGrams: 100,
    customCondiments: {
      vegetables: 50,
    },
  },
  {
    id: 'sprouts_mod_kaddhanya',
    dayOfWeek: 4,
    dayNameMr: 'मोड आलेले कडधान्य',
    dayNameEn: 'Sprouts (Kaddhanya)',
    nameMr: 'मोड आलेले कडधान्य (स्प्राऊट्स)',
    nameEn: 'Mod Aalele Kaddhanya (Sprouts)',
    pulseIngredientId: 'matki',
    pulseGrams: 20,
    includesRice: true,
    riceGrams: 100,
    customCondiments: {
      vegetables: 50,
    },
  },
  {
    id: 'anda_pulao',
    dayOfWeek: 5,
    dayNameMr: 'अंडा पुलाव',
    dayNameEn: 'Egg Pulao',
    nameMr: 'अंडा पुलाव',
    nameEn: 'Anda Pulao',
    pulseIngredientId: 'green_peas',
    pulseGrams: 10,
    includesRice: true,
    riceGrams: 100,
    customCondiments: {
      purak_aahar: 1, // 1 egg in Purak Aahar column
      vegetables: 50,
    },
  },
];

export const MARATHI_DAYS = [
  'रविवार',
  'सोमवार',
  'मंगळवार',
  'बुधवार',
  'गुरुवार',
  'शुक्रवार',
  'शनिवार',
];

export const ENGLISH_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const MARATHI_MONTHS = [
  'जानेवारी',
  'फेब्रुवारी',
  'मार्च',
  'एप्रिल',
  'मे',
  'जून',
  'जुलै',
  'ऑगस्ट',
  'सप्टेंबर',
  'ऑक्टोबर',
  'नोव्हेंबर',
  'डिसेंबर',
];

export const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MAHARASHTRA_DIVISIONS = [
  'पुणे विभाग (Pune)',
  'नाशिक विभाग (Nashik)',
  'छत्रपती संभाजीनगर विभाग (Chhatrapati Sambhajinagar)',
  'नागपूर विभाग (Nagpur)',
  'अमरावती विभाग (Amravati)',
  'कोकण विभाग (Konkan / Mumbai)',
];

export const ACADEMIC_YEARS = [
  '2026-2027',
  '2025-2026',
  '2024-2025',
  '2027-2028',
];

export const AVAILABLE_PULSE_OPTIONS = [
  { id: 'masoor_dal', nameMr: 'मसूरडाळ', nameEn: 'Masoor Dal', defaultGrams: 20 },
  { id: 'moong_dal', nameMr: 'मूगडाळ', nameEn: 'Moong Dal', defaultGrams: 20 },
  { id: 'tur_dal', nameMr: 'तूरडाळ', nameEn: 'Tur Dal', defaultGrams: 20 },
  { id: 'matki', nameMr: 'मटकी', nameEn: 'Matki (Moth Beans)', defaultGrams: 20 },
  { id: 'chavli', nameMr: 'चवळी', nameEn: 'Chavli (Black-eyed Peas)', defaultGrams: 20 },
  { id: 'soya_vadi', nameMr: 'सोया वडी', nameEn: 'Soya Vadi (Soy Chunks)', defaultGrams: 20 },
  { id: 'harbhara', nameMr: 'हरभरा / चणा', nameEn: 'Harbhara / Chana', defaultGrams: 20 },
  { id: 'green_peas', nameMr: 'हिरवा वाटाणा', nameEn: 'Green Peas', defaultGrams: 20 },
  { id: 'moong', nameMr: 'अख्खा मूग', nameEn: 'Moong (Whole)', defaultGrams: 20 },
  { id: 'purak_aahar', nameMr: 'पूरक आहार (अंडे)', nameEn: 'Egg / Supplementary', defaultGrams: 1 },
];

export const MENU_PRESETS: {
  id: string;
  nameMr: string;
  nameEn: string;
  descriptionMr: string;
  recipes: DishRecipe[];
}[] = [
  {
    id: 'mh_standard',
    nameMr: 'महाराष्ट्र शासन अधिकृत ११ पाककृती मेन्यू (PM-POSHAN)',
    nameEn: 'Maharashtra Govt Official 11 Recipes Menu',
    descriptionMr: 'व्हेजिटेबल पुलाव, मसाले भात, मटार पुलाव, मुगडाळ खिचडी, चवळी खिचडी, चना पुलाव, सोयाबीन पुलाव, मसुरी पुलाव, मुग शेवगा वरण भात, मोड आलेले कडधान्य, अंडा पुलाव',
    recipes: DEFAULT_RECIPES,
  },
  {
    id: 'mh_upper_primary',
    nameMr: 'उच्च प्राथमिक मेन्यू (६वी ते ८वी - वाढीव पोषण प्रमाण)',
    nameEn: 'Upper Primary Standard Menu (Class 6th to 8th)',
    descriptionMr: 'उच्च प्राथमिक प्रमाण: १५०g तांदूळ + ३०g कडधान्य/डाळ प्रति विद्यार्थी प्रमाण',
    recipes: [
      {
        id: 'mon_masoor_up',
        dayOfWeek: 1,
        dayNameMr: 'सोमवार',
        dayNameEn: 'Monday',
        nameMr: 'मसूरडाळ पुलाव व भाजी',
        nameEn: 'Masoor Dal Pulao & Veg',
        pulseIngredientId: 'masoor_dal',
        pulseGrams: 30,
        includesRice: true,
        riceGrams: 150,
      },
      {
        id: 'tue_moong_up',
        dayOfWeek: 2,
        dayNameMr: 'मंगळवार',
        dayNameEn: 'Tuesday',
        nameMr: 'मूगडाळ पौष्टिक खिचडी',
        nameEn: 'Moong Dal Nutritious Khichdi',
        pulseIngredientId: 'moong_dal',
        pulseGrams: 30,
        includesRice: true,
        riceGrams: 150,
      },
      {
        id: 'wed_tur_up',
        dayOfWeek: 3,
        dayNameMr: 'बुधवार',
        dayNameEn: 'Wednesday',
        nameMr: 'तूरडाळ सांबार व भात',
        nameEn: 'Tur Dal Sambhar & Rice',
        pulseIngredientId: 'tur_dal',
        pulseGrams: 30,
        includesRice: true,
        riceGrams: 150,
      },
      {
        id: 'thu_matki_up',
        dayOfWeek: 4,
        dayNameMr: 'गुरुवार',
        dayNameEn: 'Thursday',
        nameMr: 'मटकी उसळ व जिरा राईस',
        nameEn: 'Matki Usal & Jeera Rice',
        pulseIngredientId: 'matki',
        pulseGrams: 30,
        includesRice: true,
        riceGrams: 150,
      },
      {
        id: 'fri_chavli_up',
        dayOfWeek: 5,
        dayNameMr: 'शुक्रवार',
        dayNameEn: 'Friday',
        nameMr: 'चवळी रस्सा भाजी व भात',
        nameEn: 'Chavli Curry & Rice',
        pulseIngredientId: 'chavli',
        pulseGrams: 30,
        includesRice: true,
        riceGrams: 150,
      },
      {
        id: 'sat_soya_up',
        dayOfWeek: 6,
        dayNameMr: 'शनिवार',
        dayNameEn: 'Saturday',
        nameMr: 'सोयाबीन व्हेज बिर्याणी/पुलाव',
        nameEn: 'Soybean Veg Biryani/Pulao',
        pulseIngredientId: 'soya_vadi',
        pulseGrams: 25,
        includesRice: true,
        riceGrams: 150,
      },
    ],
  },
  {
    id: 'mh_alt_legumes',
    nameMr: 'पर्यायी कडधान्य मेन्यू (हरभरा, वाटाणा व अख्खा मूग उसळ)',
    nameEn: 'Alternative Legumes Menu (Chana, Peas & Whole Moong)',
    descriptionMr: 'विविध कडधान्ये वापरणारा चविष्ट व पौष्टिक मेन्यू (हरभरा, मटकी, वाटाणा व मूग)',
    recipes: [
      {
        id: 'mon_harbhara',
        dayOfWeek: 1,
        dayNameMr: 'सोमवार',
        dayNameEn: 'Monday',
        nameMr: 'हरभरा (चणा) उसळ व भात',
        nameEn: 'Chana Usal & Rice',
        pulseIngredientId: 'harbhara',
        pulseGrams: 20,
        includesRice: true,
        riceGrams: 100,
      },
      {
        id: 'tue_moong_whole',
        dayOfWeek: 2,
        dayNameMr: 'मंगळवार',
        dayNameEn: 'Tuesday',
        nameMr: 'अख्खा मूग खिचडी व भाजी',
        nameEn: 'Whole Moong Khichdi & Veg',
        pulseIngredientId: 'moong',
        pulseGrams: 20,
        includesRice: true,
        riceGrams: 100,
      },
      {
        id: 'wed_tur',
        dayOfWeek: 3,
        dayNameMr: 'बुधवार',
        dayNameEn: 'Wednesday',
        nameMr: 'तूरडाळ वरण भात',
        nameEn: 'Tur Dal Varan Bhaat',
        pulseIngredientId: 'tur_dal',
        pulseGrams: 20,
        includesRice: true,
        riceGrams: 100,
      },
      {
        id: 'thu_matki',
        dayOfWeek: 4,
        dayNameMr: 'गुरुवार',
        dayNameEn: 'Thursday',
        nameMr: 'मटकी उसळ व भात',
        nameEn: 'Matki Usal & Rice',
        pulseIngredientId: 'matki',
        pulseGrams: 20,
        includesRice: true,
        riceGrams: 100,
      },
      {
        id: 'fri_peas',
        dayOfWeek: 5,
        dayNameMr: 'शुक्रवार',
        dayNameEn: 'Friday',
        nameMr: 'वाटाणा पुलाव / भात',
        nameEn: 'Green Peas Pulao / Rice',
        pulseIngredientId: 'green_peas',
        pulseGrams: 20,
        includesRice: true,
        riceGrams: 100,
      },
      {
        id: 'sat_soya',
        dayOfWeek: 6,
        dayNameMr: 'शनिवार',
        dayNameEn: 'Saturday',
        nameMr: 'सोया वडी पुलाव व भाजी',
        nameEn: 'Soya Vadi Pulao & Veg',
        pulseIngredientId: 'soya_vadi',
        pulseGrams: 20,
        includesRice: true,
        riceGrams: 100,
      },
    ],
  },
];

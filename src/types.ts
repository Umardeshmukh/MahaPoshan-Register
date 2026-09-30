export type LanguageMode = 'mr' | 'en' | 'dual';

export type UserRole = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'MORE_INFO_REQUIRED' | 'REJECTED';
export type AccessStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
export type SubscriptionTierStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'CANCELLED';

export interface SchoolMembership {
  id?: string;
  clerkUserId: string;
  schoolId: string;
  userEmail: string;
  userName?: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchoolProfile {
  id?: string; // Tenant School UUID
  schoolName: string;
  udiseNumber: string;
  centerCluster: string;
  standardCategory: string;
  district: string;
  taluka: string;
  headmasterName: string;
  inchargeTeacher: string;
  cookName: string;
  role?: UserRole;
  verificationStatus?: VerificationStatus;
  accessStatus?: AccessStatus;
  subscriptionStatus?: SubscriptionTierStatus;
}

export type IngredientCategory = 'pulse' | 'grain' | 'condiment' | 'oil' | 'vegetable' | 'supplementary';

export interface OfficialRegisterColumnDef {
  colNum: number;
  id: string;
  nameMr: string;
  nameEn: string;
}

export interface Ingredient {
  id: string;
  nameMr: string;
  nameEn: string;
  category: IngredientCategory;
  defaultGrams: number;
  ratePerKg: number; // in ₹
  unit: 'gm' | 'ml' | 'nag';
  isFixedDaily: boolean; // whether it applies to all meals daily
}

export interface DishRecipe {
  id: string;
  dayOfWeek: number; // 1 = Monday, 2 = Tuesday, ..., 6 = Saturday, 0 = Sunday
  dayNameMr: string;
  dayNameEn: string;
  nameMr: string;
  nameEn: string;
  pulseIngredientId: string;
  pulseGrams: number;
  includesRice: boolean;
  riceGrams: number;
  customCondiments?: Record<string, number>; // optional overrides
}

export interface ItemConsumption {
  ingredientId: string;
  nameMr: string;
  nameEn: string;
  category: IngredientCategory;
  gramsPerStudent: number;
  totalGrams: number;
  totalKg: number;
  ratePerKg: number;
  cost: number;
}

export interface DailyCalculationResult {
  studentCount: number;
  dishId: string;
  dishNameMr: string;
  dishNameEn: string;
  items: ItemConsumption[];
  totalGrainsPulsesKg: number;
  totalVegetablesKg: number;
  totalCookingCost: number;
}

export interface DailyRegisterEntry {
  id: string; // usually YYYY-MM-DD
  schoolId?: string; // Tenant School UUID
  date: string; // YYYY-MM-DD
  dayOfWeek: number;
  dayNameMr: string;
  dayNameEn: string;
  dishId: string;
  dishNameMr: string;
  dishNameEn: string;
  studentCount: number;
  isHoliday?: boolean;
  holidayReason?: string;
  items: Record<string, {
    grams: number;
    kg: number;
    rate: number;
    cost: number;
  }>;
  totalGrainsPulsesKg: number;
  totalVegetablesKg: number;
  totalCookingCost: number;
  remarks?: string;
  savedAt: string;
}

export interface StockInwardItem {
  openingStockKg: number;
  receivedStockKg: number;
  ratePerKg?: number;
}

export type MonthlyStockInward = Record<string, StockInwardItem>;

export interface MonthSummary {
  monthKey: string; // YYYY-MM
  totalWorkingDays: number;
  totalBeneficiaries: number;
  totalCost: number;
  totalGrainsPulsesKg: number;
  totalVegetablesKg: number;
  itemConsumptions: Record<string, {
    totalKg: number;
    totalCost: number;
    openingStockKg: number;
    receivedStockKg: number;
    totalAvailableKg: number;
    closingBalanceKg: number;
  }>;
}

export interface StateNormConfig {
  stateCode: string; // 'MH'
  stateName: string; // 'महाराष्ट्र शासन (Maharashtra State)'
  category: 'primary' | 'upper_primary'; // 'primary' (1-5) or 'upper_primary' (6-8)
  categoryNameMr: string; // 'इयत्ता १ ली ते ५ वी (प्राथमिक)'
  cookingCostNormPerStudent: number; // ₹5.45 for primary, ₹8.17 for upper primary
  riceGramNorm: number; // 100g for primary, 150g for upper primary
  pulseGramNorm: number; // 20g for primary, 30g for upper primary
  vegetableGramNorm: number; // 50g for primary, 75g for upper primary
  oilGramNorm: number; // 5g for primary, 7.5g for upper primary
  saltGramNorm: number; // 2g
  condimentGramNorm: number; // 4.5g
  district: string;
  division: string; // 'पुणे', 'नाशिक', 'छत्रपती संभाजीनगर', 'नागपूर', 'अमरावती', 'कोकण'
  academicYear: string; // '2026-2027'
  lastRecalculatedAt?: string;
  recalculationStatus?: 'synced' | 'pending';
}

export interface MenuConfig {
  weeklyRecipes: DishRecipe[];
  rotationCycleDays: number; // 6
  enableEggOrFruitSupplement: boolean;
  supplementDayOfWeek: number; // 3 (Wednesday) or 5 (Friday)
  supplementNameMr: string; // 'अंडे / केळी / चिक्की'
  supplementRatePerServing: number; // ₹5.00
  defaultServingTime: string; // '12:30 PM'
}

export interface GeneralSettings {
  school: SchoolProfile;
  academicYear: string; // '2026-2027'
  workingDaysPerMonthDefault: number; // 24
  language: LanguageMode;
  showMarathiDigitsInReports: boolean;
  officialRegisterTitle: string;
  officialRegisterPageNumber: string; // '४३'
  tollFreeHelpline: string; // '१८००२३३९९८८'
  autoCalculateCost: boolean;
  autoSaveIntervalSeconds: number; // 5
}

export interface RatesConfig {
  itemRates: Record<string, number>; // id -> ratePerKg
  ingredients: Ingredient[];
  primaryStudentCookingNorm: number; // 5.45
  upperPrimaryStudentCookingNorm: number; // 8.17
  selectedNorm: 'primary' | 'upper_primary' | 'custom';
  customNormPerStudent?: number;
  lastUpdated: string;
}

export interface AppConfig {
  version: number;
  lastUpdated: string;
  rates: RatesConfig;
  menu: MenuConfig;
  general: GeneralSettings;
  states: StateNormConfig;
}

export interface ExportMetadata {
  schemaVersion: string;
  appVersion: string;
  exportedAt: string;
  schoolId?: string;
  udiseNumber: string;
  schoolName: string;
  exportedByUserId?: string;
  exportedByRole?: UserRole;
  recordCounts: {
    dailyEntries: number;
    stockMonths?: number;
    stockInwardMonths?: number;
  };
}

export interface SuperAdminKpiSummary {
  pendingRequests: number;
  needsInformation: number;
  verifiedSchools: number;
  activeSchools: number;
  trialSchools: number;
  expiringSubscriptions: number;
  expiredSubscriptions: number;
  suspendedSchools: number;
  newSchools: number;
  newSchoolsLast7Days?: number;
  pendingReferralPayouts: number;
  paidReferralRewards: number;
}

export interface AppData {
  config?: AppConfig; // The central configuration node for rates, menu, general settings, and states
  exportMetadata?: ExportMetadata;
  profile: SchoolProfile;
  ingredients: Ingredient[];
  recipes: DishRecipe[];
  dailyEntries: Record<string, DailyRegisterEntry>; // date -> entry
  stockInward: Record<string, MonthlyStockInward>; // YYYY-MM -> stock inward
  language: LanguageMode;
}

export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'rejected' | 'pending_deletion';

export type AutoValidationResult = 'VERIFIED' | 'REQUIRES_REVIEW' | 'DUPLICATE' | 'INVALID';

export interface SchoolValidationDetails {
  result: AutoValidationResult;
  reasons: string[];
  isFormatValid: boolean;
  isDuplicateSchool: boolean;
  isDuplicateRequest: boolean;
  hasExistingAdmin: boolean;
  hasExistingMembership: boolean;
  existingSchool?: {
    id: string;
    schoolName: string;
    udiseNumber: string;
    centerCluster?: string;
    district?: string;
    headmasterName?: string;
    verificationStatus?: VerificationStatus;
    accessStatus?: AccessStatus;
  };
}

export interface StateTransitionAudit {
  id?: string;
  requestId: string;
  schoolId?: string;
  userId: string;
  adminId: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
  timestamp: string;
}

export interface UserAccessRequest {
  id: string;
  schoolId?: string; // Tenant School UUID
  role?: UserRole;
  verificationStatus?: VerificationStatus;
  accessStatus?: AccessStatus;
  subscriptionStatus?: SubscriptionTierStatus;
  validationResult?: AutoValidationResult;
  validationDetails?: SchoolValidationDetails;
  adminFeedback?: string; // Feedback when MORE_INFO_REQUIRED or rejection
  resubmittedAt?: string;
  clerkUserId: string;
  userEmail: string;
  userName?: string;
  schoolName: string;
  udiseNumber: string;
  centerCluster?: string;
  taluka?: string;
  district: string;
  phone?: string;
  status: SubscriptionStatus;
  requestedAt: string; // ISO string
  approvedAt?: string;
  expiresAt?: string; // ISO string
  durationMonths?: number;
  notes?: string;
  // Soft deletion and 28-day retention fields
  scheduledDeletionAt?: string; // ISO string
  permanentDeletionDate?: string; // ISO string (scheduledDeletionAt + 28 days)
  deletionReason?: string;
  // Legal Agreement Audit Trail
  agreedToTerms?: boolean;
  agreedAt?: string; // ISO string
  termsVersion?: string;
  privacyPolicyVersion?: string;
  // Referral tracking
  referralCode?: string;
}

export type LegalDocType = 'terms' | 'privacy' | 'refund' | 'contact';

export type ReferralRewardStatus = 'pending' | 'eligible' | 'paid' | 'rejected';

export interface ReferralRecord {
  id: string;
  referrerCode: string;
  referrerUserId?: string;
  referrerName?: string;
  referrerEmail?: string;
  referrerSchool?: string;
  referrerPhone?: string;
  referrerUpiId?: string;
  referredSchoolName: string;
  referredUdise: string;
  referredUserName: string;
  referredUserEmail: string;
  referredPhone?: string;
  referredRequestId?: string;
  registeredAt: string; // ISO string
  registrationStatus: SubscriptionStatus;
  rewardStatus: ReferralRewardStatus;
  rewardAmount: number; // in ₹
  rewardPaidAt?: string; // ISO string
  rewardPaymentRef?: string; // UPI UTR or Ref ID
  adminNotes?: string;
}

export interface ReferralStats {
  code: string;
  totalReferred: number;
  approvedCount: number;
  pendingCount: number;
  totalRewardsEarned: number;
  rewardsPaid: number;
  rewardsPending: number;
  referrals: ReferralRecord[];
}

export interface UserPayoutDetails {
  userId: string;
  upiId: string;
  phone: string;
  updatedAt: string;
}

export interface AdminNotification {
  id: string;
  type: 'new_request' | 'expiring_soon' | 'expired' | 'new_referral' | 'request_rejected' | 'account_deleted';
  title: string;
  message: string;
  timestamp: string; // ISO string
  read: boolean;
  requestId?: string;
  referralId?: string;
}


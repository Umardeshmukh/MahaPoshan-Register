import {
  ReferralRecord,
  ReferralRewardStatus,
  ReferralStats,
  UserAccessRequest,
  SubscriptionStatus,
} from '../types';
import { sendReferralEligibilityEmail } from './email-service';
import { logStructuredEvent } from './observability';

const REFERRAL_RECORDS_KEY = 'pm_poshan_referral_records_v1';
const USER_REFERRAL_PROFILES_KEY = 'pm_poshan_user_referral_profiles_v1';
const USER_PAYOUT_DETAILS_KEY = 'pm_poshan_user_payout_details_v1';

export const DEFAULT_REWARD_PER_SCHOOL = 0; // in ₹

export interface UserReferralProfile {
  userId: string;
  referralCode: string;
  userName: string;
  userEmail: string;
  schoolName: string;
  udiseNumber: string;
  createdAt: string;
}

export interface UserPayoutDetails {
  userId: string;
  upiId: string;
  phone: string;
  updatedAt: string;
}

// Clean initial states for referral database
const SEED_PROFILES: UserReferralProfile[] = [];
const SEED_PAYOUTS: Record<string, UserPayoutDetails> = {};
const SEED_REFERRALS: ReferralRecord[] = [];

function loadProfiles(): UserReferralProfile[] {
  try {
    const raw = localStorage.getItem(USER_REFERRAL_PROFILES_KEY);
    if (!raw) {
      localStorage.setItem(USER_REFERRAL_PROFILES_KEY, JSON.stringify([]));
      return [];
    }
    const parsed: UserReferralProfile[] = JSON.parse(raw);
    return parsed.filter((p) => !p.userId.startsWith('user_demo_'));
  } catch (e) {
    console.error('Failed to load referral profiles', e);
    return [];
  }
}

function saveProfiles(profiles: UserReferralProfile[]): void {
  try {
    localStorage.setItem(USER_REFERRAL_PROFILES_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed to save referral profiles', e);
  }
}

function loadReferrals(): ReferralRecord[] {
  try {
    const raw = localStorage.getItem(REFERRAL_RECORDS_KEY);
    if (!raw) {
      localStorage.setItem(REFERRAL_RECORDS_KEY, JSON.stringify([]));
      return [];
    }
    const parsed: ReferralRecord[] = JSON.parse(raw);
    return parsed.filter((r) => !r.id.startsWith('ref_seed_'));
  } catch (e) {
    console.error('Failed to load referral records', e);
    return [];
  }
}

function saveReferrals(records: ReferralRecord[]): void {
  try {
    localStorage.setItem(REFERRAL_RECORDS_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save referral records', e);
  }
}

function loadPayouts(): Record<string, UserPayoutDetails> {
  try {
    const raw = localStorage.getItem(USER_PAYOUT_DETAILS_KEY);
    if (!raw) {
      localStorage.setItem(USER_PAYOUT_DETAILS_KEY, JSON.stringify({}));
      return {};
    }
    const parsed: Record<string, UserPayoutDetails> = JSON.parse(raw);
    const cleaned: Record<string, UserPayoutDetails> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!k.startsWith('user_demo_')) {
        cleaned[k] = v;
      }
    }
    return cleaned;
  } catch (e) {
    return {};
  }
}

function savePayouts(payouts: Record<string, UserPayoutDetails>): void {
  try {
    localStorage.setItem(USER_PAYOUT_DETAILS_KEY, JSON.stringify(payouts));
  } catch (e) {
    console.error('Failed to save payout details', e);
  }
}

/**
 * Generates an attractive, unique referral code for a user.
 * e.g., MP-PUNE82 or MP-272501 or MP-7FA9
 */
export function generateReferralCode(udise?: string, userId?: string): string {
  if (udise && udise.length >= 6) {
    // Last 6 digits of UDISE make a clean, recognizable school code
    return `MP-${udise.slice(-6)}`;
  }
  if (userId) {
    const cleanId = userId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `MP-${cleanId.slice(-6).padEnd(6, 'X')}`;
  }
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MP-${rand}`;
}

/**
 * Gets or creates the unique referral code for a user
 */
export function getOrCreateUserReferralCode(user: {
  id: string;
  name?: string;
  email?: string;
  schoolName?: string;
  udise?: string;
}): string {
  if (!user.id) return 'MP-POSHAN';
  const profiles = loadProfiles();
  const existing = profiles.find((p) => p.userId === user.id);
  if (existing) {
    return existing.referralCode;
  }

  const newCode = generateReferralCode(user.udise, user.id);
  const newProfile: UserReferralProfile = {
    userId: user.id,
    referralCode: newCode,
    userName: user.name || 'शिक्षक / मुख्याध्यापक',
    userEmail: user.email || '',
    schoolName: user.schoolName || '',
    udiseNumber: user.udise || '',
    createdAt: new Date().toISOString(),
  };

  profiles.push(newProfile);
  saveProfiles(profiles);
  return newCode;
}

/**
 * Validates a referral code entered during registration
 */
export function validateReferralCode(
  code: string,
  currentUserId?: string
): {
  valid: boolean;
  message: string;
  referrer?: { name: string; school: string; code: string; userId: string };
} {
  const normalized = (code || '').trim().toUpperCase();
  if (!normalized) {
    return { valid: false, message: 'कृपया रेफरल कोड प्रविष्ट करा.' };
  }

  const profiles = loadProfiles();
  const match = profiles.find(
    (p) => p.referralCode.toUpperCase() === normalized
  );

  if (!match) {
    // If it's a seed or recognized pattern, allow gracefully
    if (normalized.startsWith('MP-') && normalized.length >= 5) {
      return {
        valid: true,
        message: '✓ वैध रेफरल कोड लागू झाला!',
        referrer: {
          name: 'सहकारी शिक्षक',
          school: 'महाराष्ट्र शाळा',
          code: normalized,
          userId: 'unknown',
        },
      };
    }
    return {
      valid: false,
      message: 'अवैध रेफरल कोड. कृपया कोड तपासून पुन्हा प्रयत्न करा.',
    };
  }

  // Prevent self-referral
  if (currentUserId && match.userId === currentUserId) {
    return {
      valid: false,
      message: 'आपण स्वतःचाच रेफरल कोड वापरू शकत नाही.',
    };
  }

  return {
    valid: true,
    message: `✓ रेफरल कोड लागू झाला: ${match.userName} (${match.schoolName || 'शाळा'})`,
    referrer: {
      name: match.userName,
      school: match.schoolName,
      code: match.referralCode,
      userId: match.userId,
    },
  };
}

/**
 * Records a new school registration referred by a user code
 */
export function recordReferralRegistration(
  request: UserAccessRequest,
  referralCode: string
): ReferralRecord | null {
  const normalizedCode = (referralCode || '').trim().toUpperCase();
  if (!normalizedCode) return null;

  const profiles = loadProfiles();
  const referrer = profiles.find(
    (p) => p.referralCode.toUpperCase() === normalizedCode
  );

  // Prevent self-referral manipulation (same userId, same email, or same UDISE)
  if (
    referrer &&
    ((request.clerkUserId && referrer.userId === request.clerkUserId) ||
      (request.userEmail &&
        referrer.userEmail &&
        referrer.userEmail.toLowerCase().trim() === request.userEmail.toLowerCase().trim()) ||
      (request.udiseNumber &&
        referrer.udiseNumber &&
        referrer.udiseNumber.trim() === request.udiseNumber.trim()))
  ) {
    logStructuredEvent({
      category: 'SECURITY_VIOLATION',
      severity: 'warn',
      message: 'Self-referral attempt blocked during registration',
      userId: request.clerkUserId,
      context: { referralCode: normalizedCode, udise: request.udiseNumber },
    });
    return null;
  }

  const records = loadReferrals();
  // Prevent duplicate referral manipulation if this UDISE is already eligible or paid
  const existingIdx = records.findIndex(
    (r) => r.referredUdise === request.udiseNumber
  );
  if (
    existingIdx >= 0 &&
    (records[existingIdx].rewardStatus === 'eligible' ||
      records[existingIdx].rewardStatus === 'paid')
  ) {
    logStructuredEvent({
      category: 'SECURITY_VIOLATION',
      severity: 'warn',
      message: 'Duplicate referral claim blocked for already eligible/paid school',
      userId: request.clerkUserId,
      context: { udise: request.udiseNumber, existingReferralId: records[existingIdx].id },
    });
    return records[existingIdx];
  }

  const payouts = loadPayouts();
  const referrerPayout = referrer ? payouts[referrer.userId] : undefined;

  const newRecord: ReferralRecord = {
    id: 'ref_' + Date.now(),
    referrerCode: normalizedCode,
    referrerUserId: referrer?.userId,
    referrerName: referrer?.userName || 'सहकारी शिक्षक',
    referrerEmail: referrer?.userEmail,
    referrerSchool: referrer?.schoolName || 'महाराष्ट्र शाळा',
    referrerPhone: referrerPayout?.phone,
    referrerUpiId: referrerPayout?.upiId,
    referredSchoolName: request.schoolName,
    referredUdise: request.udiseNumber,
    referredUserName: request.userName,
    referredUserEmail: request.userEmail,
    referredPhone: request.phone,
    referredRequestId: request.id,
    registeredAt: new Date().toISOString(),
    registrationStatus: request.status,
    rewardStatus: request.status === 'active' ? 'eligible' : 'pending',
    rewardAmount: DEFAULT_REWARD_PER_SCHOOL,
    adminNotes: `नोंदणीच्या वेळी ${normalizedCode} रेफरल कोड प्रविष्ट केला.`,
  };

  if (existingIdx >= 0) {
    records[existingIdx] = { ...records[existingIdx], ...newRecord };
  } else {
    records.unshift(newRecord);
  }
  saveReferrals(records);

  return newRecord;
}

/**
 * Saves user's UPI / Phone number for receiving referral rewards
 */
export function saveUserPayoutDetails(
  userId: string,
  upiId: string,
  phone: string
): UserPayoutDetails {
  const payouts = loadPayouts();
  const updated: UserPayoutDetails = {
    userId,
    upiId: upiId.trim(),
    phone: phone.trim(),
    updatedAt: new Date().toISOString(),
  };
  payouts[userId] = updated;
  savePayouts(payouts);

  // Also update any referral records from this user so admin sees their UPI ID immediately
  const records = loadReferrals();
  let changed = false;
  records.forEach((r) => {
    if (r.referrerUserId === userId) {
      r.referrerUpiId = updated.upiId;
      r.referrerPhone = updated.phone;
      changed = true;
    }
  });
  if (changed) {
    saveReferrals(records);
  }

  return updated;
}

/**
 * Gets user's UPI details
 */
export function getUserPayoutDetails(userId: string): UserPayoutDetails | null {
  const payouts = loadPayouts();
  return payouts[userId] || null;
}

/**
 * Calculates referral statistics for a specific user or code
 */
export function getReferralStats(userIdOrCode: string): ReferralStats {
  const records = loadReferrals();
  const profiles = loadProfiles();

  let code = userIdOrCode;
  const userProfile = profiles.find(
    (p) => p.userId === userIdOrCode || p.referralCode === userIdOrCode
  );
  if (userProfile) {
    code = userProfile.referralCode;
  }

  const userReferrals = records.filter(
    (r) =>
      r.referrerCode.toUpperCase() === code.toUpperCase() ||
      (userProfile && r.referrerUserId === userProfile.userId)
  );

  let approvedCount = 0;
  let pendingCount = 0;
  let rewardsPaid = 0;
  let rewardsPending = 0;
  let totalRewardsEarned = 0;

  userReferrals.forEach((r) => {
    if (r.registrationStatus === 'active') {
      approvedCount++;
    } else if (r.registrationStatus === 'pending') {
      pendingCount++;
    }

    if (r.rewardStatus === 'paid') {
      rewardsPaid += r.rewardAmount;
      totalRewardsEarned += r.rewardAmount;
    } else if (r.rewardStatus === 'eligible') {
      rewardsPending += r.rewardAmount;
      totalRewardsEarned += r.rewardAmount;
    } else if (r.rewardStatus === 'pending') {
      // Pending approval
    }
  });

  return {
    code,
    totalReferred: userReferrals.length,
    approvedCount,
    pendingCount,
    totalRewardsEarned,
    rewardsPaid,
    rewardsPending,
    referrals: userReferrals,
  };
}

/**
 * Fetches all referrals for the Super Admin
 */
export function getAllReferrals(): ReferralRecord[] {
  return loadReferrals();
}

/**
 * Super Admin action: Mark a referral reward as paid manually
 */
export function markRewardAsPaid(
  referralId: string,
  paymentRef: string,
  amount?: number
): ReferralRecord | null {
  const records = loadReferrals();
  const idx = records.findIndex((r) => r.id === referralId);
  if (idx === -1) return null;

  records[idx] = {
    ...records[idx],
    rewardStatus: 'paid',
    rewardPaidAt: new Date().toISOString(),
    rewardPaymentRef: paymentRef.trim(),
    rewardAmount: amount !== undefined ? amount : records[idx].rewardAmount,
    adminNotes: `ॲडमिनद्वारे बक्षीस जमा केले (Ref: ${paymentRef.trim()}).`,
  };

  saveReferrals(records);
  return records[idx];
}

/**
 * Updates referral status when school subscription status changes
 */
export function syncReferralStatusWithSubscription(
  requestId: string,
  newStatus: SubscriptionStatus
): void {
  const records = loadReferrals();
  let changed = false;

  records.forEach((r) => {
    if (r.referredRequestId === requestId) {
      r.registrationStatus = newStatus;
      if (newStatus === 'active' && r.rewardStatus === 'pending') {
        r.rewardStatus = 'eligible'; // Eligible for manual payout
        if (r.referrerEmail) {
          sendReferralEligibilityEmail({
            referrerEmail: r.referrerEmail,
            referrerName: r.referrerName || 'सहकारी शिक्षक',
            referredSchoolName: r.referredSchoolName,
            rewardAmount: r.rewardAmount,
          }).catch(() => {});
        }
      } else if (newStatus === 'rejected') {
        r.rewardStatus = 'rejected';
      }
      changed = true;
    }
  });

  if (changed) {
    saveReferrals(records);
  }
}

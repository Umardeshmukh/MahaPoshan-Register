import { UserAccessRequest, SubscriptionStatus, AdminNotification } from '../types';
import {
  recordReferralRegistration,
  syncReferralStatusWithSubscription,
} from './referral-store';
import {
  purgeUserDataFromCloud,
  syncAccessRequestToCloud,
  fetchAllSchoolsFromCloud,
  updateSchoolStatusInCloud,
  fetchUserSchoolFromCloud,
} from './cloud-sync';

const REQUESTS_STORAGE_KEY = 'pm_poshan_access_requests_v1';
const NOTIFICATIONS_STORAGE_KEY = 'pm_poshan_admin_notifications_v1';
const ADMIN_CONFIG_KEY = 'pm_poshan_super_admin_config_v1';

export const DEFAULT_SUPER_ADMIN_EMAIL = 'umardesh@gmail.com';
export const DEFAULT_SUPER_ADMIN_PASSCODE = 'Admin@1234';

export interface SuperAdminConfig {
  passcode: string;
  adminEmail: string;
  emailAlertsEnabled: boolean;
  defaultDurationMonths?: number;
  referralRewardAmount?: number;
  systemNotice?: string;
}

const DEFAULT_CONFIG: SuperAdminConfig = {
  passcode: DEFAULT_SUPER_ADMIN_PASSCODE,
  adminEmail: DEFAULT_SUPER_ADMIN_EMAIL,
  emailAlertsEnabled: true,
  defaultDurationMonths: 6,
  referralRewardAmount: 0,
  systemNotice: '',
};

// Clean default states - no demo requests or notifications
const SEED_REQUESTS: UserAccessRequest[] = [];
const SEED_NOTIFICATIONS: AdminNotification[] = [];

/**
 * Automatically purges any requests whose 28-day soft-deletion grace period has expired.
 */
function purgeExpiredDeletions(requests: UserAccessRequest[]): UserAccessRequest[] {
  const now = Date.now();
  let changed = false;
  const retained: UserAccessRequest[] = [];

  for (const r of requests) {
    if (r.status === 'pending_deletion' && r.permanentDeletionDate) {
      const deleteTime = new Date(r.permanentDeletionDate).getTime();
      if (now >= deleteTime) {
        // 28 days elapsed -> permanently purge from localStorage and Supabase Cloud
        changed = true;
        if (r.clerkUserId) {
          purgeUserDataFromCloud(r.clerkUserId).catch((err) =>
            console.warn('Failed purging cloud data for expired request:', err)
          );
        }
        continue;
      }
    }
    retained.push(r);
  }

  if (changed) {
    saveRequests(retained);
  }
  return retained;
}

function loadRequests(): UserAccessRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed: UserAccessRequest[] = JSON.parse(raw);
    const cleaned = parsed.filter((r) => !r.id.startsWith('req_seed_'));
    return purgeExpiredDeletions(cleaned);
  } catch (e) {
    console.error('Failed to load access requests from localStorage', e);
    return [];
  }
}

function saveRequests(requests: UserAccessRequest[]): void {
  try {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  } catch (e) {
    console.error('Failed to save access requests to localStorage', e);
  }
}

export function getAdminNotifications(): AdminNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed: AdminNotification[] = JSON.parse(raw);
    return parsed.filter((n) => !n.id.startsWith('notif_seed_'));
  } catch (e) {
    console.error('Failed to load notifications', e);
    return [];
  }
}

export function saveAdminNotifications(notifs: AdminNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifs));
  } catch (e) {
    console.error('Failed to save notifications', e);
  }
}



export function markNotificationAsRead(id: string): void {
  const notifs = getAdminNotifications().map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  saveAdminNotifications(notifs);
}

export function markAllNotificationsAsRead(): void {
  const notifs = getAdminNotifications().map((n) => ({ ...n, read: true }));
  saveAdminNotifications(notifs);
}

export function getSuperAdminConfig(): SuperAdminConfig {
  try {
    const raw = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (!raw) {
      localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
      return DEFAULT_CONFIG;
    }
    const parsed = JSON.parse(raw);
    if (parsed.adminEmail === 'poshanragister@gmail.com') {
      parsed.adminEmail = DEFAULT_SUPER_ADMIN_EMAIL;
      localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(parsed));
    }
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

export function updateSuperAdminConfig(newConfig: Partial<SuperAdminConfig>): void {
  const current = getSuperAdminConfig();
  const updated = { ...current, ...newConfig };
  try {
    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save admin config', e);
  }
}

export function getAllAccessRequests(): UserAccessRequest[] {
  return loadRequests();
}

// Testing bypass list: allowed email accounts that automatically bypass admin approval
export const TEST_BYPASS_APPROVAL_EMAILS: string[] = [
  'mahaposhan@gmail.com',
  'poshanragister@gmail.com',
  'umardesh@gmail.com',
  'umardesh11@gmail.com',
  'abuzar212ai@gmail.com',
];

export const SUPER_ADMIN_AUTHORIZED_EMAILS = TEST_BYPASS_APPROVAL_EMAILS;

export function isBypassApprovalEmail(userEmail?: string): boolean {
  if (!userEmail) return false;
  const normalized = userEmail.toLowerCase().trim();
  return TEST_BYPASS_APPROVAL_EMAILS.some((e) => e.toLowerCase().trim() === normalized);
}

/**
 * Validates admin login credentials against configured Super Admin email and passcode.
 * Only authorized admins with matching credentials can log in.
 */
export function verifyAdminCredentials(email: string, pass: string): boolean {
  const config = getSuperAdminConfig();
  const normalizedEmail = (email || '').toLowerCase().trim();
  const validEmails = [
    config.adminEmail.toLowerCase().trim(),
    ...SUPER_ADMIN_AUTHORIZED_EMAILS.map((e) => e.toLowerCase().trim()),
  ];
  const isEmailValid = validEmails.includes(normalizedEmail);
  const isPassValid =
    pass === config.passcode || pass === DEFAULT_SUPER_ADMIN_PASSCODE;

  return isEmailValid && isPassValid;
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('pm_poshan_admin_auth') === 'true';
}

export function setAdminAuthenticated(email?: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('pm_poshan_admin_auth', 'true');
  if (email) {
    sessionStorage.setItem('pm_poshan_admin_email', email);
  }
}

export function clearAdminAuthentication(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('pm_poshan_admin_auth');
  sessionStorage.removeItem('pm_poshan_admin_email');
}

/**
 * Calculates current user's access status.
 * Automatically grants perpetual full access to the Super Admin and test bypass emails.
 */
export function getUserAccessStatus(
  clerkUserId?: string,
  userEmail?: string
): {
  status: SubscriptionStatus;
  request?: UserAccessRequest;
  daysRemaining?: number;
  isSuperAdmin: boolean;
} {
  const adminConfig = getSuperAdminConfig();
  const normalizedEmail = (userEmail || '').toLowerCase().trim();
  const isSuperAdmin = normalizedEmail === adminConfig.adminEmail.toLowerCase().trim();
  const isBypass = isBypassApprovalEmail(normalizedEmail);

  if (isSuperAdmin || isBypass) {
    return {
      status: 'active',
      daysRemaining: 9999,
      isSuperAdmin,
    };
  }

  if (!clerkUserId && !userEmail) {
    return { status: 'pending', isSuperAdmin: false };
  }

  const requests = loadRequests();
  const request = requests.find(
    (r) =>
      (clerkUserId && r.clerkUserId === clerkUserId) ||
      (normalizedEmail && r.userEmail.toLowerCase().trim() === normalizedEmail)
  );

  if (!request) {
    return { status: 'pending', isSuperAdmin: false };
  }

  // Auto-activate any pending requests so users can immediately use the app upon registration
  if (request.status === 'pending') {
    const durationMonths = adminConfig.defaultDurationMonths || 12;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + durationMonths);
    request.status = 'active';
    request.approvedAt = request.approvedAt || new Date().toISOString();
    request.durationMonths = durationMonths;
    request.expiresAt = expiry.toISOString();
    saveRequests(requests);
    if (clerkUserId) {
      updateSchoolStatusInCloud(clerkUserId, 'active', durationMonths, expiry.toISOString()).catch((err) =>
        console.warn('Auto-approval cloud sync notice:', err)
      );
    }
  }

  // If status is active, check expiration
  if (request.status === 'active') {
    if (request.expiresAt) {
      const now = new Date().getTime();
      const expiry = new Date(request.expiresAt).getTime();
      const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        return {
          status: 'expired',
          request,
          daysRemaining: 0,
          isSuperAdmin: false,
        };
      }

      return {
        status: 'active',
        request,
        daysRemaining: diffDays,
        isSuperAdmin: false,
      };
    }
    return {
      status: 'active',
      request,
      daysRemaining: 365,
      isSuperAdmin: false,
    };
  }

  return {
    status: request.status,
    request,
    isSuperAdmin: false,
  };
}

/**
 * Submits a new user access request and notifies Super Admin (in-app + email)
 */
export function submitAccessRequest(
  data: Omit<UserAccessRequest, 'id' | 'status' | 'requestedAt'>
): UserAccessRequest {
  const requests = loadRequests();

  // Check if existing request exists for this email/user
  const existingIndex = requests.findIndex(
    (r) =>
      (data.clerkUserId && r.clerkUserId === data.clerkUserId) ||
      (data.userEmail && r.userEmail.toLowerCase().trim() === data.userEmail.toLowerCase().trim())
  );

  const isBypass = isBypassApprovalEmail(data.userEmail);
  const adminConfig = getSuperAdminConfig();
  const durationMonths = adminConfig.defaultDurationMonths || 12;
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + durationMonths);

  const newStatus: SubscriptionStatus = isBypass ? 'active' : 'pending';

  const newRequest: UserAccessRequest = {
    ...data,
    id: existingIndex >= 0 ? requests[existingIndex].id : 'req_' + Date.now(),
    status: newStatus,
    approvedAt: isBypass ? new Date().toISOString() : undefined,
    durationMonths: isBypass ? durationMonths : undefined,
    expiresAt: isBypass ? expiry.toISOString() : undefined,
    requestedAt: existingIndex >= 0 && requests[existingIndex].requestedAt ? requests[existingIndex].requestedAt : new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    requests[existingIndex] = newRequest;
  } else {
    requests.unshift(newRequest);
  }
  saveRequests(requests);

  // Invalidate access cache so live checks see the new status immediately
  if (data.clerkUserId) {
    invalidateAccessStatusCache(data.clerkUserId);
  }

  // Immediately persist to Supabase schools table so Super Admin can see it across devices
  syncAccessRequestToCloud(newRequest).catch((err) =>
    console.warn('Supabase access request sync notice:', err)
  );

  // Trigger In-App notification
  const notifs = getAdminNotifications();
  const newNotif: AdminNotification = {
    id: 'notif_' + Date.now(),
    type: 'new_request',
    title: isBypass ? 'नवीन शाळा नोंदणी झाली!' : 'नवीन शाळा प्रवेश मंजुरी विनंती!',
    message: isBypass
      ? `${data.schoolName || 'शाळा'} (${data.userEmail}) यांनी नोंदणी केली.`
      : `${data.schoolName || 'शाळा'} (${data.userEmail}) - UDISE: ${data.udiseNumber || 'N/A'} यांनी प्रवेश विनंती पाठवली आहे. मंजुरी प्रलंबित.`,
    timestamp: new Date().toISOString(),
    read: false,
    requestId: newRequest.id,
  };
  notifs.unshift(newNotif);
  saveAdminNotifications(notifs);

  // Dispatch Email Notification
  sendAdminEmailNotification(newRequest);

  // If referral code was entered, log referral registration
  if (data.referralCode) {
    const refRecord = recordReferralRegistration(newRequest, data.referralCode);
    if (refRecord) {
      if (isBypass) {
        syncReferralStatusWithSubscription(newRequest.id, 'active');
      }
      notifs.unshift({
        id: 'notif_ref_' + Date.now(),
        type: 'new_referral',
        title: 'नवीन रेफरल शाळा नोंदणी!',
        message: `${refRecord.referredSchoolName} यांनी ${refRecord.referrerCode} (${refRecord.referrerName}) यांच्या रेफरल कोडद्वारे नोंदणी केली.`,
        timestamp: new Date().toISOString(),
        read: false,
        referralId: refRecord.id,
      });
      saveAdminNotifications(notifs);
    }
  }

  return newRequest;
}

/**
 * Super Admin approves user access with a specific duration (in months) or custom date
 */
export function approveAccessRequest(
  requestId: string,
  durationMonths: number,
  customExpiryDate?: string
): UserAccessRequest | null {
  const requests = loadRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return null;

  const now = new Date();
  let expiry: Date;

  if (customExpiryDate) {
    expiry = new Date(customExpiryDate);
  } else {
    expiry = new Date(now);
    expiry.setMonth(expiry.getMonth() + durationMonths);
  }

  requests[reqIndex] = {
    ...requests[reqIndex],
    status: 'active',
    approvedAt: now.toISOString(),
    durationMonths,
    expiresAt: expiry.toISOString(),
  };

  saveRequests(requests);

  // Sync approval to Supabase schools table
  if (requests[reqIndex].clerkUserId) {
    updateSchoolStatusInCloud(
      requests[reqIndex].clerkUserId,
      'active',
      durationMonths,
      expiry.toISOString()
    ).catch((err) => console.warn('Supabase status update error:', err));
  }

  // Sync with referral store: Mark referral reward eligible
  syncReferralStatusWithSubscription(requestId, 'active');

  if (requests[reqIndex].clerkUserId) {
    invalidateAccessStatusCache(requests[reqIndex].clerkUserId);
  }
  syncAllRequestsCache = null;

  return requests[reqIndex];
}

// TTL Cache for cloud access status checks (60 seconds)
interface AccessStatusCacheEntry {
  status: SubscriptionStatus | null;
  expiresAt: number;
}
const accessStatusCache = new Map<string, AccessStatusCacheEntry>();
const inFlightAccessStatusPromises = new Map<string, Promise<SubscriptionStatus | null>>();

// In-flight and short TTL cache for Super Admin sync (15 seconds)
let syncAllRequestsPromise: Promise<UserAccessRequest[]> | null = null;
let syncAllRequestsCache: { data: UserAccessRequest[]; expiresAt: number } | null = null;

export function invalidateAccessStatusCache(clerkUserId?: string): void {
  if (clerkUserId) {
    accessStatusCache.delete(clerkUserId);
  } else {
    accessStatusCache.clear();
  }
  syncAllRequestsCache = null;
}

/**
 * Loads all school requests from Supabase Cloud and synchronizes local storage.
 * Deduplicates in-flight requests and caches for 15s to reduce redundant roundtrips.
 */
export async function syncAllRequestsFromCloud(forceRefresh: boolean = false): Promise<UserAccessRequest[]> {
  const now = Date.now();
  if (!forceRefresh && syncAllRequestsCache && syncAllRequestsCache.expiresAt > now) {
    return syncAllRequestsCache.data;
  }

  if (syncAllRequestsPromise) {
    return syncAllRequestsPromise;
  }

  syncAllRequestsPromise = (async () => {
    try {
      const cloudSchools = await fetchAllSchoolsFromCloud();
      if (cloudSchools.length === 0) {
        return loadRequests();
      }

      const localRequests = loadRequests();
      const mergedMap = new Map<string, UserAccessRequest>();

      // Add local requests first
      localRequests.forEach((r) => {
        if (r.clerkUserId) mergedMap.set(r.clerkUserId, r);
        else mergedMap.set(r.id, r);
      });

      // Cloud is the master source of truth - merge with cloud data
      cloudSchools.forEach((c) => {
        const key = c.clerkUserId || c.id;
        const existing = mergedMap.get(key);
        if (existing) {
          mergedMap.set(key, {
            ...existing,
            ...c,
            phone: c.phone || existing.phone,
            notes: c.notes || existing.notes,
          });
        } else {
          mergedMap.set(key, c);
        }
      });

      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );

      saveRequests(merged);
      syncAllRequestsCache = {
        data: merged,
        expiresAt: Date.now() + 15000, // 15s TTL
      };
      return merged;
    } finally {
      syncAllRequestsPromise = null;
    }
  })();

  return syncAllRequestsPromise;
}

/**
 * Checks live access status directly against Supabase for a given user.
 * Implements a 60-second TTL cache and in-flight request deduplication
 * to avoid hammering Supabase on every component re-render or tab switch.
 */
export async function checkCloudAccessStatus(
  clerkUserId?: string,
  userEmail?: string,
  forceRefresh: boolean = false
): Promise<SubscriptionStatus | null> {
  if (!clerkUserId) return null;

  const now = Date.now();
  if (!forceRefresh) {
    const cached = accessStatusCache.get(clerkUserId);
    if (cached && cached.expiresAt > now) {
      return cached.status;
    }
  }

  // Deduplicate concurrent in-flight checks
  const existingPromise = inFlightAccessStatusPromises.get(clerkUserId);
  if (existingPromise) {
    return existingPromise;
  }

  const checkPromise = (async (): Promise<SubscriptionStatus | null> => {
    try {
      const cloudRecord = await fetchUserSchoolFromCloud(clerkUserId);
      if (!cloudRecord) {
        accessStatusCache.set(clerkUserId, { status: null, expiresAt: Date.now() + 30000 });
        return null;
      }

      // Auto-activate any legacy pending status in cloud so users are not blocked
      if (cloudRecord.status === 'pending') {
        cloudRecord.status = 'active';
        const adminConfig = getSuperAdminConfig();
        const durationMonths = adminConfig.defaultDurationMonths || 12;
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + durationMonths);
        cloudRecord.approvedAt = cloudRecord.approvedAt || new Date().toISOString();
        cloudRecord.durationMonths = durationMonths;
        cloudRecord.expiresAt = expiry.toISOString();
        updateSchoolStatusInCloud(clerkUserId, 'active', durationMonths, expiry.toISOString()).catch((err) =>
          console.warn('Cloud pending auto-approval update notice:', err)
        );
      }

      const requests = loadRequests();
      const idx = requests.findIndex(
        (r) =>
          r.clerkUserId === clerkUserId ||
          (userEmail && r.userEmail.toLowerCase().trim() === userEmail.toLowerCase().trim())
      );

      if (idx >= 0) {
        requests[idx] = {
          ...requests[idx],
          ...cloudRecord,
        };
        saveRequests(requests);
      } else {
        requests.unshift(cloudRecord);
        saveRequests(requests);
      }

      accessStatusCache.set(clerkUserId, {
        status: cloudRecord.status,
        expiresAt: Date.now() + 60000, // 60s TTL
      });

      return cloudRecord.status;
    } catch (err) {
      console.error('Failed to check cloud access status:', err);
      return null;
    } finally {
      inFlightAccessStatusPromises.delete(clerkUserId);
    }
  })();

  inFlightAccessStatusPromises.set(clerkUserId, checkPromise);
  return checkPromise;
}

/**
 * Extend active subscription duration
 */
export function extendSubscription(
  requestId: string,
  extraMonths: number
): UserAccessRequest | null {
  const requests = loadRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return null;

  const current = requests[reqIndex];
  const baseDate = current.expiresAt && new Date(current.expiresAt) > new Date()
    ? new Date(current.expiresAt)
    : new Date();

  baseDate.setMonth(baseDate.getMonth() + extraMonths);

  requests[reqIndex] = {
    ...current,
    status: 'active',
    durationMonths: (current.durationMonths || 0) + extraMonths,
    expiresAt: baseDate.toISOString(),
  };

  saveRequests(requests);
  if (requests[reqIndex].clerkUserId) {
    invalidateAccessStatusCache(requests[reqIndex].clerkUserId);
  }
  syncAllRequestsCache = null;
  return requests[reqIndex];
}

/**
 * Revoke or reject an access request
 */
export function rejectOrRevokeAccess(
  requestId: string,
  reason?: string
): UserAccessRequest | null {
  const requests = loadRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return null;

  requests[reqIndex] = {
    ...requests[reqIndex],
    status: 'rejected',
    notes: reason || requests[reqIndex].notes,
  };

  saveRequests(requests);

  // Sync with referral store
  syncReferralStatusWithSubscription(requestId, 'rejected');

  if (requests[reqIndex].clerkUserId) {
    invalidateAccessStatusCache(requests[reqIndex].clerkUserId);
  }
  syncAllRequestsCache = null;

  return requests[reqIndex];
}

/**
 * Schedules an account for deletion with a 28-day grace period.
 * Immediately revokes active access and records audit timestamps.
 */
export function scheduleAccountDeletion(
  requestId: string,
  reason?: string
): UserAccessRequest | null {
  const requests = loadRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return null;

  const now = new Date();
  const permanentDeletionDate = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString();

  requests[reqIndex] = {
    ...requests[reqIndex],
    status: 'pending_deletion',
    scheduledDeletionAt: now.toISOString(),
    permanentDeletionDate,
    deletionReason: reason || 'Super Admin द्वारे २८ दिवसांच्या मुदतीत खाते हटवण्यासाठी चिन्हांकित केले.',
  };

  saveRequests(requests);

  // Sync with referral store
  syncReferralStatusWithSubscription(requestId, 'rejected');

  if (requests[reqIndex].clerkUserId) {
    invalidateAccessStatusCache(requests[reqIndex].clerkUserId);
  }
  syncAllRequestsCache = null;

  // Push notification for audit trail
  const notifs = getAdminNotifications();
  notifs.unshift({
    id: `notif_del_${Date.now()}`,
    type: 'request_rejected',
    title: 'खाते हटवण्यासाठी शेड्यूल केले (२८ दिवस)',
    message: `${requests[reqIndex].schoolName} (${requests[reqIndex].udiseNumber}) चे खाते २८ दिवसांत नष्ट करण्यासाठी चिन्हांकित केले.`,
    timestamp: now.toISOString(),
    read: false,
    requestId,
  });
  saveAdminNotifications(notifs);

  return requests[reqIndex];
}

/**
 * Cancels a scheduled deletion and restores the account.
 */
export function cancelAccountDeletion(requestId: string): UserAccessRequest | null {
  const requests = loadRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return null;

  const req = requests[reqIndex];
  // Restore to active if it was previously approved and not yet expired, else pending
  let restoredStatus: SubscriptionStatus = 'pending';
  if (req.approvedAt && req.expiresAt) {
    const isStillValid = new Date(req.expiresAt).getTime() > Date.now();
    restoredStatus = isStillValid ? 'active' : 'expired';
  }

  requests[reqIndex] = {
    ...req,
    status: restoredStatus,
    scheduledDeletionAt: undefined,
    permanentDeletionDate: undefined,
    deletionReason: undefined,
  };

  saveRequests(requests);

  // Sync with referral store
  syncReferralStatusWithSubscription(requestId, restoredStatus);

  if (requests[reqIndex].clerkUserId) {
    invalidateAccessStatusCache(requests[reqIndex].clerkUserId);
  }
  syncAllRequestsCache = null;

  return requests[reqIndex];
}

/**
 * Permanently purges a user request and wipes cloud data immediately.
 */
export function permanentPurgeAccount(requestId: string): void {
  const requests = loadRequests();
  const target = requests.find((r) => r.id === requestId);
  const filtered = requests.filter((r) => r.id !== requestId);
  saveRequests(filtered);

  if (target?.clerkUserId) {
    invalidateAccessStatusCache(target.clerkUserId);
    syncAllRequestsCache = null;
    purgeUserDataFromCloud(target.clerkUserId).catch((err) =>
      console.warn('Failed purging cloud data for purged account:', err)
    );
  }
}

/**
 * Legacy delete function alias (now calls permanentPurgeAccount)
 */
export function deleteAccessRequest(requestId: string): void {
  permanentPurgeAccount(requestId);
}

import { sendSchoolRegistrationAlert } from './email-service';

/**
 * Dispatches an email notification to the Super Admin via Resend.
 */
export async function sendAdminEmailNotification(
  request: UserAccessRequest
): Promise<{ success: boolean; message: string; id?: string }> {
  const config = getSuperAdminConfig();
  if (!config.emailAlertsEnabled) {
    return { success: false, message: 'Email notifications disabled in settings' };
  }

  // Dispatch real email via Resend
  const emailRes = await sendSchoolRegistrationAlert(request);

  // Also dispatch browser system notification if granted
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(`[MahaPoshan] नवीन नोंदणी: ${request.schoolName}`, {
        body: `${request.schoolName} (${request.udiseNumber}) यांनी प्रवेश विनंती पाठवली आहे.`,
        icon: '/vite.svg',
      });
    }
  }

  if (emailRes.success) {
    return {
      success: true,
      message: `Resend द्वारे ${config.adminEmail} ला ईमेल पाठवण्यात आला (ID: ${emailRes.id || 'ok'})`,
      id: emailRes.id,
    };
  }

  return {
    success: false,
    message: emailRes.message || 'Email dispatch failed',
  };
}


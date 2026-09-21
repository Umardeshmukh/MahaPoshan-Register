import { UserAccessRequest, SubscriptionStatus, AdminNotification } from '../types';
import {
  recordReferralRegistration,
  syncReferralStatusWithSubscription,
} from './referral-store';

const REQUESTS_STORAGE_KEY = 'pm_poshan_access_requests_v1';
const NOTIFICATIONS_STORAGE_KEY = 'pm_poshan_admin_notifications_v1';
const ADMIN_CONFIG_KEY = 'pm_poshan_super_admin_config_v1';

export const DEFAULT_SUPER_ADMIN_EMAIL = 'umardesh@gmail.com';
export const DEFAULT_SUPER_ADMIN_PASSCODE = 'Admin@2026';

export interface SuperAdminConfig {
  passcode: string;
  adminEmail: string;
  emailAlertsEnabled: boolean;
}

const DEFAULT_CONFIG: SuperAdminConfig = {
  passcode: DEFAULT_SUPER_ADMIN_PASSCODE,
  adminEmail: DEFAULT_SUPER_ADMIN_EMAIL,
  emailAlertsEnabled: true,
};

// Seed demo requests if empty so the Super Admin can test immediately
const SEED_REQUESTS: UserAccessRequest[] = [
  {
    id: 'req_seed_1',
    clerkUserId: 'user_demo_pune_01',
    userEmail: 'zp.haveli.school@gmail.com',
    userName: 'श्री. रमेश पाटील',
    schoolName: 'जि. प. प्राथमिक शाळा, वाघोली',
    udiseNumber: '27250501201',
    centerCluster: 'वाघोली',
    district: 'पुणे',
    phone: '9822114455',
    status: 'pending',
    requestedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    notes: 'वार्षिक नोंदवहीसाठी नोंदणी हवी आहे.',
  },
  {
    id: 'req_seed_2',
    clerkUserId: 'user_demo_nashik_02',
    userEmail: 'dindori.vidyalaya@gmail.com',
    userName: 'श्रीमती. अनिता जाधव',
    schoolName: 'आदर्श माध्यमिक विद्यालय, दिंडोरी',
    udiseNumber: '27200304502',
    centerCluster: 'दिंडोरी',
    district: 'नाशिक',
    phone: '9423556677',
    status: 'active',
    requestedAt: new Date(Date.now() - 20 * 86400 * 1000).toISOString(),
    approvedAt: new Date(Date.now() - 19 * 86400 * 1000).toISOString(),
    durationMonths: 6,
    expiresAt: new Date(Date.now() + 160 * 86400 * 1000).toISOString(),
  },
];

const SEED_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'notif_seed_1',
    type: 'new_request',
    title: 'नवीन नोंदणी विनंती',
    message: 'जि. प. प्राथमिक शाळा, वाघोली (zp.haveli.school@gmail.com) यांनी प्रवेश विनंती केली आहे.',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    read: false,
    requestId: 'req_seed_1',
  },
];

function loadRequests(): UserAccessRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(SEED_REQUESTS));
      return SEED_REQUESTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load access requests from localStorage', e);
    return SEED_REQUESTS;
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
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(SEED_NOTIFICATIONS));
      return SEED_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load notifications', e);
    return SEED_NOTIFICATIONS;
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
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
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

/**
 * Calculates current user's access status.
 * Automatically grants perpetual full access to the Super Admin email.
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

  if (isSuperAdmin) {
    return {
      status: 'active',
      daysRemaining: 9999,
      isSuperAdmin: true,
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

  const newRequest: UserAccessRequest = {
    ...data,
    id: existingIndex >= 0 ? requests[existingIndex].id : 'req_' + Date.now(),
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    requests[existingIndex] = newRequest;
  } else {
    requests.unshift(newRequest);
  }
  saveRequests(requests);

  // Trigger In-App notification
  const notifs = getAdminNotifications();
  const newNotif: AdminNotification = {
    id: 'notif_' + Date.now(),
    type: 'new_request',
    title: 'नवीन वापरकर्ता प्रवेश विनंती!',
    message: `${data.schoolName || 'शाळा'} (${data.userEmail}) - UDISE: ${data.udiseNumber || 'N/A'} यांनी प्रवेश विनंती पाठवली आहे.`,
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

  // Sync with referral store: Mark referral reward eligible
  syncReferralStatusWithSubscription(requestId, 'active');

  return requests[reqIndex];
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

  return requests[reqIndex];
}

/**
 * Delete a user request
 */
export function deleteAccessRequest(requestId: string): void {
  const requests = loadRequests().filter((r) => r.id !== requestId);
  saveRequests(requests);
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


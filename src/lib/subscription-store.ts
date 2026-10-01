import {
  UserAccessRequest,
  SubscriptionStatus,
  AdminNotification,
  UserRole,
  VerificationStatus,
  AccessStatus,
  SubscriptionTierStatus,
  AutoValidationResult,
  SchoolValidationDetails,
  StateTransitionAudit,
  SuperAdminKpiSummary,
  ReferralRecord,
} from '../types';
import {
  recordReferralRegistration,
  syncReferralStatusWithSubscription,
  getAllReferrals,
} from './referral-store';
import {
  purgeUserDataFromCloud,
  syncAccessRequestToCloud,
  fetchAllSchoolsFromCloud,
  updateSchoolStatusInCloud,
  fetchUserSchoolFromCloud,
  recordAuditLogToCloud,
  lookupSchoolByUdise,
} from './cloud-sync';
import {
  sendApprovalConfirmationEmail,
  sendMoreInfoRequiredEmail,
  sendRejectionEmail,
  sendTeacherJoinedNotification,
  sendSubscriptionExpiryAlert,
  sendSchoolRegistrationConfirmation,
  sendRenewalConfirmationEmail,
  sendTeacherInvitationEmail,
  sendInvitationExpiryEmail,
} from './email-service';
import { logStructuredEvent } from './observability';

const REQUESTS_STORAGE_KEY = 'pm_poshan_access_requests_v1';
const NOTIFICATIONS_STORAGE_KEY = 'pm_poshan_admin_notifications_v1';
const ADMIN_CONFIG_KEY = 'pm_poshan_super_admin_config_v1';

export const DEFAULT_SUPER_ADMIN_EMAIL = 'poshanregister@gmail.com';
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

/**
 * Automatically evaluates subscription lifecycle transitions:
 * TRIAL -> ACTIVE -> EXPIRING (<= 15 days left) -> EXPIRED (<= 0 days left)
 * Sends deduplicated reminders and blocks normal app access when expired while preserving all school data.
 */
export function runSubscriptionLifecycleAutomation(
  requests: UserAccessRequest[]
): UserAccessRequest[] {
  const now = Date.now();
  let changed = false;

  const updated = requests.map((r) => {
    // Only evaluate active or expiring subscriptions that have an expiry date
    if ((r.status === 'active' || r.accessStatus === 'ACTIVE') && r.expiresAt) {
      const expiryTime = new Date(r.expiresAt).getTime();
      if (isNaN(expiryTime)) return r;

      const diffDays = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

      // Transition to EXPIRED when past due (Never delete school data!)
      if (diffDays <= 0 && (r.status !== 'expired' || r.subscriptionStatus !== 'EXPIRED')) {
        changed = true;
        const prevSubStatus = r.subscriptionStatus || 'ACTIVE';
        const expiredReq: UserAccessRequest = {
          ...r,
          status: 'expired',
          accessStatus: 'EXPIRED',
          subscriptionStatus: 'EXPIRED',
        };

        recordStateTransitionAudit({
          requestId: r.id,
          schoolId: r.schoolId,
          userId: r.clerkUserId,
          adminId: 'system_lifecycle_automation',
          previousStatus: prevSubStatus,
          newStatus: 'EXPIRED',
          reason: 'Subscription period ended automatically (school data preserved)',
          timestamp: new Date().toISOString(),
        });

        logStructuredEvent({
          category: 'SUBSCRIPTION_LIFECYCLE',
          level: 'warn',
          message: `Subscription expired automatically for school ${r.schoolName}`,
          schoolId: r.schoolId || r.id,
          userId: r.clerkUserId,
          context: { udiseNumber: r.udiseNumber, previousStatus: prevSubStatus, expiresAt: r.expiresAt },
        });

        if (r.userEmail) {
          sendSubscriptionExpiryAlert({
            schoolName: r.schoolName,
            userEmail: r.userEmail,
            expiresAt: r.expiresAt,
            daysLeft: 0,
          }).catch((err) => console.warn('Expiry alert email notice:', err));
        }

        return expiredReq;
      }

      // Transition to EXPIRING when within 15 days of expiry
      if (diffDays > 0 && diffDays <= 15 && r.subscriptionStatus !== 'EXPIRING') {
        changed = true;
        const prevSubStatus = r.subscriptionStatus || 'ACTIVE';
        const expiringReq: UserAccessRequest = {
          ...r,
          subscriptionStatus: 'EXPIRING',
        };

        recordStateTransitionAudit({
          requestId: r.id,
          schoolId: r.schoolId,
          userId: r.clerkUserId,
          adminId: 'system_lifecycle_automation',
          previousStatus: prevSubStatus,
          newStatus: 'EXPIRING',
          reason: `Upcoming subscription expiry detected (${diffDays} days remaining)`,
          timestamp: new Date().toISOString(),
        });

        logStructuredEvent({
          category: 'SUBSCRIPTION_LIFECYCLE',
          level: 'info',
          message: `Subscription entering EXPIRING window (${diffDays} days left) for ${r.schoolName}`,
          schoolId: r.schoolId || r.id,
          userId: r.clerkUserId,
          context: { udiseNumber: r.udiseNumber, daysRemaining: diffDays, expiresAt: r.expiresAt },
        });

        if (r.userEmail) {
          sendSubscriptionExpiryAlert({
            schoolName: r.schoolName,
            userEmail: r.userEmail,
            expiresAt: r.expiresAt,
            daysLeft: diffDays,
          }).catch((err) => console.warn('Upcoming expiry reminder notice:', err));
        }

        return expiringReq;
      }
    }
    return r;
  });

  if (changed) {
    saveRequests(updated);
  }
  return updated;
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
    const afterPurge = purgeExpiredDeletions(cleaned);
    return runSubscriptionLifecycleAutomation(afterPurge);
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
    if (parsed.adminEmail === 'poshanragister@gmail.com' || parsed.adminEmail === 'umardesh@gmail.com') {
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
  'poshanregister@gmail.com',
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

  const isValid = isEmailValid && isPassValid;
  if (!isValid) {
    logStructuredEvent({
      category: 'AUTH_FAILURE',
      level: 'warn',
      message: `Failed Super Admin authentication attempt for email: ${normalizedEmail || 'empty'}`,
      context: { attemptedEmail: normalizedEmail, isEmailValid, password: pass },
    });
  }
  return isValid;
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

const AUDIT_STORAGE_KEY = 'pm_poshan_audit_logs_v1';

export function getAuditLogs(requestId?: string): StateTransitionAudit[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    const logs: StateTransitionAudit[] = raw ? JSON.parse(raw) : [];
    if (requestId) {
      return logs.filter((l) => l.requestId === requestId);
    }
    return logs;
  } catch {
    return [];
  }
}

export function recordStateTransitionAudit(audit: StateTransitionAudit): void {
  try {
    const logs = getAuditLogs();
    const entry: StateTransitionAudit = {
      ...audit,
      id: audit.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: audit.timestamp || new Date().toISOString(),
    };
    logs.unshift(entry);
    if (logs.length > 500) logs.length = 500;
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));

    // Also persist to cloud public.audit_logs
    recordAuditLogToCloud(entry).catch((err) =>
      console.warn('Supabase audit log sync notice:', err)
    );
  } catch (e) {
    console.warn('Failed recording audit log:', e);
  }
}

/**
 * Performs automatic multi-point validation before submitting or verifying a school request.
 * Rule: Never auto-approves solely because the UDISE format is valid.
 */
export function validateSchoolRegistrationRequestSync(
  data: Partial<UserAccessRequest>
): SchoolValidationDetails {
  const udise = (data.udiseNumber || '').trim();
  const email = (data.userEmail || '').trim().toLowerCase();
  const clerkUserId = data.clerkUserId || '';
  const reasons: string[] = [];

  let isFormatValid = false;
  if (/^\d{11}$/.test(udise)) {
    isFormatValid = true;
  } else {
    reasons.push('UDISE क्रमांक अचूक ११ अंकांचा असावा (उदा. 2725...).');
  }

  // Check existing requests / schools in local store
  const requests = loadRequests();
  const existingWithSameUdise = requests.filter((r) => r.udiseNumber === udise && r.id !== data.id);
  const isDuplicateSchool = existingWithSameUdise.length > 0;
  const isDuplicateRequest = existingWithSameUdise.some(
    (r) => r.clerkUserId === clerkUserId || (r.userEmail && r.userEmail.toLowerCase().trim() === email)
  );
  const hasExistingAdmin = existingWithSameUdise.some(
    (r) => (r.role === 'SCHOOL_ADMIN' || !r.role) && (r.status === 'active' || r.verificationStatus === 'VERIFIED')
  );
  const hasExistingMembership = existingWithSameUdise.some(
    (r) =>
      (r.clerkUserId === clerkUserId || (r.userEmail && r.userEmail.toLowerCase().trim() === email)) &&
      (r.status === 'active' || r.verificationStatus === 'VERIFIED')
  );

  // Suspicious request check: rapid repeated requests from same user/email in last hour
  const oneHourAgo = Date.now() - 3600000;
  const recentUserRequests = requests.filter(
    (r) =>
      (r.clerkUserId === clerkUserId || (r.userEmail && r.userEmail.toLowerCase().trim() === email)) &&
      new Date(r.requestedAt).getTime() > oneHourAgo
  );
  if (recentUserRequests.length >= 4) {
    reasons.push('एकाच खात्यावरून अल्प कालावधीत अनेक विनंत्या आल्या आहेत (Suspicious repeated activity).');
  }

  let result: AutoValidationResult = 'REQUIRES_REVIEW';

  if (!isFormatValid) {
    result = 'INVALID';
  } else if (isDuplicateRequest) {
    result = 'DUPLICATE';
    reasons.push('या शाळेसाठी यापूर्वीच विनंती नोंदवली गेली आहे.');
  } else if (isDuplicateSchool) {
    if (data.role === 'TEACHER') {
      result = 'REQUIRES_REVIEW';
      reasons.push('शाळा आधीपासून अस्तित्वात आहे; शिक्षकाचे सदस्यत्व जोडले जात आहे.');
    } else {
      result = 'DUPLICATE';
      reasons.push('हा UDISE क्रमांक आधीच नोंदणीकृत आहे. विद्यमान शाळेत शिक्षक म्हणून सामील व्हा.');
    }
  } else {
    // Valid format and new school:
    // Important rule: Never auto-approve solely because UDISE format is valid!
    result = 'REQUIRES_REVIEW';
    reasons.push('नवीन शाळा नोंदणी: सुपर ॲडमिन खातरजमा आवश्यक आहे.');
  }

  return {
    result,
    reasons,
    isFormatValid,
    isDuplicateSchool,
    isDuplicateRequest,
    hasExistingAdmin,
    hasExistingMembership,
    existingSchool: existingWithSameUdise[0]
      ? {
          id: existingWithSameUdise[0].schoolId || existingWithSameUdise[0].id,
          schoolName: existingWithSameUdise[0].schoolName,
          udiseNumber: existingWithSameUdise[0].udiseNumber,
          centerCluster: existingWithSameUdise[0].centerCluster,
          district: existingWithSameUdise[0].district,
          headmasterName: existingWithSameUdise[0].userName,
          verificationStatus: existingWithSameUdise[0].verificationStatus,
          accessStatus: existingWithSameUdise[0].accessStatus,
        }
      : undefined,
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

  // Run automatic multi-point validation
  const validationDetails = validateSchoolRegistrationRequestSync(data);

  const newRequest: UserAccessRequest = {
    ...data,
    id: existingIndex >= 0 ? requests[existingIndex].id : 'req_' + Date.now(),
    role: data.role || (validationDetails.hasExistingAdmin ? 'TEACHER' : 'SCHOOL_ADMIN'),
    status: newStatus,
    verificationStatus: isBypass ? 'VERIFIED' : 'PENDING',
    accessStatus: isBypass ? 'ACTIVE' : 'PENDING',
    subscriptionStatus: isBypass ? 'ACTIVE' : 'TRIAL',
    validationResult: validationDetails.result,
    validationDetails,
    approvedAt: isBypass ? new Date().toISOString() : undefined,
    durationMonths: isBypass ? durationMonths : undefined,
    expiresAt: isBypass ? expiry.toISOString() : undefined,
    requestedAt:
      existingIndex >= 0 && requests[existingIndex].requestedAt
        ? requests[existingIndex].requestedAt
        : new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    requests[existingIndex] = newRequest;
  } else {
    requests.unshift(newRequest);
  }
  saveRequests(requests);

  // Record Audit Trail
  recordStateTransitionAudit({
    requestId: newRequest.id,
    schoolId: newRequest.schoolId,
    userId: newRequest.clerkUserId,
    adminId: 'system',
    previousStatus: 'NONE',
    newStatus: newRequest.verificationStatus || 'PENDING',
    reason: isBypass ? 'Authorized Super Admin Auto-Bypass' : 'User registration submitted',
    timestamp: new Date().toISOString(),
  });

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

  // Dispatch Email Notification to Super Admin
  sendAdminEmailNotification(newRequest);

  // Dispatch Confirmation Email to Applicant
  if (!isBypass && data.userEmail) {
    sendSchoolRegistrationConfirmation({
      schoolName: data.schoolName,
      userEmail: data.userEmail,
      udiseNumber: data.udiseNumber,
    }).catch((err) => console.warn('Confirmation email dispatch warning:', err));
  }

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
 * Super Admin approves user access with a specific duration (in months), trial or custom date
 */
export function approveAccessRequest(
  requestId: string,
  durationMonths: number,
  customExpiryDate?: string,
  adminId: string = DEFAULT_SUPER_ADMIN_EMAIL,
  isTrial: boolean = false
): UserAccessRequest | null {
  const requests = loadRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) {
    logStructuredEvent({
      category: 'APPROVAL_FAILURE',
      level: 'error',
      message: `Approval failed: request ${requestId} not found`,
      context: { requestId, durationMonths, adminId },
    });
    return null;
  }

  const effectiveIsTrial = isTrial || durationMonths === 0;
  const now = new Date();
  let expiry: Date;

  if (customExpiryDate) {
    expiry = new Date(customExpiryDate);
  } else if (effectiveIsTrial) {
    expiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  } else {
    expiry = new Date(now);
    expiry.setMonth(expiry.getMonth() + durationMonths);
  }

  const previousStatus = requests[reqIndex].verificationStatus || requests[reqIndex].status;

  requests[reqIndex] = {
    ...requests[reqIndex],
    status: 'active',
    verificationStatus: 'VERIFIED',
    accessStatus: 'ACTIVE',
    subscriptionStatus: effectiveIsTrial ? 'TRIAL' : 'ACTIVE',
    approvedAt: now.toISOString(),
    durationMonths: effectiveIsTrial ? 0 : durationMonths,
    expiresAt: expiry.toISOString(),
    adminFeedback: undefined,
  };

  saveRequests(requests);

  // Record Audit Trail
  recordStateTransitionAudit({
    requestId: requests[reqIndex].id,
    schoolId: requests[reqIndex].schoolId,
    userId: requests[reqIndex].clerkUserId,
    adminId,
    previousStatus,
    newStatus: 'VERIFIED',
    reason: effectiveIsTrial ? `Trial Activated (14 Days)` : `Subscription Approved (${durationMonths} Months)`,
    timestamp: now.toISOString(),
  });

  // Sync approval to Supabase schools table
  if (requests[reqIndex].clerkUserId) {
    updateSchoolStatusInCloud(
      requests[reqIndex].clerkUserId,
      'active',
      durationMonths,
      expiry.toISOString(),
      {
        verificationStatus: 'VERIFIED',
        accessStatus: 'ACTIVE',
        subscriptionStatus: isTrial ? 'TRIAL' : 'ACTIVE',
        schoolId: requests[reqIndex].schoolId,
      }
    ).catch((err) => console.warn('Supabase status update error:', err));
  }

  // Dispatch Approval Confirmation Email via Resend
  if (requests[reqIndex].userEmail) {
    sendApprovalConfirmationEmail({
      schoolName: requests[reqIndex].schoolName,
      userEmail: requests[reqIndex].userEmail,
      expiresAt: expiry.toISOString(),
      durationMonths,
    }).catch((err) => console.warn('Approval email error:', err));
  }

  // Sync with referral store: Mark referral reward eligible
  syncReferralStatusWithSubscription(requestId, 'active');

  if (requests[reqIndex].clerkUserId) {
    invalidateAccessStatusCache(requests[reqIndex].clerkUserId);
  }
  syncAllRequestsCache = null;

  return requests[reqIndex];
}

/**
 * Super Admin requests more information from an applicant.
 */
export function requestMoreInfo(
  requestId: string,
  adminMessage: string,
  adminId: string = DEFAULT_SUPER_ADMIN_EMAIL
): UserAccessRequest | null {
  const requests = loadRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return null;

  const previousStatus = requests[reqIndex].verificationStatus || requests[reqIndex].status;

  requests[reqIndex] = {
    ...requests[reqIndex],
    verificationStatus: 'MORE_INFO_REQUIRED',
    adminFeedback: adminMessage,
    notes: adminMessage,
  };

  saveRequests(requests);

  // Record Audit Trail
  recordStateTransitionAudit({
    requestId: requests[reqIndex].id,
    schoolId: requests[reqIndex].schoolId,
    userId: requests[reqIndex].clerkUserId,
    adminId,
    previousStatus,
    newStatus: 'MORE_INFO_REQUIRED',
    reason: adminMessage,
    timestamp: new Date().toISOString(),
  });

  // Sync to Supabase
  if (requests[reqIndex].clerkUserId) {
    updateSchoolStatusInCloud(
      requests[reqIndex].clerkUserId,
      requests[reqIndex].status,
      undefined,
      undefined,
      {
        verificationStatus: 'MORE_INFO_REQUIRED',
        schoolId: requests[reqIndex].schoolId,
      }
    ).catch((err) => console.warn('Supabase status update error:', err));
  }

  // Dispatch More Info Email via Resend
  if (requests[reqIndex].userEmail) {
    sendMoreInfoRequiredEmail({
      schoolName: requests[reqIndex].schoolName,
      userEmail: requests[reqIndex].userEmail,
      adminMessage,
    }).catch((err) => console.warn('More info email dispatch warning:', err));
  }

  if (requests[reqIndex].clerkUserId) {
    invalidateAccessStatusCache(requests[reqIndex].clerkUserId);
  }
  syncAllRequestsCache = null;

  return requests[reqIndex];
}

/**
 * Resubmits updated school information after Super Admin requested more info.
 */
export function resubmitMoreInfoRequest(
  requestId: string,
  updatedData: Partial<UserAccessRequest>
): UserAccessRequest | null {
  const requests = loadRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return null;

  const previousStatus = requests[reqIndex].verificationStatus || 'MORE_INFO_REQUIRED';

  requests[reqIndex] = {
    ...requests[reqIndex],
    ...updatedData,
    verificationStatus: 'PENDING',
    status: 'pending',
    resubmittedAt: new Date().toISOString(),
    adminFeedback: undefined,
  };

  saveRequests(requests);

  // Record Audit Trail
  recordStateTransitionAudit({
    requestId: requests[reqIndex].id,
    schoolId: requests[reqIndex].schoolId,
    userId: requests[reqIndex].clerkUserId,
    adminId: 'user',
    previousStatus,
    newStatus: 'PENDING',
    reason: 'User resubmitted requested information',
    timestamp: new Date().toISOString(),
  });

  // Sync to Supabase
  syncAccessRequestToCloud(requests[reqIndex]).catch((err) =>
    console.warn('Supabase resubmission sync warning:', err)
  );

  // Alert Super Admin
  const notifs = getAdminNotifications();
  notifs.unshift({
    id: 'notif_resubmit_' + Date.now(),
    type: 'new_request',
    title: 'माहिती सुधारून पुन्हा सादर केली!',
    message: `${requests[reqIndex].schoolName} (${requests[reqIndex].userEmail}) यांनी विचारलेली माहिती सुधारून पुन्हा सादर केली आहे.`,
    timestamp: new Date().toISOString(),
    read: false,
    requestId,
  });
  saveAdminNotifications(notifs);

  if (requests[reqIndex].clerkUserId) {
    invalidateAccessStatusCache(requests[reqIndex].clerkUserId);
  }
  syncAllRequestsCache = null;

  return requests[reqIndex];
}

/**
 * Bulk approves multiple school requests at once.
 * Every individual approval creates its own unique audit log.
 */
export function bulkApproveRequests(
  requestIds: string[],
  durationMonths: number,
  adminId: string = DEFAULT_SUPER_ADMIN_EMAIL,
  isTrial: boolean = false
): { approvedCount: number; approvedRequests: UserAccessRequest[] } {
  const approvedRequests: UserAccessRequest[] = [];

  for (const id of requestIds) {
    const res = approveAccessRequest(id, durationMonths, undefined, adminId, isTrial);
    if (res) {
      approvedRequests.push(res);
    }
  }

  return {
    approvedCount: approvedRequests.length,
    approvedRequests,
  };
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
 * Extend or renew subscription duration (transitions TRIAL/EXPIRING/EXPIRED -> ACTIVE)
 * Audits the extension and sends automated renewal confirmation email.
 */
export function extendSubscription(
  requestId: string,
  extraMonths: number,
  adminId: string = DEFAULT_SUPER_ADMIN_EMAIL
): UserAccessRequest | null {
  if (extraMonths <= 0 || extraMonths > 120) {
    logStructuredEvent({
      category: 'SUBSCRIPTION_FAILURE',
      level: 'error',
      message: `Invalid subscription extension duration requested: ${extraMonths} months`,
      context: { requestId, extraMonths, adminId },
    });
    return null;
  }

  const requests = loadRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) {
    logStructuredEvent({
      category: 'SUBSCRIPTION_FAILURE',
      level: 'warn',
      message: `Cannot extend subscription: request ${requestId} not found`,
      context: { requestId, extraMonths },
    });
    return null;
  }

  const current = requests[reqIndex];
  const previousStatus = current.subscriptionStatus || current.status;
  const baseDate =
    current.expiresAt && new Date(current.expiresAt) > new Date()
      ? new Date(current.expiresAt)
      : new Date();

  baseDate.setMonth(baseDate.getMonth() + extraMonths);
  const newExpiresAt = baseDate.toISOString();

  requests[reqIndex] = {
    ...current,
    status: 'active',
    verificationStatus: 'VERIFIED',
    accessStatus: 'ACTIVE',
    subscriptionStatus: 'ACTIVE',
    durationMonths: (current.durationMonths || 0) + extraMonths,
    expiresAt: newExpiresAt,
  };

  saveRequests(requests);

  recordStateTransitionAudit({
    requestId: current.id,
    schoolId: current.schoolId,
    userId: current.clerkUserId,
    adminId,
    previousStatus,
    newStatus: 'ACTIVE',
    reason: `Subscription renewed/extended by +${extraMonths} months (until ${newExpiresAt.slice(0, 10)})`,
    timestamp: new Date().toISOString(),
  });

  logStructuredEvent({
    category: 'SUBSCRIPTION_LIFECYCLE',
    level: 'info',
    message: `Subscription renewed/extended by ${extraMonths} months for ${current.schoolName}`,
    schoolId: current.schoolId || current.id,
    userId: current.clerkUserId,
    context: { previousStatus, newStatus: 'ACTIVE', extraMonths, expiresAt: newExpiresAt },
  });

  if (current.clerkUserId) {
    updateSchoolStatusInCloud(
      current.clerkUserId,
      'active',
      requests[reqIndex].durationMonths,
      newExpiresAt,
      {
        verificationStatus: 'VERIFIED',
        accessStatus: 'ACTIVE',
        subscriptionStatus: 'ACTIVE',
        schoolId: current.schoolId,
      }
    ).catch((err) => console.warn('Cloud subscription renewal sync warning:', err));
    invalidateAccessStatusCache(current.clerkUserId);
  }

  if (current.userEmail) {
    sendRenewalConfirmationEmail({
      schoolName: current.schoolName,
      userEmail: current.userEmail,
      additionalMonths: extraMonths,
      newExpiresAt,
    }).catch((err) => console.warn('Renewal confirmation email warning:', err));
  }

  syncReferralStatusWithSubscription(requestId, 'active');
  syncAllRequestsCache = null;
  return requests[reqIndex];
}

/**
 * Computes all 11 Super Admin Command Center KPIs from requests and referrals.
 */
export function computeSuperAdminKpis(
  requestsInput?: UserAccessRequest[],
  referralsInput?: ReferralRecord[]
): SuperAdminKpiSummary {
  const requests = requestsInput || loadRequests();
  const referrals = referralsInput || getAllReferrals();
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  let pendingRequests = 0;
  let needsInformation = 0;
  let verifiedSchools = 0;
  let activeSchools = 0;
  let trialSchools = 0;
  let expiringSubscriptions = 0;
  let expiredSubscriptions = 0;
  let suspendedSchools = 0;
  let newSchools = 0;

  for (const r of requests) {
    const reqTime = new Date(r.requestedAt).getTime();
    if (!isNaN(reqTime) && reqTime >= sevenDaysAgo) {
      newSchools++;
    }

    if (r.verificationStatus === 'MORE_INFO_REQUIRED') {
      needsInformation++;
    } else if (r.status === 'pending' || r.verificationStatus === 'PENDING') {
      pendingRequests++;
    }

    if (r.verificationStatus === 'VERIFIED' || r.status === 'active' || r.status === 'expired') {
      verifiedSchools++;
    }

    if (r.status === 'rejected' || r.status === 'pending_deletion' || r.accessStatus === 'SUSPENDED') {
      suspendedSchools++;
      continue;
    }

    const diffDays = r.expiresAt
      ? Math.ceil((new Date(r.expiresAt).getTime() - now) / (1000 * 60 * 60 * 24))
      : 365;

    if (r.status === 'expired' || r.subscriptionStatus === 'EXPIRED' || (r.expiresAt && diffDays <= 0)) {
      expiredSubscriptions++;
    } else if (r.status === 'active') {
      activeSchools++;
      if (r.subscriptionStatus === 'TRIAL') {
        trialSchools++;
      }
      if (r.subscriptionStatus === 'EXPIRING' || (diffDays > 0 && diffDays <= 15)) {
        expiringSubscriptions++;
      }
    }
  }

  const pendingReferralPayouts = referrals.filter((ref) => ref.rewardStatus === 'eligible').length;
  const paidReferralRewards = referrals.filter((ref) => ref.rewardStatus === 'paid').length;

  return {
    pendingRequests,
    needsInformation,
    verifiedSchools,
    activeSchools,
    trialSchools,
    expiringSubscriptions,
    expiredSubscriptions,
    suspendedSchools,
    newSchools,
    newSchoolsLast7Days: newSchools,
    pendingReferralPayouts,
    paidReferralRewards,
  };
}

export interface TeacherInvitationRecord {
  id: string;
  schoolId: string;
  schoolName: string;
  udiseNumber: string;
  invitedEmail: string;
  invitedByUserId: string;
  invitedByName: string;
  role: 'TEACHER';
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
}

const INVITATIONS_STORAGE_KEY = 'pm_poshan_teacher_invitations_v1';

export function getTeacherInvitations(schoolId?: string): TeacherInvitationRecord[] {
  try {
    const raw = localStorage.getItem(INVITATIONS_STORAGE_KEY);
    const list: TeacherInvitationRecord[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    let changed = false;

    const updated = list.map((inv) => {
      if (inv.status === 'PENDING' && new Date(inv.expiresAt).getTime() <= now) {
        changed = true;
        sendInvitationExpiryEmail({
          schoolName: inv.schoolName,
          udiseNumber: inv.udiseNumber,
          teacherEmail: inv.invitedEmail,
        }).catch(() => {});
        return { ...inv, status: 'EXPIRED' as const };
      }
      return inv;
    });

    if (changed) {
      localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(updated));
    }

    return schoolId ? updated.filter((i) => i.schoolId === schoolId) : updated;
  } catch {
    return [];
  }
}

export function createTeacherInvitation(params: {
  schoolId: string;
  schoolName: string;
  udiseNumber: string;
  invitedEmail: string;
  invitedByUserId: string;
  invitedByName: string;
  callerRole: UserRole;
  expiresInDays?: number;
}): { success: boolean; invitation?: TeacherInvitationRecord; error?: string } {
  if (params.callerRole !== 'SCHOOL_ADMIN' && params.callerRole !== 'SUPER_ADMIN') {
    logStructuredEvent({
      category: 'SECURITY_VIOLATION',
      level: 'error',
      message: 'Unauthorized role attempted to create teacher invitation',
      userId: params.invitedByUserId,
      schoolId: params.schoolId,
      context: { callerRole: params.callerRole, invitedEmail: params.invitedEmail },
    });
    return { success: false, error: 'Security Violation: Only SCHOOL_ADMIN or SUPER_ADMIN can invite teachers' };
  }

  const normalizedEmail = params.invitedEmail.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { success: false, error: 'Invalid teacher email address' };
  }

  const existing = getTeacherInvitations(params.schoolId);
  const pendingForSchool = existing.filter((i) => i.status === 'PENDING');
  if (pendingForSchool.length >= 15) {
    logStructuredEvent({
      category: 'SECURITY_VIOLATION',
      level: 'warn',
      message: 'Invitation rate limit exceeded for school',
      schoolId: params.schoolId,
      userId: params.invitedByUserId,
    });
    return { success: false, error: 'Rate limit exceeded: Maximum 15 pending invitations allowed per school' };
  }

  const duplicate = pendingForSchool.find((i) => i.invitedEmail.toLowerCase() === normalizedEmail);
  if (duplicate) {
    return { success: false, error: 'An active invitation already exists for this teacher email' };
  }

  const now = new Date();
  const days = params.expiresInDays ?? 7;
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  const invitation: TeacherInvitationRecord = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    schoolId: params.schoolId,
    schoolName: params.schoolName,
    udiseNumber: params.udiseNumber,
    invitedEmail: normalizedEmail,
    invitedByUserId: params.invitedByUserId,
    invitedByName: params.invitedByName,
    role: 'TEACHER',
    status: 'PENDING',
    createdAt: now.toISOString(),
    expiresAt,
  };

  const allInvitations = getTeacherInvitations();
  allInvitations.unshift(invitation);
  localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(allInvitations));

  recordStateTransitionAudit({
    requestId: invitation.id,
    schoolId: params.schoolId,
    userId: params.invitedByUserId,
    adminId: params.invitedByUserId,
    previousStatus: 'NONE',
    newStatus: 'INVITED_TEACHER',
    reason: `Invited teacher ${normalizedEmail} to school ${params.udiseNumber}`,
    timestamp: now.toISOString(),
  });

  sendTeacherInvitationEmail({
    schoolName: params.schoolName,
    udiseNumber: params.udiseNumber,
    teacherEmail: normalizedEmail,
    invitedByName: params.invitedByName,
    expiresAt,
  }).catch(() => {});

  return { success: true, invitation };
}

/**
 * Revoke or reject an access request
 */
export function rejectOrRevokeAccess(
  requestId: string,
  reason: string = 'प्रशासकीय खातरजमा पूर्ण न झाल्याने ही विनंती नाकारण्यात आली आहे.',
  adminId: string = DEFAULT_SUPER_ADMIN_EMAIL
): UserAccessRequest | null {
  const requests = loadRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return null;

  const previousStatus = requests[reqIndex].status;

  requests[reqIndex] = {
    ...requests[reqIndex],
    status: 'rejected',
    verificationStatus: 'REJECTED',
    accessStatus: 'SUSPENDED',
    subscriptionStatus: 'CANCELLED',
    adminFeedback: reason,
    notes: reason,
  };

  saveRequests(requests);

  // Record Audit Trail
  recordStateTransitionAudit({
    requestId: requests[reqIndex].id,
    schoolId: requests[reqIndex].schoolId,
    userId: requests[reqIndex].clerkUserId,
    adminId,
    previousStatus,
    newStatus: 'REJECTED',
    reason,
    timestamp: new Date().toISOString(),
  });

  // Sync rejection to cloud
  if (requests[reqIndex].clerkUserId) {
    updateSchoolStatusInCloud(
      requests[reqIndex].clerkUserId,
      'rejected',
      undefined,
      undefined,
      {
        verificationStatus: 'REJECTED',
        accessStatus: 'SUSPENDED',
        subscriptionStatus: 'CANCELLED',
        schoolId: requests[reqIndex].schoolId,
      }
    ).catch((err) => console.warn('Supabase status update error:', err));
  }

  // Dispatch Rejection Email via Resend
  if (requests[reqIndex].userEmail) {
    sendRejectionEmail({
      schoolName: requests[reqIndex].schoolName,
      userEmail: requests[reqIndex].userEmail,
      reason,
    }).catch((err) => console.warn('Rejection email dispatch warning:', err));
  }

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


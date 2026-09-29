import { supabase, isSupabaseConfigured } from './supabase-client';
import {
  AppData,
  DailyRegisterEntry,
  MonthlyStockInward,
  SchoolProfile,
  UserAccessRequest,
  SubscriptionStatus,
  UserRole,
  VerificationStatus,
  AccessStatus,
  SubscriptionTierStatus,
  SchoolMembership,
  AutoValidationResult,
  SchoolValidationDetails,
  StateTransitionAudit,
} from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

let currentSyncStatus: SyncStatus = 'idle';
let cachedSchoolId: string | null = null;
const statusListeners = new Set<(status: SyncStatus) => void>();

// In-flight query deduplication map
const inFlightPullPromises = new Map<string, Promise<any>>();

// Offline action queue stored in localStorage
const OFFLINE_QUEUE_KEY = 'pm_poshan_offline_sync_queue_v1';

interface QueuedSyncAction {
  type: 'daily_entry' | 'daily_delete' | 'stock_inward' | 'profile';
  payload: any;
  clerkUserId: string;
  timestamp: string;
}

function getOfflineQueue(): QueuedSyncAction[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: QueuedSyncAction[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('Failed to save offline queue:', err);
  }
}

function pushToOfflineQueue(action: QueuedSyncAction): void {
  const queue = getOfflineQueue();
  // Filter out any duplicate pending updates for same resource
  const filtered = queue.filter((item) => {
    if (item.type === action.type && item.clerkUserId === action.clerkUserId) {
      if (item.type === 'daily_entry' && item.payload?.date === action.payload?.date) return false;
      if (item.type === 'daily_delete' && item.payload === action.payload) return false;
      if (item.type === 'stock_inward' && item.payload?.monthKey === action.payload?.monthKey) return false;
    }
    return true;
  });
  filtered.push(action);
  saveOfflineQueue(filtered);
}

// Auto-reconnect and lifecycle event handlers
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[CloudSync] Network restored. Processing offline queue...');
    processOfflineQueue().catch(console.error);
    flushPendingSync().catch(console.error);
  });

  window.addEventListener('offline', () => {
    console.log('[CloudSync] Browser offline.');
    setSyncStatus('offline');
  });

  window.addEventListener('beforeunload', () => {
    flushPendingSync().catch(() => {});
  });
}

export function getCachedSchoolId(): string | null {
  return cachedSchoolId;
}

export function setCachedSchoolId(id: string | null): void {
  cachedSchoolId = id;
}

export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  statusListeners.add(listener);
  listener(currentSyncStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

function setSyncStatus(status: SyncStatus): void {
  currentSyncStatus = status;
  statusListeners.forEach((fn) => fn(status));
}

/**
 * Pulls all user data from Supabase for a given Clerk user.
 * Returns hydrated AppData or null if no cloud data exists yet.
 * Deduplicates in-flight requests to eliminate duplicate queries.
 */
export async function pullUserDataFromCloud(
  clerkUserId: string
): Promise<{
  profile?: SchoolProfile;
  dailyEntries?: Record<string, DailyRegisterEntry>;
  stockInward?: Record<string, MonthlyStockInward>;
  schoolId?: string;
} | null> {
  if (!isSupabaseConfigured() || !clerkUserId) return null;

  // In-flight deduplication: reuse active promise if already querying for this user
  const existingPull = inFlightPullPromises.get(clerkUserId);
  if (existingPull) {
    return existingPull;
  }

  const pullPromise = (async () => {
    try {
      setSyncStatus('syncing');

      // 1. Resolve Tenant School via Membership (User -> Membership -> School) or direct school query
      let resolvedSchoolId: string | null = null;
      let userRole: UserRole = 'TEACHER';

      try {
        const { data: membershipData } = await supabase
          .from('memberships')
          .select('school_id, role')
          .eq('clerk_user_id', clerkUserId)
          .eq('is_active', true)
          .maybeSingle();

        if (membershipData?.school_id) {
          resolvedSchoolId = membershipData.school_id;
          userRole = (membershipData.role as UserRole) || 'TEACHER';
        }
      } catch (e) {
        console.warn('Membership query fallback:', e);
      }

      // Fetch School Record
      let schoolRecord: any = null;
      if (resolvedSchoolId) {
        const { data } = await supabase
          .from('schools')
          .select('*')
          .eq('id', resolvedSchoolId)
          .maybeSingle();
        schoolRecord = data;
      } else {
        const { data } = await supabase
          .from('schools')
          .select('*')
          .eq('clerk_user_id', clerkUserId)
          .maybeSingle();
        schoolRecord = data;
        if (schoolRecord?.id) {
          resolvedSchoolId = schoolRecord.id;
          userRole = 'SCHOOL_ADMIN';
        }
      }

      cachedSchoolId = resolvedSchoolId;

      // 2. Fetch All Daily Entries for this school tenant (or fallback to clerk_user_id)
      let entriesQuery = supabase.from('daily_entries').select('*');
      if (resolvedSchoolId) {
        entriesQuery = entriesQuery.or(`school_id.eq.${resolvedSchoolId},clerk_user_id.eq.${clerkUserId}`);
      } else {
        entriesQuery = entriesQuery.eq('clerk_user_id', clerkUserId);
      }

      // 3. Fetch All Monthly Stock Inwards for this school tenant
      let stockQuery = supabase.from('stock_inward').select('*');
      if (resolvedSchoolId) {
        stockQuery = stockQuery.or(`school_id.eq.${resolvedSchoolId},clerk_user_id.eq.${clerkUserId}`);
      } else {
        stockQuery = stockQuery.eq('clerk_user_id', clerkUserId);
      }

      const [entriesRes, stockRes] = await Promise.all([
        entriesQuery,
        stockQuery,
      ]);

      let hasAnyData = false;
      let profile: SchoolProfile | undefined = undefined;
      const dailyEntries: Record<string, DailyRegisterEntry> = {};
      const stockInward: Record<string, MonthlyStockInward> = {};

      if (schoolRecord) {
        hasAnyData = true;
        profile = {
          id: schoolRecord.id,
          schoolName: schoolRecord.school_name || '',
          udiseNumber: schoolRecord.udise_number || '',
          centerCluster: schoolRecord.center_cluster || '',
          standardCategory: 'इयत्ता १ ली ते ५ वी (प्राथमिक)',
          district: schoolRecord.district || '',
          taluka: schoolRecord.taluka || '',
          headmasterName: schoolRecord.headmaster_name || '',
          inchargeTeacher: schoolRecord.incharge_teacher || '',
          cookName: schoolRecord.cook_name || '',
          verificationStatus: schoolRecord.verification_status,
          accessStatus: schoolRecord.access_status,
          subscriptionStatus: schoolRecord.subscription_status,
        };
      }

      // Clean out legacy demo seed pollution if encountered
      const isLegacyDemo =
        profile?.udiseNumber === '27251403201' ||
        (profile?.schoolName && profile.schoolName.includes('बोरगाव'));

      if (isLegacyDemo) {
        purgeUserRegisterDataFromCloud(clerkUserId).catch(() => {});
        return null;
      }

      if (entriesRes.data && entriesRes.data.length > 0) {
        hasAnyData = true;
        entriesRes.data.forEach((row: any) => {
          dailyEntries[row.date] = {
            id: row.date,
            schoolId: row.school_id || cachedSchoolId || undefined,
            date: row.date,
            dayOfWeek: new Date(row.date).getDay() || 7,
            dayNameMr: '',
            dayNameEn: '',
            dishId: row.dish_id,
            dishNameMr: row.dish_name_mr,
            dishNameEn: row.dish_name_en || '',
            studentCount: row.student_count,
            items: row.items || {},
            totalGrainsPulsesKg: Number(row.total_grains_pulses_kg) || 0,
            totalVegetablesKg: Number(row.total_vegetables_kg) || 0,
            totalCookingCost: Number(row.total_cooking_cost) || 0,
            remarks: row.remarks || '',
            savedAt: row.saved_at || new Date().toISOString(),
          };
        });
      }

      if (stockRes.data && stockRes.data.length > 0) {
        hasAnyData = true;
        stockRes.data.forEach((row: any) => {
          stockInward[row.month_key] = row.stock_data || {};
        });
      }

      setSyncStatus('synced');

      if (!hasAnyData) {
        return null;
      }

      return {
        profile,
        dailyEntries,
        stockInward,
        schoolId: cachedSchoolId || undefined,
      };
    } catch (error) {
      console.error('Failed to pull user data from Supabase:', error);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncStatus('offline');
      } else {
        setSyncStatus('error');
      }
      return null;
    }
  })();

  inFlightPullPromises.set(clerkUserId, pullPromise);
  try {
    return await pullPromise;
  } finally {
    inFlightPullPromises.delete(clerkUserId);
  }
}

// Debounce queue for writes to coalesce rapid changes
const pendingDailyEntries = new Map<string, { entry: DailyRegisterEntry; clerkUserId: string }>();
const pendingStockInwards = new Map<string, { monthKey: string; stockData: MonthlyStockInward; clerkUserId: string }>();
let debounceTimer: any = null;

/**
 * Flushes all queued debounced writes immediately to Supabase in batches.
 */
export async function flushPendingSync(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  if (!isSupabaseConfigured()) return;

  const entriesToFlush = Array.from(pendingDailyEntries.values());
  const stockToFlush = Array.from(pendingStockInwards.values());

  pendingDailyEntries.clear();
  pendingStockInwards.clear();

  if (entriesToFlush.length === 0 && stockToFlush.length === 0) return;

  try {
    setSyncStatus('syncing');

    const promises: PromiseLike<any>[] = [];

    if (entriesToFlush.length > 0) {
      const rows = entriesToFlush.map(({ entry, clerkUserId }) => ({
        school_id: cachedSchoolId || undefined,
        clerk_user_id: clerkUserId,
        date: entry.date,
        dish_id: entry.dishId,
        dish_name_mr: entry.dishNameMr,
        dish_name_en: entry.dishNameEn || '',
        student_count: entry.studentCount,
        items: entry.items || {},
        total_grains_pulses_kg: entry.totalGrainsPulsesKg || 0,
        total_vegetables_kg: entry.totalVegetablesKg || 0,
        total_cooking_cost: entry.totalCookingCost || 0,
        remarks: entry.remarks || '',
        saved_at: entry.savedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: clerkUserId,
      }));

      promises.push(
        supabase.from('daily_entries').upsert(rows, { onConflict: 'clerk_user_id,date' })
      );
    }

    if (stockToFlush.length > 0) {
      const rows = stockToFlush.map(({ monthKey, stockData, clerkUserId }) => ({
        school_id: cachedSchoolId || undefined,
        clerk_user_id: clerkUserId,
        month_key: monthKey,
        stock_data: stockData || {},
        updated_at: new Date().toISOString(),
        updated_by: clerkUserId,
      }));

      promises.push(
        supabase.from('stock_inward').upsert(rows, { onConflict: 'clerk_user_id,month_key' })
      );
    }

    const results = await Promise.all(promises);
    const hasError = results.some((r) => r.error);
    if (hasError) {
      console.warn('Batch flush encountered error:', results.find((r) => r.error)?.error);
      setSyncStatus('error');
    } else {
      setSyncStatus('synced');
    }
  } catch (err) {
    console.error('Failed to flush pending sync to Supabase:', err);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('offline');
    } else {
      setSyncStatus('error');
    }
  }
}

/**
 * Processes queued actions saved when the app was offline.
 */
export async function processOfflineQueue(): Promise<void> {
  const queue = getOfflineQueue();
  if (queue.length === 0 || !isSupabaseConfigured()) return;

  try {
    setSyncStatus('syncing');
    const remainingQueue: QueuedSyncAction[] = [];

    for (const item of queue) {
      try {
        if (item.type === 'daily_entry') {
          const row: any = {
            clerk_user_id: item.clerkUserId,
            date: item.payload.date,
            dish_id: item.payload.dishId,
            dish_name_mr: item.payload.dishNameMr,
            dish_name_en: item.payload.dishNameEn || '',
            student_count: item.payload.studentCount,
            items: item.payload.items || {},
            total_grains_pulses_kg: item.payload.totalGrainsPulsesKg || 0,
            total_vegetables_kg: item.payload.totalVegetablesKg || 0,
            total_cooking_cost: item.payload.totalCookingCost || 0,
            remarks: item.payload.remarks || '',
            saved_at: item.payload.savedAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: item.clerkUserId,
          };
          if (cachedSchoolId) row.school_id = cachedSchoolId;
          const { error } = await supabase.from('daily_entries').upsert(row, { onConflict: 'clerk_user_id,date' });
          if (error) remainingQueue.push(item);
        } else if (item.type === 'daily_delete') {
          const { error } = await supabase.from('daily_entries').delete().match({ clerk_user_id: item.clerkUserId, date: item.payload });
          if (error) remainingQueue.push(item);
        } else if (item.type === 'stock_inward') {
          const row: any = {
            clerk_user_id: item.clerkUserId,
            month_key: item.payload.monthKey,
            stock_data: item.payload.stockData || {},
            updated_at: new Date().toISOString(),
            updated_by: item.clerkUserId,
          };
          if (cachedSchoolId) row.school_id = cachedSchoolId;
          const { error } = await supabase.from('stock_inward').upsert(row, { onConflict: 'clerk_user_id,month_key' });
          if (error) remainingQueue.push(item);
        }
      } catch {
        remainingQueue.push(item);
      }
    }

    saveOfflineQueue(remainingQueue);
    if (remainingQueue.length === 0) {
      setSyncStatus('synced');
    }
  } catch (err) {
    console.error('Failed to process offline queue:', err);
  }
}

/**
 * Upserts a single daily register entry into Supabase with write-coalescing.
 * Rapid edits coalesce into a single batched flush.
 */
export async function syncDailyEntryToCloud(
  entry: DailyRegisterEntry,
  clerkUserId: string
): Promise<void> {
  if (!clerkUserId) return;

  // If offline, save directly to persistent offline queue
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    pushToOfflineQueue({
      type: 'daily_entry',
      payload: entry,
      clerkUserId,
      timestamp: new Date().toISOString(),
    });
    setSyncStatus('offline');
    return;
  }

  // Queue in debounce map to coalesce rapid consecutive writes
  pendingDailyEntries.set(`${clerkUserId}_${entry.date}`, { entry, clerkUserId });
  setSyncStatus('syncing');

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    flushPendingSync().catch(console.error);
  }, 800);
}

/**
 * Deletes a single daily register entry from Supabase.
 */
export async function syncDeleteDailyEntryFromCloud(
  dateKey: string,
  clerkUserId: string
): Promise<void> {
  if (!clerkUserId) return;

  // Remove from pending debounced map if present
  pendingDailyEntries.delete(`${clerkUserId}_${dateKey}`);

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    pushToOfflineQueue({
      type: 'daily_delete',
      payload: dateKey,
      clerkUserId,
      timestamp: new Date().toISOString(),
    });
    setSyncStatus('offline');
    return;
  }

  try {
    setSyncStatus('syncing');

    const { error } = await supabase
      .from('daily_entries')
      .delete()
      .match({ clerk_user_id: clerkUserId, date: dateKey });

    if (error) {
      console.warn('Supabase delete error:', error);
      setSyncStatus('error');
    } else {
      setSyncStatus('synced');
    }
  } catch (err) {
    console.error('Failed to delete daily entry from Supabase:', err);
    setSyncStatus('error');
  }
}

/**
 * Upserts monthly stock inward data into Supabase with write-coalescing.
 */
export async function syncStockInwardToCloud(
  monthKey: string,
  stockData: MonthlyStockInward,
  clerkUserId: string
): Promise<void> {
  if (!clerkUserId) return;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    pushToOfflineQueue({
      type: 'stock_inward',
      payload: { monthKey, stockData },
      clerkUserId,
      timestamp: new Date().toISOString(),
    });
    setSyncStatus('offline');
    return;
  }

  pendingStockInwards.set(`${clerkUserId}_${monthKey}`, { monthKey, stockData, clerkUserId });
  setSyncStatus('syncing');

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    flushPendingSync().catch(console.error);
  }, 800);
}

/**
 * Upserts School Profile into Supabase.
 */
/**
 * Upserts School Profile into Supabase.
 * Ensures the school record exists with unique UDISE and creates/updates user membership as SCHOOL_ADMIN.
 */
export async function syncSchoolProfileToCloud(
  profile: SchoolProfile,
  clerkUserId: string,
  userEmail?: string,
  userName?: string
): Promise<void> {
  if (!isSupabaseConfigured() || !clerkUserId) return;
  // Never upload empty or legacy demo seed profile
  if (!profile.schoolName && !profile.udiseNumber) return;
  if (profile.udiseNumber === '27251403201' || profile.schoolName.includes('बोरगाव')) return;

  try {
    setSyncStatus('syncing');

    const row: any = {
      clerk_user_id: clerkUserId,
      user_email: userEmail || 'school@example.com',
      user_name: userName || profile.headmasterName || 'मुख्याध्यापक',
      school_name: profile.schoolName,
      udise_number: profile.udiseNumber,
      center_cluster: profile.centerCluster || '',
      district: profile.district || '',
      taluka: profile.taluka || '',
      headmaster_name: profile.headmasterName || '',
      incharge_teacher: profile.inchargeTeacher || '',
      cook_name: profile.cookName || '',
      updated_at: new Date().toISOString(),
    };

    if (profile.id || cachedSchoolId) {
      row.id = profile.id || cachedSchoolId;
    }

    if (profile.verificationStatus) row.verification_status = profile.verificationStatus;
    if (profile.accessStatus) row.access_status = profile.accessStatus;
    if (profile.subscriptionStatus) row.subscription_status = profile.subscriptionStatus;

    // Upsert by UDISE number (schools primary tenant unique key)
    let schoolId: string | null = null;
    const { data, error } = await supabase
      .from('schools')
      .upsert(row, { onConflict: 'udise_number' })
      .select('id')
      .maybeSingle();

    if (error) {
      // Fallback on clerk_user_id if udise constraint isn't matched
      const fallback = await supabase
        .from('schools')
        .upsert(row, { onConflict: 'clerk_user_id' })
        .select('id')
        .maybeSingle();

      if (fallback.error) {
        console.warn('Supabase school profile sync error:', fallback.error);
        setSyncStatus('error');
        return;
      }
      schoolId = fallback.data?.id || null;
    } else {
      schoolId = data?.id || null;
    }

    if (schoolId) {
      cachedSchoolId = schoolId;
      // Maintain user membership as SCHOOL_ADMIN (User -> Membership -> School)
      try {
        await supabase.from('memberships').upsert({
          clerk_user_id: clerkUserId,
          school_id: schoolId,
          user_email: userEmail || 'school@example.com',
          user_name: userName || profile.headmasterName || 'मुख्याध्यापक',
          role: 'SCHOOL_ADMIN',
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'clerk_user_id,school_id' });
      } catch (memErr) {
        console.warn('Membership upsert notice:', memErr);
      }
    }

    setSyncStatus('synced');
  } catch (err) {
    console.error('Failed to sync school profile to Supabase:', err);
    setSyncStatus('error');
  }
}

/**
 * Upserts a school access request into Supabase schools table so Super Admin can see it immediately.
 * Links user to school via memberships table.
 */
export async function syncAccessRequestToCloud(request: UserAccessRequest): Promise<boolean> {
  if (!isSupabaseConfigured() || !request.clerkUserId) return false;

  try {
    setSyncStatus('syncing');

    const verificationStatus: VerificationStatus =
      request.verificationStatus || (request.status === 'active' ? 'VERIFIED' : (request.status === 'rejected' ? 'REJECTED' : 'PENDING'));
    const accessStatus: AccessStatus =
      request.accessStatus || (request.status === 'active' ? 'ACTIVE' : (request.status === 'expired' ? 'EXPIRED' : (request.status === 'rejected' ? 'SUSPENDED' : 'PENDING')));
    const subscriptionStatus: SubscriptionTierStatus =
      request.subscriptionStatus || (request.status === 'active' ? 'ACTIVE' : (request.status === 'expired' ? 'EXPIRED' : 'TRIAL'));

    const row: any = {
      clerk_user_id: request.clerkUserId,
      user_email: request.userEmail,
      user_name: request.userName || '',
      school_name: request.schoolName,
      udise_number: request.udiseNumber,
      center_cluster: request.centerCluster || '',
      district: request.district || '',
      phone: request.phone || '',
      notes: request.notes || '',
      status: request.status || 'active',
      verification_status: verificationStatus,
      access_status: accessStatus,
      subscription_status: subscriptionStatus,
      updated_at: new Date().toISOString(),
    };

    if (request.durationMonths !== undefined) row.duration_months = request.durationMonths;
    if (request.expiresAt !== undefined) row.expires_at = request.expiresAt;
    if (request.schoolId) row.id = request.schoolId;
    if (request.adminFeedback) row.admin_feedback = request.adminFeedback;
    if (request.validationResult) row.validation_result = request.validationResult;

    let schoolId: string | null = request.schoolId || null;

    const { data, error } = await supabase
      .from('schools')
      .upsert(row, { onConflict: 'udise_number' })
      .select('id')
      .maybeSingle();

    if (error) {
      // Fallback on clerk_user_id
      const fallback = await supabase
        .from('schools')
        .upsert(row, { onConflict: 'clerk_user_id' })
        .select('id')
        .maybeSingle();

      if (fallback.error) {
        console.error('Failed to sync access request to Supabase:', fallback.error);
        setSyncStatus('error');
        return false;
      }
      schoolId = fallback.data?.id || null;
    } else {
      schoolId = data?.id || null;
    }

    if (schoolId) {
      cachedSchoolId = schoolId;
      // Maintain user membership as SCHOOL_ADMIN
      try {
        await supabase.from('memberships').upsert({
          clerk_user_id: request.clerkUserId,
          school_id: schoolId,
          user_email: request.userEmail,
          user_name: request.userName || 'मुख्याध्यापक',
          role: request.role || 'SCHOOL_ADMIN',
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'clerk_user_id,school_id' });
      } catch (memErr) {
        console.warn('Membership sync notice:', memErr);
      }
    }

    setSyncStatus('synced');
    return true;
  } catch (err) {
    console.error('Error syncing access request to Supabase:', err);
    setSyncStatus('error');
    return false;
  }
}

/**
 * Fetches all school registrations and access requests from Supabase Cloud.
 * Used by Super Admin Panel to see requests across all users and devices with orthogonal statuses.
 */
export async function fetchAllSchoolsFromCloud(): Promise<UserAccessRequest[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch schools from Supabase:', error);
      return [];
    }

    if (!data) return [];

    return data.map((row: any): UserAccessRequest => ({
      id: row.id || ('req_' + row.clerk_user_id),
      schoolId: row.id,
      role: (row.role as UserRole) || 'SCHOOL_ADMIN',
      clerkUserId: row.clerk_user_id,
      userEmail: row.user_email || '',
      userName: row.user_name || '',
      schoolName: row.school_name,
      udiseNumber: row.udise_number,
      centerCluster: row.center_cluster || '',
      district: row.district || '',
      phone: row.phone || '',
      notes: row.notes || '',
      adminFeedback: row.admin_feedback || undefined,
      validationResult: (row.validation_result as AutoValidationResult) || undefined,
      status: (row.status as SubscriptionStatus) || 'pending',
      verificationStatus: (row.verification_status as VerificationStatus) || (row.status === 'active' ? 'VERIFIED' : (row.status === 'rejected' ? 'REJECTED' : 'PENDING')),
      accessStatus: (row.access_status as AccessStatus) || (row.status === 'active' ? 'ACTIVE' : (row.status === 'expired' ? 'EXPIRED' : 'PENDING')),
      subscriptionStatus: (row.subscription_status as SubscriptionTierStatus) || (row.status === 'active' ? 'ACTIVE' : (row.status === 'expired' ? 'EXPIRED' : 'TRIAL')),
      durationMonths: row.duration_months || undefined,
      expiresAt: row.expires_at || undefined,
      requestedAt: row.created_at || new Date().toISOString(),
      approvedAt: (row.status === 'active' || row.access_status === 'ACTIVE') ? (row.approved_at || row.updated_at) : undefined,
    }));
  } catch (err) {
    console.error('Error fetching schools from cloud:', err);
    return [];
  }
}

/**
 * Updates a school's subscription/access status directly in Supabase.
 * Supports updating orthogonal statuses (verification, access, subscription).
 */
export async function updateSchoolStatusInCloud(
  clerkUserId: string,
  status: SubscriptionStatus,
  durationMonths?: number,
  expiresAt?: string,
  options?: {
    verificationStatus?: VerificationStatus;
    accessStatus?: AccessStatus;
    subscriptionStatus?: SubscriptionTierStatus;
    schoolId?: string;
  }
): Promise<boolean> {
  if (!isSupabaseConfigured() || !clerkUserId) return false;

  try {
    const payload: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (durationMonths !== undefined) payload.duration_months = durationMonths;
    if (expiresAt !== undefined) {
      payload.expires_at = expiresAt;
      if (status === 'active') payload.approved_at = new Date().toISOString();
    }

    // Set orthogonal statuses
    payload.verification_status = options?.verificationStatus || (
      status === 'active' ? 'VERIFIED' : (status === 'rejected' ? 'REJECTED' : 'PENDING')
    );
    payload.access_status = options?.accessStatus || (
      status === 'active' ? 'ACTIVE' : (status === 'expired' ? 'EXPIRED' : (status === 'rejected' ? 'SUSPENDED' : 'PENDING'))
    );
    payload.subscription_status = options?.subscriptionStatus || (
      status === 'active' ? 'ACTIVE' : (status === 'expired' ? 'EXPIRED' : 'TRIAL')
    );

    let query = supabase.from('schools').update(payload);
    if (options?.schoolId) {
      query = query.eq('id', options.schoolId);
    } else {
      query = query.eq('clerk_user_id', clerkUserId);
    }

    const { error } = await query;
    if (error) {
      console.error('Failed to update school status in Supabase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error updating school status in cloud:', err);
    return false;
  }
}

/**
 * Fetches the user's latest school registration and status from Supabase.
 */
export async function fetchUserSchoolFromCloud(
  clerkUserId: string
): Promise<UserAccessRequest | null> {
  if (!isSupabaseConfigured() || !clerkUserId) return null;

  try {
    // Check membership first
    let schoolId: string | null = null;
    let userRole: UserRole = 'TEACHER';

    const { data: mem } = await supabase
      .from('memberships')
      .select('school_id, role')
      .eq('clerk_user_id', clerkUserId)
      .eq('is_active', true)
      .maybeSingle();

    if (mem?.school_id) {
      schoolId = mem.school_id;
      userRole = (mem.role as UserRole) || 'TEACHER';
    }

    let query = supabase.from('schools').select('*');
    if (schoolId) {
      query = query.eq('id', schoolId);
    } else {
      query = query.eq('clerk_user_id', clerkUserId);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;

    return {
      id: data.id || ('req_' + data.clerk_user_id),
      schoolId: data.id,
      role: userRole,
      clerkUserId: data.clerk_user_id,
      userEmail: data.user_email || '',
      userName: data.user_name || '',
      schoolName: data.school_name,
      udiseNumber: data.udise_number,
      centerCluster: data.center_cluster || '',
      district: data.district || '',
      phone: data.phone || '',
      notes: data.notes || '',
      status: (data.status as SubscriptionStatus) || 'pending',
      verificationStatus: (data.verification_status as VerificationStatus) || (data.status === 'active' ? 'VERIFIED' : 'PENDING'),
      accessStatus: (data.access_status as AccessStatus) || (data.status === 'active' ? 'ACTIVE' : (data.status === 'expired' ? 'EXPIRED' : 'PENDING')),
      subscriptionStatus: (data.subscription_status as SubscriptionTierStatus) || (data.status === 'active' ? 'ACTIVE' : (data.status === 'expired' ? 'EXPIRED' : 'TRIAL')),
      durationMonths: data.duration_months || undefined,
      expiresAt: data.expires_at || undefined,
      requestedAt: data.created_at || new Date().toISOString(),
      approvedAt: (data.status === 'active' || data.access_status === 'ACTIVE') ? (data.approved_at || data.updated_at) : undefined,
    };
  } catch (err) {
    console.error('Error fetching user school from cloud:', err);
    return null;
  }
}

/**
 * Fetches user membership info (role and school tenancy).
 */
export async function fetchUserMembership(clerkUserId: string): Promise<SchoolMembership | null> {
  if (!isSupabaseConfigured() || !clerkUserId) return null;
  try {
    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      clerkUserId: data.clerk_user_id,
      schoolId: data.school_id,
      userEmail: data.user_email,
      userName: data.user_name,
      role: data.role as UserRole,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

/**
 * Searches and looks up a school by UDISE number.
 * Used in Stage 2 of registration to identify whether a school already exists.
 */
export async function lookupSchoolByUdise(udise: string): Promise<{
  exists: boolean;
  school?: {
    id: string;
    schoolName: string;
    udiseNumber: string;
    centerCluster?: string;
    district?: string;
    headmasterName?: string;
    verificationStatus?: VerificationStatus;
    accessStatus?: AccessStatus;
    subscriptionStatus?: SubscriptionTierStatus;
    clerkUserId?: string;
  };
} | null> {
  const cleanUdise = udise.trim();
  if (!cleanUdise) return { exists: false };

  // Fallback to local storage if offline or Supabase unconfigured
  if (!isSupabaseConfigured()) {
    try {
      const raw = localStorage.getItem('pm_poshan_access_requests_v1');
      if (raw) {
        const list: UserAccessRequest[] = JSON.parse(raw);
        const match = list.find((r) => r.udiseNumber === cleanUdise);
        if (match) {
          return {
            exists: true,
            school: {
              id: match.schoolId || match.id,
              schoolName: match.schoolName,
              udiseNumber: match.udiseNumber,
              centerCluster: match.centerCluster,
              district: match.district,
              headmasterName: match.userName,
              verificationStatus: match.verificationStatus,
              accessStatus: match.accessStatus,
              subscriptionStatus: match.subscriptionStatus,
              clerkUserId: match.clerkUserId,
            },
          };
        }
      }
    } catch {}
    return { exists: false };
  }

  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('udise_number', cleanUdise)
      .maybeSingle();

    if (error || !data) {
      return { exists: false };
    }

    return {
      exists: true,
      school: {
        id: data.id,
        schoolName: data.school_name,
        udiseNumber: data.udise_number,
        centerCluster: data.center_cluster || '',
        district: data.district || '',
        headmasterName: data.headmaster_name || '',
        verificationStatus: data.verification_status,
        accessStatus: data.access_status,
        subscriptionStatus: data.subscription_status,
        clerkUserId: data.clerk_user_id,
      },
    };
  } catch (err) {
    console.warn('Error looking up school by UDISE:', err);
    return { exists: false };
  }
}

/**
 * Appends state transition audit event to public.audit_logs in Supabase.
 */
export async function recordAuditLogToCloud(audit: StateTransitionAudit): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const row: any = {
      school_id: audit.schoolId || undefined,
      user_id: audit.userId,
      user_email: audit.userId,
      user_role: 'SUPER_ADMIN',
      action: 'STATUS_CHANGE',
      table_name: 'schools',
      record_id: audit.requestId,
      old_values: { status: audit.previousStatus },
      new_values: {
        status: audit.newStatus,
        reason: audit.reason || '',
        admin_id: audit.adminId,
      },
      timestamp: audit.timestamp || new Date().toISOString(),
    };
    const { error } = await supabase.from('audit_logs').insert([row]);
    if (error) {
      console.warn('Supabase audit log insert notice:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Audit log write error:', e);
    return false;
  }
}

/**
 * Exports complete tenant dataset for the authorized school in compliance with requirement 11.
 */
export async function exportSchoolTenantData(
  clerkUserId: string,
  schoolProfile?: SchoolProfile
): Promise<any> {
  if (!isSupabaseConfigured() || !clerkUserId) {
    throw new Error('Supabase is not configured or user not authenticated');
  }

  try {
    // 1. Fetch School record
    const schoolPromise = supabase
      .from('schools')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    // 2. Fetch daily entries
    const entriesPromise = supabase
      .from('daily_entries')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .order('date', { ascending: true });

    // 3. Fetch stock inward
    const stockPromise = supabase
      .from('stock_inward')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .order('month_key', { ascending: true });

    const [schoolRes, entriesRes, stockRes] = await Promise.all([
      schoolPromise,
      entriesPromise,
      stockPromise,
    ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      exportedBy: clerkUserId,
      school: schoolRes.data || schoolProfile,
      dailyEntriesCount: entriesRes.data?.length || 0,
      dailyEntries: entriesRes.data || [],
      stockInwardCount: stockRes.data?.length || 0,
      stockInward: stockRes.data || [],
    };

    // 4. Record audit event
    try {
      await supabase.from('audit_logs').insert({
        school_id: schoolRes.data?.id || cachedSchoolId || null,
        user_id: clerkUserId,
        action: 'DATA_EXPORT',
        table_name: 'schools',
        record_id: schoolRes.data?.id || 'export',
        new_values: { recordCount: (entriesRes.data?.length || 0) + (stockRes.data?.length || 0) },
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      // Non-blocking audit notice
    }

    // 5. Trigger browser download
    if (typeof window !== 'undefined') {
      const udise = schoolRes.data?.udise_number || schoolProfile?.udiseNumber || 'school';
      const dateStr = new Date().toISOString().split('T')[0];
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MahaPoshan_${udise}_Data_Export_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    return exportPayload;
  } catch (err) {
    console.error('Data export error:', err);
    throw err;
  }
}

/**
 * Performs full background backup of all local AppData to Supabase.
 */
export async function syncFullAppDataToCloud(
  data: AppData,
  clerkUserId: string,
  userEmail?: string,
  userName?: string
): Promise<void> {
  if (!isSupabaseConfigured() || !clerkUserId) return;
  // Never upload legacy demo data
  if (
    data.profile?.udiseNumber === '27251403201' ||
    (data.profile?.schoolName && data.profile.schoolName.includes('बोरगाव'))
  ) {
    return;
  }

  try {
    setSyncStatus('syncing');

    // 1. Sync Profile
    await syncSchoolProfileToCloud(data.profile, clerkUserId, userEmail, userName);

    // 2. Batch Sync Daily Entries in chunks of 50 to prevent payload limits
    const entries = Object.values(data.dailyEntries || {});
    if (entries.length > 0) {
      const rows = entries.map((entry) => ({
        school_id: cachedSchoolId || undefined,
        clerk_user_id: clerkUserId,
        date: entry.date,
        dish_id: entry.dishId,
        dish_name_mr: entry.dishNameMr,
        dish_name_en: entry.dishNameEn || '',
        student_count: entry.studentCount,
        items: entry.items || {},
        total_grains_pulses_kg: entry.totalGrainsPulsesKg || 0,
        total_vegetables_kg: entry.totalVegetablesKg || 0,
        total_cooking_cost: entry.totalCookingCost || 0,
        remarks: entry.remarks || '',
        saved_at: entry.savedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: clerkUserId,
      }));

      const CHUNK_SIZE = 50;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        await supabase
          .from('daily_entries')
          .upsert(chunk, { onConflict: 'clerk_user_id,date' });
      }
    }

    // 3. Batch Sync Stock Inward
    const stockKeys = Object.keys(data.stockInward || {});
    if (stockKeys.length > 0) {
      const stockRows = stockKeys.map((mKey) => ({
        school_id: cachedSchoolId || undefined,
        clerk_user_id: clerkUserId,
        month_key: mKey,
        stock_data: data.stockInward[mKey] || {},
        updated_at: new Date().toISOString(),
        updated_by: clerkUserId,
      }));

      await supabase
        .from('stock_inward')
        .upsert(stockRows, { onConflict: 'clerk_user_id,month_key' });
    }

    setSyncStatus('synced');
  } catch (err) {
    console.error('Full app sync to Supabase failed:', err);
    setSyncStatus('error');
  }
}

/**
 * Purges daily register entries and monthly stock inward records from Supabase
 * while preserving the user's school profile and account.
 */
export async function purgeUserRegisterDataFromCloud(clerkUserId: string): Promise<void> {
  if (!isSupabaseConfigured() || !clerkUserId) return;

  try {
    setSyncStatus('syncing');
    await Promise.allSettled([
      supabase.from('daily_entries').delete().eq('clerk_user_id', clerkUserId),
      supabase.from('stock_inward').delete().eq('clerk_user_id', clerkUserId),
    ]);
    setSyncStatus('synced');
    console.log(`Register data (daily entries & stock) successfully purged for user: ${clerkUserId}`);
  } catch (err) {
    console.error('Failed to purge register data from cloud:', err);
    setSyncStatus('error');
  }
}

/**
 * Permanently purges all cloud records (school profile, daily registers, stock)
 * for a specific Clerk user when 28 days grace period expires or when explicitly deleted.
 */
export async function purgeUserDataFromCloud(clerkUserId: string): Promise<void> {
  if (!isSupabaseConfigured() || !clerkUserId) return;

  try {
    setSyncStatus('syncing');
    await Promise.allSettled([
      supabase.from('daily_entries').delete().eq('clerk_user_id', clerkUserId),
      supabase.from('stock_inward').delete().eq('clerk_user_id', clerkUserId),
      supabase.from('schools').delete().eq('clerk_user_id', clerkUserId),
    ]);
    setSyncStatus('synced');
    console.log(`Cloud data successfully purged for user: ${clerkUserId}`);
  } catch (err) {
    console.error('Failed to purge user data from cloud:', err);
    setSyncStatus('error');
  }
}


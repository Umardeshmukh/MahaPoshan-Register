import { supabase, isSupabaseConfigured } from './supabase-client';
import { AppData, DailyRegisterEntry, MonthlyStockInward, SchoolProfile, UserAccessRequest, SubscriptionStatus } from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

let currentSyncStatus: SyncStatus = 'idle';
let cachedSchoolId: string | null = null;
const statusListeners = new Set<(status: SyncStatus) => void>();

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

  try {
    setSyncStatus('syncing');

    // 1. Fetch School Profile
    const schoolPromise = supabase
      .from('schools')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    // 2. Fetch All Daily Entries
    const entriesPromise = supabase
      .from('daily_entries')
      .select('*')
      .eq('clerk_user_id', clerkUserId);

    // 3. Fetch All Monthly Stock Inwards
    const stockPromise = supabase
      .from('stock_inward')
      .select('*')
      .eq('clerk_user_id', clerkUserId);

    const [schoolRes, entriesRes, stockRes] = await Promise.all([
      schoolPromise,
      entriesPromise,
      stockPromise,
    ]);

    let hasAnyData = false;
    let profile: SchoolProfile | undefined = undefined;
    const dailyEntries: Record<string, DailyRegisterEntry> = {};
    const stockInward: Record<string, MonthlyStockInward> = {};

    if (schoolRes.data) {
      hasAnyData = true;
      cachedSchoolId = schoolRes.data.id || null;
      profile = {
        schoolName: schoolRes.data.school_name || '',
        udiseNumber: schoolRes.data.udise_number || '',
        centerCluster: schoolRes.data.center_cluster || '',
        standardCategory: 'इयत्ता १ ली ते ५ वी (प्राथमिक)',
        district: schoolRes.data.district || '',
        taluka: schoolRes.data.taluka || '',
        headmasterName: schoolRes.data.headmaster_name || '',
        inchargeTeacher: schoolRes.data.incharge_teacher || '',
        cookName: schoolRes.data.cook_name || '',
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
    };
  } catch (error) {
    console.error('Failed to pull user data from Supabase:', error);
    setSyncStatus('error');
    return null;
  }
}

/**
 * Upserts a single daily register entry into Supabase.
 */
export async function syncDailyEntryToCloud(
  entry: DailyRegisterEntry,
  clerkUserId: string
): Promise<void> {
  if (!isSupabaseConfigured() || !clerkUserId) return;

  try {
    setSyncStatus('syncing');

    const row: any = {
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
    };

    if (cachedSchoolId) {
      row.school_id = cachedSchoolId;
    }

    const { error } = await supabase
      .from('daily_entries')
      .upsert(row, { onConflict: 'clerk_user_id,date' });

    if (error) {
      console.warn('Supabase daily entry sync error:', error);
      setSyncStatus('error');
    } else {
      setSyncStatus('synced');
    }
  } catch (err) {
    console.error('Failed to sync daily entry to Supabase:', err);
    setSyncStatus('error');
  }
}

/**
 * Deletes a single daily register entry from Supabase.
 */
export async function syncDeleteDailyEntryFromCloud(
  dateKey: string,
  clerkUserId: string
): Promise<void> {
  if (!isSupabaseConfigured() || !clerkUserId) return;

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
 * Upserts monthly stock inward data into Supabase.
 */
export async function syncStockInwardToCloud(
  monthKey: string,
  stockData: MonthlyStockInward,
  clerkUserId: string
): Promise<void> {
  if (!isSupabaseConfigured() || !clerkUserId) return;

  try {
    setSyncStatus('syncing');

    const row: any = {
      clerk_user_id: clerkUserId,
      month_key: monthKey,
      stock_data: stockData || {},
      updated_at: new Date().toISOString(),
      updated_by: clerkUserId,
    };

    if (cachedSchoolId) {
      row.school_id = cachedSchoolId;
    }

    const { error } = await supabase
      .from('stock_inward')
      .upsert(row, { onConflict: 'clerk_user_id,month_key' });

    if (error) {
      console.warn('Supabase stock inward sync error:', error);
      setSyncStatus('error');
    } else {
      setSyncStatus('synced');
    }
  } catch (err) {
    console.error('Failed to sync stock inward to Supabase:', err);
    setSyncStatus('error');
  }
}

/**
 * Upserts School Profile into Supabase.
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
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('schools')
      .upsert(row, { onConflict: 'clerk_user_id' })
      .select('id')
      .maybeSingle();

    if (data?.id) {
      cachedSchoolId = data.id;
    }

    if (error) {
      console.warn('Supabase school profile sync error:', error);
      setSyncStatus('error');
    } else {
      setSyncStatus('synced');
    }
  } catch (err) {
    console.error('Failed to sync school profile to Supabase:', err);
    setSyncStatus('error');
  }
}

/**
 * Upserts a school access request into Supabase schools table so Super Admin can see it immediately.
 */
export async function syncAccessRequestToCloud(request: UserAccessRequest): Promise<boolean> {
  if (!isSupabaseConfigured() || !request.clerkUserId) return false;

  try {
    setSyncStatus('syncing');

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
      status: request.status || 'pending',
      updated_at: new Date().toISOString(),
    };

    if (request.durationMonths !== undefined) row.duration_months = request.durationMonths;
    if (request.expiresAt !== undefined) row.expires_at = request.expiresAt;

    const { data, error } = await supabase
      .from('schools')
      .upsert(row, { onConflict: 'clerk_user_id' })
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Failed to sync access request to Supabase:', error);
      setSyncStatus('error');
      return false;
    }

    if (data?.id) {
      cachedSchoolId = data.id;
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
 * Used by Super Admin Panel to see requests across all users and devices.
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
      clerkUserId: row.clerk_user_id,
      userEmail: row.user_email || '',
      userName: row.user_name || '',
      schoolName: row.school_name,
      udiseNumber: row.udise_number,
      centerCluster: row.center_cluster || '',
      district: row.district || '',
      phone: row.phone || '',
      notes: row.notes || '',
      status: (row.status as SubscriptionStatus) || 'pending',
      durationMonths: row.duration_months || undefined,
      expiresAt: row.expires_at || undefined,
      requestedAt: row.created_at || new Date().toISOString(),
      approvedAt: row.status === 'active' ? row.updated_at : undefined,
    }));
  } catch (err) {
    console.error('Error fetching schools from cloud:', err);
    return [];
  }
}

/**
 * Updates a school's subscription/access status directly in Supabase.
 */
export async function updateSchoolStatusInCloud(
  clerkUserId: string,
  status: SubscriptionStatus,
  durationMonths?: number,
  expiresAt?: string
): Promise<boolean> {
  if (!isSupabaseConfigured() || !clerkUserId) return false;

  try {
    const payload: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (durationMonths !== undefined) payload.duration_months = durationMonths;
    if (expiresAt !== undefined) payload.expires_at = expiresAt;

    const { error } = await supabase
      .from('schools')
      .update(payload)
      .eq('clerk_user_id', clerkUserId);

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
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id || ('req_' + data.clerk_user_id),
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
      durationMonths: data.duration_months || undefined,
      expiresAt: data.expires_at || undefined,
      requestedAt: data.created_at || new Date().toISOString(),
      approvedAt: data.status === 'active' ? data.updated_at : undefined,
    };
  } catch (err) {
    console.error('Error fetching user school from cloud:', err);
    return null;
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

    // 2. Batch Sync Daily Entries
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

      await supabase
        .from('daily_entries')
        .upsert(rows, { onConflict: 'clerk_user_id,date' });
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


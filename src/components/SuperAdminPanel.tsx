import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  UserAccessRequest,
  AdminNotification,
  SubscriptionStatus,
  ReferralRecord,
} from '../types';
import {
  getAllAccessRequests,
  approveAccessRequest,
  rejectOrRevokeAccess,
  extendSubscription,
  deleteAccessRequest,
  scheduleAccountDeletion,
  cancelAccountDeletion,
  permanentPurgeAccount,
  getAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getSuperAdminConfig,
  updateSuperAdminConfig,
  sendAdminEmailNotification,
  DEFAULT_SUPER_ADMIN_PASSCODE,
  syncAllRequestsFromCloud,
  SUPER_ADMIN_AUTHORIZED_EMAILS,
  verifyAdminCredentials,
} from '../lib/subscription-store';
import {
  getAllReferrals,
  markRewardAsPaid,
} from '../lib/referral-store';
import { sendTestEmail, sendApprovalConfirmationEmail } from '../lib/email-service';
import { checkSupabaseHealth } from '../lib/supabase-client';

import {
  ShieldAlert,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Bell,
  Search,
  Calendar,
  KeyRound,
  Mail,
  School,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Send,
  Trash2,
  PlusCircle,
  Filter,
  Gift,
  Wallet,
  Copy,
  Check,
  RotateCcw,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Settings,
  Database,
  Save,
  Server,
  Sliders,
  Download,
  CheckSquare,
  Square,
  MessageCircle,
} from 'lucide-react';

interface SuperAdminPanelProps {
  onExit: () => void;
  currentUserEmail?: string;
}

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({
  onExit,
  currentUserEmail,
}) => {
  // Check if current user is an authorized Super Admin via Clerk
  const isClerkSuperAdmin = currentUserEmail
    ? SUPER_ADMIN_AUTHORIZED_EMAILS.some(
        (e) => e.toLowerCase().trim() === currentUserEmail.toLowerCase().trim()
      )
    : false;

  // Authentication & Passcode gate (Auto-verified if authorized via Clerk)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (sessionStorage.getItem('pm_poshan_admin_auth') === 'true') return true;
    if (currentUserEmail) {
      return SUPER_ADMIN_AUTHORIZED_EMAILS.some(
        (e) => e.toLowerCase().trim() === currentUserEmail.toLowerCase().trim()
      );
    }
    return false;
  });
  const [adminEmailInput, setAdminEmailInput] = useState(currentUserEmail || '');
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Data
  const [requests, setRequests] = useState<UserAccessRequest[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [config, setConfig] = useState(getSuperAdminConfig());

  // UI & Filter States
  const [activeTab, setActiveTab] = useState<'requests' | 'active' | 'referrals' | 'notifications' | 'settings'>('requests');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Batch Operations State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDuration, setBulkDuration] = useState<number>(6);
  const [isProcessingBulk, setIsProcessingBulk] = useState<boolean>(false);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  // Approval Modal State
  const [selectedRequest, setSelectedRequest] = useState<UserAccessRequest | null>(null);
  const [approvalDurationMonths, setApprovalDurationMonths] = useState<number>(6);
  const [customExpiryDate, setCustomExpiryDate] = useState<string>('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Payout Modal State
  const [selectedReferralForPayout, setSelectedReferralForPayout] = useState<ReferralRecord | null>(null);
  const [payoutPaymentRef, setPayoutPaymentRef] = useState('');
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Email Test alert status
  const [emailStatusMsg, setEmailStatusMsg] = useState<string | null>(null);

  // 2-Step Password-Protected Deletion Modal State
  const [deleteModalRequest, setDeleteModalRequest] = useState<UserAccessRequest | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deletePasscode, setDeletePasscode] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [showDeletePasscode, setShowDeletePasscode] = useState(false);

  // Immediate Purge Modal State (Passcode Protected)
  const [purgeModalRequest, setPurgeModalRequest] = useState<UserAccessRequest | null>(null);
  const [purgePasscode, setPurgePasscode] = useState('');
  const [purgeError, setPurgeError] = useState('');
  const [showPurgePasscode, setShowPurgePasscode] = useState(false);

  const [isLoadingCloud, setIsLoadingCloud] = useState(false);

  // Basic Settings Form State
  const [settingsPasscode, setSettingsPasscode] = useState(config.passcode);
  const [showSettingsPasscode, setShowSettingsPasscode] = useState(false);
  const [settingsAdminEmail, setSettingsAdminEmail] = useState(config.adminEmail);
  const [settingsEmailAlerts, setSettingsEmailAlerts] = useState(config.emailAlertsEnabled);
  const [settingsDefaultDuration, setSettingsDefaultDuration] = useState<number>(config.defaultDurationMonths || 6);
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState<string | null>(null);
  const [dbHealth, setDbHealth] = useState<{ testing: boolean; ok?: boolean; latencyMs?: number; error?: string }>({ testing: false });
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  useEffect(() => {
    setSettingsPasscode(config.passcode);
    setSettingsAdminEmail(config.adminEmail);
    setSettingsEmailAlerts(config.emailAlertsEnabled);
    setSettingsDefaultDuration(config.defaultDurationMonths || 6);
  }, [config]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      passcode: settingsPasscode.trim() || DEFAULT_SUPER_ADMIN_PASSCODE,
      adminEmail: settingsAdminEmail.trim() || 'poshanragister@gmail.com',
      emailAlertsEnabled: settingsEmailAlerts,
      defaultDurationMonths: settingsDefaultDuration,
      referralRewardAmount: config.referralRewardAmount || 0,
    };
    updateSuperAdminConfig(updated);
    setConfig(getSuperAdminConfig());
    setSettingsSaveSuccess('सेटिंग्ज यशस्वीरीत्या सेव्ह करण्यात आल्या आहेत!');
    setTimeout(() => setSettingsSaveSuccess(null), 3500);
  };

  const handleTestDatabase = async () => {
    setDbHealth({ testing: true });
    try {
      const res = await checkSupabaseHealth();
      setDbHealth({ testing: false, ...res });
    } catch (err: any) {
      setDbHealth({ testing: false, ok: false, error: err?.message || 'Error checking database' });
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    setEmailStatusMsg(null);
    try {
      const res = await sendTestEmail(settingsAdminEmail);
      if (res.success) {
        setEmailStatusMsg(`✓ Resend चाचणी ईमेल ${settingsAdminEmail} वर यशस्वी पाठवला (ID: ${res.id || 'ok'})`);
      } else {
        setEmailStatusMsg(`✕ ईमेल पाठवणे अयशस्वी: ${res.message}`);
      }
    } catch (err: any) {
      setEmailStatusMsg(`✕ एरर: ${err?.message}`);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const loadData = async () => {
    setRequests(getAllAccessRequests());
    setReferrals(getAllReferrals());
    setNotifications(getAdminNotifications());
    setConfig(getSuperAdminConfig());

    setIsLoadingCloud(true);
    try {
      const liveRequests = await syncAllRequestsFromCloud();
      setRequests(liveRequests);
    } catch (err) {
      console.warn('Failed to load live requests from Supabase:', err);
    } finally {
      setIsLoadingCloud(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const currentConfig = getSuperAdminConfig();
    const emailToTest = adminEmailInput.trim() || currentUserEmail || '';
    const isCredValid = verifyAdminCredentials(emailToTest, passcode.trim());

    if (
      isCredValid ||
      passcode.trim() === currentConfig.passcode ||
      passcode.trim() === DEFAULT_SUPER_ADMIN_PASSCODE
    ) {
      sessionStorage.setItem('pm_poshan_admin_auth', 'true');
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('अवैध ॲडमिन क्रेडेंशियल्स (Invalid Admin Credentials)! फक्त अधिकृत प्रशासकच योग्य आयडी व पासकोडने प्रवेश करू शकतात.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pm_poshan_admin_auth');
    setIsAuthenticated(false);
    onExit();
  };

  const handleOpenApproveModal = (req: UserAccessRequest) => {
    setSelectedRequest(req);
    setApprovalDurationMonths(6);
    setCustomExpiryDate('');
    setShowApprovalModal(true);
  };

  const handleConfirmApproval = () => {
    if (!selectedRequest) return;
    const approved = approveAccessRequest(
      selectedRequest.id,
      approvalDurationMonths,
      customExpiryDate || undefined
    );
    if (approved && approved.expiresAt) {
      sendApprovalConfirmationEmail({
        schoolName: approved.schoolName,
        userEmail: approved.userEmail,
        expiresAt: approved.expiresAt,
        durationMonths: approvalDurationMonths,
      }).catch((e) => console.warn('Could not dispatch approval email:', e));
    }
    setShowApprovalModal(false);
    setSelectedRequest(null);
    loadData();
  };

  const handleReject = (id: string) => {
    const reason = prompt('Enter reason for rejection (or leave blank):');
    if (reason !== null) {
      rejectOrRevokeAccess(id, reason);
      loadData();
    }
  };

  const handleExtend = (id: string, months: number) => {
    extendSubscription(id, months);
    loadData();
  };

  // Deletion Handlers
  const handleOpenDeleteModal = (req: UserAccessRequest) => {
    setDeleteModalRequest(req);
    setDeleteStep(1);
    setDeletePasscode('');
    setDeleteError('');
    setDeleteReason('');
    setDeleteAcknowledged(false);
    setShowDeletePasscode(false);
  };

  const handleProceedToStep2 = () => {
    setDeleteStep(2);
    setDeleteError('');
  };

  const handleConfirmScheduleDeletion = () => {
    if (!deleteModalRequest) return;
    const currentConfig = getSuperAdminConfig();
    const valid =
      deletePasscode.trim() === currentConfig.passcode ||
      deletePasscode.trim() === DEFAULT_SUPER_ADMIN_PASSCODE;

    if (!valid) {
      setDeleteError('Invalid Admin Passcode! Account could not be deleted.');
      return;
    }

    if (!deleteAcknowledged) {
      setDeleteError('Please check the confirmation box to acknowledge the 28-day retention policy.');
      return;
    }

    scheduleAccountDeletion(deleteModalRequest.id, deleteReason);
    setDeleteModalRequest(null);
    loadData();
  };

  const handleCancelDelete = (id: string) => {
    cancelAccountDeletion(id);
    loadData();
  };

  const handleOpenPurgeModal = (req: UserAccessRequest) => {
    setPurgeModalRequest(req);
    setPurgePasscode('');
    setPurgeError('');
    setShowPurgePasscode(false);
  };

  const handleConfirmImmediatePurge = () => {
    if (!purgeModalRequest) return;
    const currentConfig = getSuperAdminConfig();
    const valid =
      purgePasscode.trim() === currentConfig.passcode ||
      purgePasscode.trim() === DEFAULT_SUPER_ADMIN_PASSCODE;

    if (!valid) {
      setPurgeError('Invalid Admin Passcode! Could not permanently purge.');
      return;
    }

    permanentPurgeAccount(purgeModalRequest.id);
    setPurgeModalRequest(null);
    loadData();
  };

  const handleTestEmail = async () => {
    setEmailStatusMsg('Sending test email via Resend...');
    const res = await sendTestEmail(config.adminEmail);
    if (res.success) {
      setEmailStatusMsg(`✔ Test email sent successfully to ${config.adminEmail}! (ID: ${res.id || 'ok'})`);
    } else {
      setEmailStatusMsg(`❌ Error: ${res.message}`);
    }
    setTimeout(() => setEmailStatusMsg(null), 7000);
  };

  // Metrics
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const activeSubscriptions = requests.filter((r) => r.status === 'active');
  const pendingDeletions = requests.filter((r) => r.status === 'pending_deletion');
  const unreadNotifications = notifications.filter((n) => !n.read);

  // Passcode Gate Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
            <KeyRound className="w-7 h-7 text-amber-400" />
          </div>

          <h2 className="text-xl font-bold text-center text-white">
            Super Admin Console
          </h2>
          <p className="text-xs text-center text-slate-400 mt-1">
            MahaPoshan Register • Secure Developer Gateway
          </p>

          {currentUserEmail && (
            <div className="mt-4 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-center text-xs text-slate-300">
              Logged in as: <span className="font-mono text-amber-300">{currentUserEmail}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                ॲडमिन ईमेल (Admin Email)
              </label>
              <input
                type="email"
                required
                placeholder="poshanragister@gmail.com"
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                ॲडमिन पासकोड (Admin Passcode)
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
              />
              {authError && (
                <p className="text-xs text-rose-400 mt-1.5 font-medium">{authError}</p>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-white text-xs shadow-lg transition-colors cursor-pointer"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={onExit}
                className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 font-semibold text-slate-300 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Available districts extracted dynamically from registered school profiles
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.district && r.district.trim()) {
        set.add(r.district.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'mr'));
  }, [requests]);

  // Filter requests by search query, status, and district
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.schoolName.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        r.udiseNumber.includes(q) ||
        (r.userName && r.userName.toLowerCase().includes(q)) ||
        (r.centerCluster && r.centerCluster.toLowerCase().includes(q)) ||
        (r.district && r.district.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesDistrict = districtFilter === 'all' || r.district === districtFilter;

      return matchesSearch && matchesStatus && matchesDistrict;
    });
  }, [requests, searchTerm, statusFilter, districtFilter]);

  // Batch Selection Helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredRequests.map((r) => r.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Bulk Approval Handler
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`आपण निवडलेल्या ${selectedIds.length} शाळांना ${bulkDuration} महिन्यांसाठी मंजूर करू इच्छिता का?`)) return;

    setIsProcessingBulk(true);
    let successCount = 0;
    for (const id of selectedIds) {
      const res = approveAccessRequest(id, bulkDuration);
      if (res) {
        successCount++;
        if (res.userEmail && config.emailAlertsEnabled) {
          sendApprovalConfirmationEmail({
            schoolName: res.schoolName,
            userEmail: res.userEmail,
            expiresAt: res.expiresAt || '',
            durationMonths: bulkDuration,
          }).catch(() => {});
        }
      }
    }
    setIsProcessingBulk(false);
    setSelectedIds([]);
    await loadData();
    setBulkFeedback(`${successCount} शाळा यशस्वीरित्या मंजूर करण्यात आल्या!`);
    setTimeout(() => setBulkFeedback(null), 4000);
  };

  // Bulk Subscription Extension Handler
  const handleBulkExtend = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`आपण निवडलेल्या ${selectedIds.length} शाळांचा कालावधी +${bulkDuration} महिन्यांनी वाढवू इच्छिता का?`)) return;

    setIsProcessingBulk(true);
    let successCount = 0;
    for (const id of selectedIds) {
      const res = extendSubscription(id, bulkDuration);
      if (res) successCount++;
    }
    setIsProcessingBulk(false);
    setSelectedIds([]);
    await loadData();
    setBulkFeedback(`${successCount} शाळांचा कालावधी +${bulkDuration} महिन्यांनी वाढवण्यात आला!`);
    setTimeout(() => setBulkFeedback(null), 4000);
  };

  // Master Directory Excel Export Handler (.xlsx)
  const handleExportExcel = () => {
    const listToExport = filteredRequests.length > 0 ? filteredRequests : requests;
    if (listToExport.length === 0) {
      alert('कोणत्याही शाळांचा डेटा उपलब्ध नाही.');
      return;
    }

    const rows = listToExport.map((req, idx) => {
      const daysLeft = req.expiresAt
        ? Math.ceil((new Date(req.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        'अ.क्र.': idx + 1,
        'UDISE क्रमांक': req.udiseNumber,
        'शाळेचे नाव': req.schoolName,
        'केंद्र (Cluster)': req.centerCluster || '-',
        'तालुका (Taluka)': req.taluka || '-',
        'जिल्हा (District)': req.district || '-',
        'मुख्याध्यापक / शिक्षक नाव': req.userName || '-',
        'ईमेल (Email)': req.userEmail,
        'फोन (Phone)': req.phone || '-',
        'नोंदणी तारीख': new Date(req.requestedAt).toLocaleDateString('en-IN'),
        'मुदत संपण्याची तारीख': req.expiresAt ? new Date(req.expiresAt).toLocaleDateString('en-IN') : '-',
        'स्थिती (Status)': req.status === 'active' ? 'Active' : req.status === 'pending' ? 'Pending' : req.status === 'pending_deletion' ? 'Pending Deletion' : req.status,
        'उर्वरित दिवस': req.status === 'active' ? (daysLeft > 0 ? daysLeft : 0) : '-',
        'रेफरल कोड': req.referralCode || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 8 },  // Sr
      { wch: 14 }, // UDISE
      { wch: 34 }, // School Name
      { wch: 18 }, // Cluster
      { wch: 16 }, // Taluka
      { wch: 16 }, // District
      { wch: 24 }, // Teacher
      { wch: 28 }, // Email
      { wch: 14 }, // Phone
      { wch: 16 }, // Registered
      { wch: 16 }, // Expires
      { wch: 14 }, // Status
      { wch: 14 }, // Days Left
      { wch: 16 }, // Referral
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'School Directory');
    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `MahaPoshan_Master_Directory_${todayStr}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Admin Navigation Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base leading-none text-white">
                  MahaPoshan Super Admin
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                  DEVELOPER CONSOLE
                </span>
                {isClerkSuperAdmin && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>✓ Clerk Verified</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Subscription approvals, duration controls & user management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* In-App Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-900 py-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">
                      Notifications ({notifications.length})
                    </span>
                    {unreadNotifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          markAllNotificationsAsRead();
                          loadData();
                        }}
                        className="text-[11px] text-amber-700 hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationAsRead(notif.id);
                            loadData();
                          }}
                          className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.read ? 'bg-amber-50/50' : ''
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-slate-900 text-xs">
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(notif.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] mt-1">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Back to App */}
            <button
              type="button"
              onClick={onExit}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
            >
              <span>Exit to App</span>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Profiles</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
              {requests.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/40 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800">Pending Approval</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-extrabold text-amber-900 mt-2 font-mono">
              {pendingRequests.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/40 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800">Active Subscriptions</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-900 mt-2 font-mono">
              {activeSubscriptions.length}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveTab('requests');
              setStatusFilter('pending_deletion');
            }}
            className={`rounded-2xl p-4 border shadow-xs text-left cursor-pointer transition-all ${pendingDeletions.length > 0
                ? 'bg-rose-50/60 border-rose-300 hover:bg-rose-100/50'
                : 'bg-white border-slate-200/80'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${pendingDeletions.length > 0 ? 'text-rose-800' : 'text-slate-500'}`}>
                Data Retention (28 Days)
              </span>
              <Trash2 className={`w-4 h-4 ${pendingDeletions.length > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
            </div>
            <p className={`text-2xl font-extrabold mt-2 font-mono ${pendingDeletions.length > 0 ? 'text-rose-900' : 'text-slate-900'}`}>
              {pendingDeletions.length}
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {pendingDeletions.length > 0 ? '28-day retention period active' : 'None pending'}
            </span>
          </button>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Email Alerts</span>
              <Mail className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-700">
                {config.emailAlertsEnabled ? 'Active' : 'Disabled'}
              </span>
              <button
                type="button"
                onClick={handleTestEmail}
                className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
              >
                Send Test
              </button>
            </div>
          </div>
        </div>

        {emailStatusMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
            {emailStatusMsg}
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('requests');
              setStatusFilter('all');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'requests' && statusFilter !== 'pending_deletion'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
          >
            <School className="w-4 h-4" />
            <span>School Profiles & Requests</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-amber-300 text-[10px] font-mono">
              {requests.length}
            </span>
          </button>

          {pendingDeletions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('requests');
                setStatusFilter('pending_deletion');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'requests' && statusFilter === 'pending_deletion'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Data Retention (28 Days)</span>
              <span className="px-1.5 py-0.5 rounded-full bg-rose-900 text-rose-100 text-[10px] font-mono">
                {pendingDeletions.length}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'referrals'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
          >
            <Gift className="w-4 h-4" />
            <span>Referrals & Rewards</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-700 text-white text-[10px] font-mono">
              {referrals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'settings'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* Requests Management Table Card */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header & Controls */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  School Profiles & Subscription Management
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Approve access requests and manage subscription durations & 28-day data retention
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search school, UDISE, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending Only</option>
                  <option value="active">Active Only</option>
                  <option value="pending_deletion">Pending Deletion (28 Days)</option>
                  <option value="rejected">Rejected</option>
                </select>

                {/* District Filter Dropdown */}
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 cursor-pointer"
                >
                  <option value="all">All Districts (सर्व जिल्हे)</option>
                  {availableDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                {/* Master Directory Excel Export Button */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Download Master Directory as Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel Export</span>
                </button>

                <button
                  type="button"
                  onClick={loadData}
                  disabled={isLoadingCloud}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh live data from Supabase Cloud"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCloud ? 'animate-spin text-amber-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Bulk Action Feedback Message */}
            {bulkFeedback && (
              <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-in fade-in">
                {bulkFeedback}
              </div>
            )}

            {/* Batch Action Toolbar */}
            {selectedIds.length > 0 && (
              <div className="mx-4 mt-3 bg-gradient-to-r from-slate-900 to-amber-950 text-white px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md border border-amber-500/30 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs">
                    {selectedIds.length} शाळा निवडल्या आहेत (Selected)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={bulkDuration}
                    onChange={(e) => setBulkDuration(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-white text-xs border border-slate-700 focus:outline-hidden"
                  >
                    <option value={3}>३ महिने (3 Months)</option>
                    <option value={6}>६ महिने (6 Months)</option>
                    <option value={12}>१२ महिने (1 Full Year)</option>
                    <option value={24}>२४ महिने (2 Years)</option>
                  </select>

                  <button
                    type="button"
                    disabled={isProcessingBulk}
                    onClick={handleBulkApprove}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingBulk ? 'चालू आहे...' : 'मंजूर करा (Approve)'}
                  </button>

                  <button
                    type="button"
                    disabled={isProcessingBulk}
                    onClick={handleBulkExtend}
                    className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingBulk ? 'चालू आहे...' : '+कालावधी वाढवा (Extend)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    निवड रद्द (Clear)
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto touch-pan-x">
              <table className="w-full text-left text-xs border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-3 w-8 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAllVisible}
                        className="p-1 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        title={
                          filteredRequests.length > 0 && filteredRequests.every((r) => selectedIds.includes(r.id))
                            ? 'Deselect all'
                            : 'Select all visible'
                        }
                      >
                        {filteredRequests.length > 0 && filteredRequests.every((r) => selectedIds.includes(r.id)) ? (
                          <CheckSquare className="w-4 h-4 text-amber-700" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4">School & UDISE</th>
                    <th className="py-3 px-4">Headmaster / Email</th>
                    <th className="py-3 px-4">Cluster & District</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Expiry / Retention</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No requests or profiles found.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const isPending = req.status === 'pending';
                      const isActive = req.status === 'active';
                      const isPendingDeletion = req.status === 'pending_deletion';
                      const isSelected = selectedIds.includes(req.id);
                      const daysLeft = req.expiresAt
                        ? Math.ceil(
                          (new Date(req.expiresAt).getTime() - new Date().getTime()) /
                          (1000 * 60 * 60 * 24)
                        )
                        : 0;
                      const daysUntilPermanentDeletion = req.permanentDeletionDate
                        ? Math.max(
                          0,
                          Math.ceil(
                            (new Date(req.permanentDeletionDate).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24)
                          )
                        )
                        : 28;

                      return (
                        <tr
                          key={req.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isPendingDeletion ? 'bg-rose-50/30' : isSelected ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelect(req.id)}
                              className="p-1 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-amber-700" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{req.schoolName}</div>
                            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>UDISE: {req.udiseNumber}</span>
                              {req.referralCode && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold text-[9px]">
                                  Ref: {req.referralCode}
                                </span>
                              )}
                            </div>
                            {req.agreedToTerms && (
                              <div className="text-[10px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
                                <span>✓ Terms Accepted ({req.termsVersion || 'v1.0'})</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{req.userName || '-'}</div>
                            <div className="text-[11px] text-slate-500">{req.userEmail}</div>
                            {req.phone && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Phone: {req.phone}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-600">
                            <div>{req.centerCluster || '-'}</div>
                            <div className="text-[11px] text-slate-400">{req.district}</div>
                          </td>

                          <td className="py-3 px-4">
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending</span>
                              </span>
                            )}
                            {isActive && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Active</span>
                              </span>
                            )}
                            {isPendingDeletion && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>Pending Deletion (28 Days)</span>
                              </span>
                            )}
                            {req.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                <XCircle className="w-3 h-3 text-slate-500" />
                                <span>Rejected</span>
                              </span>
                            )}
                            {req.status === 'expired' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Expired</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {isPendingDeletion ? (
                              <div className="space-y-0.5">
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px]">
                                  <Clock className="w-3 h-3 text-rose-600" />
                                  <span>{daysUntilPermanentDeletion} days left</span>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  28-Day Data Retention
                                </div>
                              </div>
                            ) : isActive && req.expiresAt ? (
                              <div>
                                <div className="font-mono text-slate-800">
                                  {new Date(req.expiresAt).toLocaleDateString('en-IN')}
                                </div>
                                <div
                                  className={`text-[10px] font-semibold ${daysLeft > 30
                                    ? 'text-emerald-700'
                                    : daysLeft > 0
                                      ? 'text-amber-700'
                                      : 'text-rose-700'
                                    }`}
                                >
                                  {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenApproveModal(req)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReject(req.id)}
                                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {isActive && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleExtend(req.id, 1)}
                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                                    title="Extend 1 Month"
                                  >
                                    +1 Month
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleExtend(req.id, 6)}
                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                                    title="Extend 6 Months"
                                  >
                                    +6 Months
                                  </button>
                                </div>
                              )}

                              {isPendingDeletion && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleCancelDelete(req.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                                    title="Cancel deletion and restore profile"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Restore</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPurgeModal(req)}
                                    className="px-2 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                                    title="Purge immediately without waiting 28 days"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Purge Now</span>
                                  </button>
                                </div>
                              )}

                              {/* WhatsApp Quick Reminder Button */}
                              <a
                                href={
                                  req.phone && req.phone.replace(/\D/g, '').length >= 10
                                    ? `https://wa.me/91${req.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                                        `सस्नेह नमस्कार! महापोषण रजिस्टर संदर्भात: आपल्या ${req.schoolName} (UDISE: ${req.udiseNumber}) चे सदस्यत्व ${req.expiresAt ? new Date(req.expiresAt).toLocaleDateString('mr-IN') : 'लवकरच'} संपत आहे. अखंडित सेवेसाठी कृपया नूतनीकरण करा अथवा ॲडमिनशी संपर्क साधा.`
                                      )}`
                                    : `https://wa.me/?text=${encodeURIComponent(
                                        `सस्नेह नमस्कार! महापोषण रजिस्टर संदर्भात: आपल्या ${req.schoolName} (UDISE: ${req.udiseNumber}) चे सदस्यत्व ${req.expiresAt ? new Date(req.expiresAt).toLocaleDateString('mr-IN') : 'लवकरच'} संपत आहे. अखंडित सेवेसाठी कृपया नूतनीकरण करा अथवा ॲडमिनशी संपर्क साधा.`
                                      )}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                                title="Send WhatsApp Reminder / व्हॉट्सॲप स्मरणपत्र पाठवा"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              </a>

                              {/* Delete Profile button (2-step confirmation) */}
                              {!isPendingDeletion && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteModal(req)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete Profile (with 28-day retention period)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Referrals & Rewards Management Tab Card */}
        {activeTab === 'referrals' && (
          <div className="space-y-6">
            {/* Referral Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Total Referrals</span>
                <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  {referrals.length}
                </p>
                <span className="text-[11px] text-slate-400">Registered Schools</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/30 shadow-xs">
                <span className="text-xs font-semibold text-emerald-800">Approved Schools</span>
                <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">
                  {referrals.filter((r) => r.registrationStatus === 'active').length}
                </p>
                <span className="text-[11px] text-emerald-600">Active Subscriptions</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/40 shadow-xs">
                <span className="text-xs font-semibold text-amber-800">Eligible for Reward</span>
                <p className="text-2xl font-black text-amber-800 mt-1 font-mono">
                  {referrals.filter((r) => r.rewardStatus === 'eligible').length}
                </p>
                <span className="text-[11px] text-amber-700">
                  Schools pending payout
                </span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Paid Rewards</span>
                <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                  {referrals.filter((r) => r.rewardStatus === 'paid').length}
                </p>
                <span className="text-[11px] text-slate-400">
                  Paid to {referrals.filter((r) => r.rewardStatus === 'paid').length} schools
                </span>
              </div>
            </div>

            {/* Referrals List Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-600" />
                    <span>Referral Directory & Reward Payout Management</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track teacher-referred schools and record direct UPI reward payouts
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadData}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="overflow-x-auto touch-pan-x">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-3 px-4">Referrer Teacher</th>
                      <th className="py-3 px-4">Payout UPI Details</th>
                      <th className="py-3 px-4">Referred School</th>
                      <th className="py-3 px-4">School Status</th>
                      <th className="py-3 px-4">Reward Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {referrals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No referral records available.
                        </td>
                      </tr>
                    ) : (
                      referrals.map((ref) => (
                        <tr key={ref.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{ref.referrerName}</div>
                            <div className="text-[11px] text-slate-500">{ref.referrerSchool}</div>
                            <div className="text-[10px] font-mono text-amber-800 font-semibold mt-0.5">
                              Code: {ref.referrerCode}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {ref.referrerUpiId ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                                  {ref.referrerUpiId}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(ref.referrerUpiId || '');
                                    alert(`UPI ID copied: ${ref.referrerUpiId}`);
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-700 cursor-pointer"
                                  title="Copy UPI ID"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                No UPI registered
                              </span>
                            )}
                            {ref.referrerPhone && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Phone: {ref.referrerPhone}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{ref.referredSchoolName}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              UDISE: {ref.referredUdise}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Registered: {new Date(ref.registeredAt).toLocaleDateString('en-IN')}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {ref.registrationStatus === 'active' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {ref.rewardStatus === 'paid' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Paid</span>
                                </span>
                                {ref.rewardPaymentRef && (
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-xs">
                                    Ref: {ref.rewardPaymentRef}
                                  </div>
                                )}
                              </div>
                            ) : ref.rewardStatus === 'eligible' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Reward Eligible</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">
                                School approval pending
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {ref.rewardStatus !== 'paid' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReferralForPayout(ref);
                                  setPayoutPaymentRef('');
                                  setPayoutAmount(ref.rewardAmount || 0);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                              >
                                <Wallet className="w-3.5 h-3.5" />
                                <span>Pay Reward</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-semibold">
                                ✓ Completed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Manual Reward Payout Modal */}
      {selectedReferralForPayout && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 text-xs max-h-[calc(100dvh-2rem)] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Record Referral Reward Payout
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReferralForPayout(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="my-4 p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2 text-slate-700">
              <div>
                <span className="text-slate-500">Referrer:</span>{' '}
                <span className="font-bold text-slate-900">
                  {selectedReferralForPayout.referrerName} ({selectedReferralForPayout.referrerSchool})
                </span>
              </div>
              <div>
                <span className="text-slate-500">Referred School:</span>{' '}
                <span className="font-semibold text-slate-800">
                  {selectedReferralForPayout.referredSchoolName} ({selectedReferralForPayout.referredUdise})
                </span>
              </div>
              <div className="pt-1 border-t border-amber-200/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[11px]">UPI ID:</span>
                  <span className="font-mono font-bold text-sm text-amber-950">
                    {selectedReferralForPayout.referrerUpiId || 'No UPI registered'}
                  </span>
                </div>
                {selectedReferralForPayout.referrerUpiId && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedReferralForPayout.referrerUpiId || '');
                      setCopiedUpi(true);
                      setTimeout(() => setCopiedUpi(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                  >
                    {copiedUpi ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUpi ? 'Copied!' : 'Copy UPI'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Reward Amount (₹)
                </label>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  UPI Transaction Ref / UTR Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UPI-UTR-49201948123 or GPay Ref"
                  value={payoutPaymentRef}
                  onChange={(e) => setPayoutPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono bg-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!payoutPaymentRef.trim()}
                  onClick={() => {
                    if (!payoutPaymentRef.trim()) {
                      alert('Please enter the UPI transaction reference number.');
                      return;
                    }
                    markRewardAsPaid(selectedReferralForPayout.id, payoutPaymentRef, payoutAmount);
                    setSelectedReferralForPayout(null);
                    loadData();
                    alert(`Reward payout of ₹${payoutAmount} recorded successfully!`);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  Confirm Reward Paid
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReferralForPayout(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Settings Tab Card */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-600" />
                  <span>प्रशासकीय मूलभूत सेटिंग्ज (Super Admin Settings)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  पासकोड सुरक्षा, ईमेल सूचना, सदस्यत्व मुदत आणि डेटाबेस आरोग्य व्यवस्थापित करा
                </p>
              </div>

              {settingsSaveSuccess && (
                <div className="px-3.5 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{settingsSaveSuccess}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveSettings} className="p-4 sm:p-6 space-y-6">
              {/* 1. Security & Passcode */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-slate-900 font-bold text-sm">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>सुरक्षा आणि ॲक्सेस क्रेडेंशियल (Passcode & Security)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Super Admin Passcode <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showSettingsPasscode ? 'text' : 'password'}
                        required
                        value={settingsPasscode}
                        onChange={(e) => setSettingsPasscode(e.target.value)}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSettingsPasscode(!showSettingsPasscode)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showSettingsPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      पॅनलमध्ये लॉगिन करण्यासाठी व खाते पूर्ण नष्ट (Purge) करण्यासाठी वापरला जातो.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Super Admin ईमेल पत्ता (Alerts Email)
                    </label>
                    <input
                      type="email"
                      required
                      value={settingsAdminEmail}
                      onChange={(e) => setSettingsAdminEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      नवीन शाळा नोंदणी आणि नूतनीकरण विनंत्या या ईमेलवर पाठवल्या जातात.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Email Notifications & Resend API */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <Mail className="w-4 h-4 text-amber-600" />
                    <span>ईमेल अलर्ट्स व Resend API (Notifications)</span>
                  </div>

                  <label className="inline-flex items-center cursor-pointer gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      {settingsEmailAlerts ? 'सक्रिय (Enabled)' : 'बंद (Disabled)'}
                    </span>
                    <input
                      type="checkbox"
                      checked={settingsEmailAlerts}
                      onChange={(e) => setSettingsEmailAlerts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600 relative" />
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-800">स्वयंचलित नोंदणी ईमेल सूचना</p>
                    <p className="text-slate-500 text-[11px]">
                      शाळेने प्रवेश विनंती पाठवल्यास <strong>{settingsAdminEmail}</strong> ला तत्काळ सूचना प्राप्त होते.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSendingTestEmail}
                    onClick={handleSendTestEmail}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-semibold text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    {isSendingTestEmail ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>पाठवत आहे...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-amber-600" />
                        <span>Resend चाचणी ईमेल पाठवा</span>
                      </>
                    )}
                  </button>
                </div>

                {emailStatusMsg && (
                  <div className={`p-2.5 rounded-xl text-xs font-medium ${emailStatusMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                    {emailStatusMsg}
                  </div>
                )}
              </div>

              {/* 3. Subscription & Data Retention Defaults */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-slate-900 font-bold text-sm">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>सदस्यत्व व डेटा धारणा नियम (Subscription & Retention)</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      मंजुरीचा डीफॉल्ट कालावधी (Default Approval Duration)
                    </label>
                    <select
                      value={settingsDefaultDuration}
                      onChange={(e) => setSettingsDefaultDuration(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value={3}>३ महिने (3 Months Trial)</option>
                      <option value={6}>६ महिने (6 Months Standard)</option>
                      <option value={12}>१२ महिने (1 Full Academic Year)</option>
                      <option value={24}>२४ महिने (2 Academic Years)</option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      मंजुरी देताना डीफॉल्ट म्हणून निवडलेला कालावधी.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">२८ दिवसांचे डेटा धारणा संरक्षण (28-Day Grace Period)</p>
                    <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                      खाते हटवल्यानंतर शासकीय नियमांनुसार शाळा डेटा २८ दिवसांसाठी राखून ठेवला जातो. या कालावधीत खाते पुन्हा सक्रिय करता येते. २८ दिवस पूर्ण झाल्यावर डेटाबेस व क्लाउडवरून डेटा आपोआप नष्ट होतो.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Cloud Database Health Diagnostics */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <Database className="w-4 h-4 text-amber-600" />
                    <span>क्लाउड डेटाबेस व सिंक आरोग्य (Cloud & Supabase Health)</span>
                  </div>

                  <button
                    type="button"
                    disabled={dbHealth.testing}
                    onClick={handleTestDatabase}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {dbHealth.testing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        <span>तपासत आहे...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                        <span>कनेक्शन तपासा</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Database Provider</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                      <Server className="w-3.5 h-3.5 text-amber-600" />
                      Supabase PostgreSQL
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Connection Status</span>
                    <span className="font-bold mt-1 inline-flex items-center gap-1.5">
                      {dbHealth.testing ? (
                        <span className="text-slate-400">Testing...</span>
                      ) : dbHealth.ok === true ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Connected & Healthy
                        </span>
                      ) : dbHealth.ok === false ? (
                        <span className="text-rose-600 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Error: {dbHealth.error || 'Disconnected'}
                        </span>
                      ) : (
                        <span className="text-slate-600">सक्रिय (Ready)</span>
                      )}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Query Latency</span>
                    <span className="font-mono font-bold text-slate-800 mt-1 block">
                      {dbHealth.latencyMs !== undefined ? `${dbHealth.latencyMs} ms` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Save Changes Button */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>सेटिंग्ज सेव्ह करा (Save Settings)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Duration Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 text-xs max-h-[calc(100dvh-2rem)] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Approve User Access & Subscription Duration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-slate-700">
              <div className="font-bold text-slate-900">{selectedRequest.schoolName}</div>
              <div>UDISE: {selectedRequest.udiseNumber}</div>
              <div>Email: {selectedRequest.userEmail}</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-2">
                  Select Subscription Duration
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '1 Month', months: 1 },
                    { label: '3 Months', months: 3 },
                    { label: '6 Months', months: 6 },
                    { label: '12 Months (1 Year)', months: 12 },
                  ].map((opt) => (
                    <button
                      key={opt.months}
                      type="button"
                      onClick={() => {
                        setApprovalDurationMonths(opt.months);
                        setCustomExpiryDate('');
                      }}
                      className={`p-2.5 rounded-xl border font-semibold text-center transition-all cursor-pointer ${approvalDurationMonths === opt.months && !customExpiryDate
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Or Custom Expiry Date
                </label>
                <input
                  type="date"
                  value={customExpiryDate}
                  onChange={(e) => setCustomExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 bg-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs shadow-md transition-colors cursor-pointer"
                >
                  Confirm & Approve Access
                </button>
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2-Step Password-Protected Account Deletion Modal */}
      {deleteModalRequest && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-rose-200 text-xs max-h-[calc(100dvh-2rem)] flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Trash2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Delete School Profile
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                      {deleteStep === 1 ? 'Confirmation 1/2' : 'Confirmation 2/2'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {deleteStep === 1
                      ? 'First Confirmation: Review 28-day data retention policy and consequences'
                      : 'Second Confirmation: Enter Super Admin Passcode for final confirmation'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalRequest(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* School Profile Summary */}
            <div className="my-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{deleteModalRequest.schoolName}</span>
                <span className="font-mono text-xs text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  UDISE: {deleteModalRequest.udiseNumber}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-600">
                <span>Headmaster: {deleteModalRequest.userName || '-'}</span>
                <span>Email: {deleteModalRequest.userEmail}</span>
                <span>District: {deleteModalRequest.district}</span>
              </div>
            </div>

            {/* STEP 1: First Ask & 28-Day Retention Explanation */}
            {deleteStep === 1 && (
              <div className="space-y-3.5">
                {/* 1st Question Prompt */}
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-xs font-bold text-amber-900">
                      First Confirmation:
                    </strong>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Are you sure you want to delete this profile?
                    </p>
                  </div>
                </div>

                {/* 28-Day Retention Policy Card */}
                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-rose-950 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-rose-900">
                    <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>28-Day Data Retention Guarantee:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-900 leading-normal">
                    <li>
                      <strong>Data is not erased immediately:</strong> For <strong>28 days</strong> following deletion, all school registers, inward stock, and daily records remain safely archived.
                    </li>
                    <li>
                      <strong>Login suspended immediately:</strong> The school/user will no longer be able to log in to the app.
                    </li>
                    <li>
                      <strong>Restore anytime within 28 days:</strong> During this 28-day grace period, the Super Admin can click <strong>'Restore'</strong> at any time to re-activate the account and restore all access.
                    </li>
                    <li>
                      <strong>Permanently Erased after 28 days:</strong> Only once the 28-day period expires will all records be <strong>permanently erased</strong> from cloud databases and storage.
                    </li>
                  </ul>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reason for Deletion (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Subscription cancelled, duplicate account, school closed, etc."
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleProceedToStep2}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Proceed to Step 2: Final Confirmation</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteModalRequest(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Second Ask, Checkbox & Password Verification */}
            {deleteStep === 2 && (
              <div className="space-y-3.5">
                {/* 2nd Question Prompt */}
                <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-rose-950 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-xs font-bold text-rose-900">
                      Second & Final Confirmation:
                    </strong>
                    <p className="text-[11px] text-rose-800 mt-0.5">
                      Do you really want to delete this profile and place it in the 28-day data retention period?
                    </p>
                  </div>
                </div>

                {deleteError && (
                  <div className="p-2.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Enter Super Admin Passcode <span className="text-rose-600">*</span>:
                  </label>
                  <div className="relative">
                    <input
                      type={showDeletePasscode ? 'text' : 'password'}
                      value={deletePasscode}
                      onChange={(e) => {
                        setDeletePasscode(e.target.value);
                        setDeleteError('');
                      }}
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePasscode(!showDeletePasscode)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showDeletePasscode ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    id="ack-delete"
                    checked={deleteAcknowledged}
                    onChange={(e) => setDeleteAcknowledged(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <label htmlFor="ack-delete" className="text-[11px] text-slate-700 cursor-pointer leading-tight">
                    Yes, I confirm that I want to delete <strong>{deleteModalRequest.schoolName}</strong> with a 28-day data retention period, during which data remains restorable.
                  </label>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmScheduleDeletion}
                    disabled={!deletePasscode || !deleteAcknowledged}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm & Delete Profile (Keep Data for 28 Days)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteStep(1)}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteModalRequest(null)}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Immediate Permanent Purge Modal (Bypasses 28-day waiting, Passcode Protected) */}
      {purgeModalRequest && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-rose-300 text-xs max-h-[calc(100dvh-2rem)] flex flex-col overflow-y-auto">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Permanent Purge Account Now
              </h3>
            </div>

            <div className="my-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px] leading-relaxed">
              <strong className="block mb-1 font-bold text-rose-800">
                Caution: This action cannot be undone!
              </strong>
              All data for <strong>{purgeModalRequest.schoolName}</strong> (UDISE: {purgeModalRequest.udiseNumber}) will be <strong>immediately erased</strong> from the cloud database and storage. Enter Super Admin Passcode to purge permanently without waiting 28 days.
            </div>

            {purgeError && (
              <div className="mb-3 p-2.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold">
                {purgeError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Enter Super Admin Passcode:
                </label>
                <div className="relative">
                  <input
                    type={showPurgePasscode ? 'text' : 'password'}
                    placeholder="Super Admin Password..."
                    value={purgePasscode}
                    onChange={(e) => {
                      setPurgePasscode(e.target.value);
                      setPurgeError('');
                    }}
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPurgePasscode(!showPurgePasscode)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPurgePasscode ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmImmediatePurge}
                  disabled={!purgePasscode}
                  className="flex-1 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  Purge Permanently Now
                </button>
                <button
                  type="button"
                  onClick={() => setPurgeModalRequest(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

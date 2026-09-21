import React, { useState, useEffect } from 'react';
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
  getAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getSuperAdminConfig,
  updateSuperAdminConfig,
  sendAdminEmailNotification,
  DEFAULT_SUPER_ADMIN_PASSCODE,
} from '../lib/subscription-store';
import {
  getAllReferrals,
  markRewardAsPaid,
} from '../lib/referral-store';
import { sendTestEmail, sendApprovalConfirmationEmail } from '../lib/email-service';

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
} from 'lucide-react';

interface SuperAdminPanelProps {
  onExit: () => void;
  currentUserEmail?: string;
}

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({
  onExit,
  currentUserEmail,
}) => {
  // Authentication & Passcode gate
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('pm_poshan_admin_auth') === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Data
  const [requests, setRequests] = useState<UserAccessRequest[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [config, setConfig] = useState(getSuperAdminConfig());

  // UI States
  const [activeTab, setActiveTab] = useState<'requests' | 'active' | 'referrals' | 'notifications' | 'settings'>('requests');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Approval Modal State
  const [selectedRequest, setSelectedRequest] = useState<UserAccessRequest | null>(null);
  const [approvalDurationMonths, setApprovalDurationMonths] = useState<number>(6);
  const [customExpiryDate, setCustomExpiryDate] = useState<string>('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Payout Modal State
  const [selectedReferralForPayout, setSelectedReferralForPayout] = useState<ReferralRecord | null>(null);
  const [payoutPaymentRef, setPayoutPaymentRef] = useState('');
  const [payoutAmount, setPayoutAmount] = useState<number>(100);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Email Test alert status
  const [emailStatusMsg, setEmailStatusMsg] = useState<string | null>(null);

  const loadData = () => {
    setRequests(getAllAccessRequests());
    setReferrals(getAllReferrals());
    setNotifications(getAdminNotifications());
    setConfig(getSuperAdminConfig());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const currentConfig = getSuperAdminConfig();
    if (passcode === currentConfig.passcode || passcode === DEFAULT_SUPER_ADMIN_PASSCODE) {
      sessionStorage.setItem('pm_poshan_admin_auth', 'true');
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('अवैध ॲडमिन पासवर्ड (Invalid Passcode)');
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
    const reason = prompt('नामंजूर करण्याचे कारण लिहा (किंवा रिकामे ठेवा):');
    if (reason !== null) {
      rejectOrRevokeAccess(id, reason);
      loadData();
    }
  };

  const handleExtend = (id: string, months: number) => {
    extendSubscription(id, months);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (confirm('तुम्हाला ही विनंती कायमची हटवायची आहे का?')) {
      deleteAccessRequest(id);
      loadData();
    }
  };

  const handleTestEmail = async () => {
    setEmailStatusMsg('Resend द्वारे चाचणी ईमेल पाठवत आहे...');
    const res = await sendTestEmail(config.adminEmail);
    if (res.success) {
      setEmailStatusMsg(`✔ चाचणी ईमेल ${config.adminEmail} वर Resend द्वारे यशस्वीरीत्या पाठवला! (ID: ${res.id || 'ok'})`);
    } else {
      setEmailStatusMsg(`❌ त्रुटी: ${res.message}`);
    }
    setTimeout(() => setEmailStatusMsg(null), 7000);
  };

  // Metrics
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const activeSubscriptions = requests.filter((r) => r.status === 'active');
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
            Super Admin कन्सोल
          </h2>
          <p className="text-xs text-center text-slate-400 mt-1">
            MahaPoshan Register • सुरक्षित डेव्हलपर प्रवेशद्वार
          </p>

          {currentUserEmail && (
            <div className="mt-4 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-center text-xs text-slate-300">
              लॉग इन ईमेल: <span className="font-mono text-amber-300">{currentUserEmail}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Super Admin गुप्त पासवर्ड (Passcode)
              </label>
              <input
                type="password"
                required
                placeholder="पासवर्ड टाका (डिफॉल्ट: Admin@2026)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
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
                लॉग इन करा
              </button>
              <button
                type="button"
                onClick={onExit}
                className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 font-semibold text-slate-300 text-xs transition-colors cursor-pointer"
              >
                रद्द करा
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.udiseNumber.includes(searchTerm) ||
      (r.userName && r.userName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && r.status === statusFilter;
  });

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
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                सदस्यत्व मंजुरी, कालावधी नियंत्रण व वापरकर्ता व्यवस्थापन
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
                title="सूचना (Notifications)"
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
                      सूचना ({notifications.length})
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
                        सर्व वाचले असे चिन्हांकित करा
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">
                        कोणतीही नवीन सूचना नाही
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationAsRead(notif.id);
                            loadData();
                          }}
                          className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                            !notif.read ? 'bg-amber-50/50' : ''
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
              <span>अ‍ॅपवर परत जा (Exit to App)</span>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
              title="लॉग आऊट"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">एकूण विनंत्या</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
              {requests.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/40 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800">मंजुरी प्रलंबित</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-extrabold text-amber-900 mt-2 font-mono">
              {pendingRequests.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/40 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800">सक्रिय सदस्यत्व</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-900 mt-2 font-mono">
              {activeSubscriptions.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">ईमेल नोटिफिकेशन्स</span>
              <Mail className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-700">
                {config.emailAlertsEnabled ? 'चालू (Active)' : 'बंद'}
              </span>
              <button
                type="button"
                onClick={handleTestEmail}
                className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
              >
                चाचणी पाठवा
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
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <School className="w-4 h-4" />
            <span>शाळा प्रवेश विनंत्या (School Requests)</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-amber-300 text-[10px] font-mono">
              {requests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'referrals'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>रेफरल्स व बक्षिसे (Referrals & Rewards)</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-700 text-white text-[10px] font-mono">
              {referrals.length}
            </span>
          </button>
        </div>

        {/* Requests Management Table Card */}
        {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header & Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                शाळा प्रवेश विनंत्या व सदस्यत्व यादी
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                वापरकर्त्यांना मान्यता द्या आणि सदस्यत्व मुदत (Duration) निश्चित करा
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="शाळा, UDISE किंवा ईमेल शोधा..."
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
                <option value="all">सर्व स्थिती (All)</option>
                <option value="pending">फक्त प्रलंबित (Pending)</option>
                <option value="active">फक्त सक्रिय (Active)</option>
                <option value="rejected">नामंजूर (Rejected)</option>
              </select>

              <button
                type="button"
                onClick={loadData}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="रिफ्रेश करा"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">शाळा व UDISE</th>
                  <th className="py-3 px-4">मुख्याध्यापक / ईमेल</th>
                  <th className="py-3 px-4">केंद्र व जिल्हा</th>
                  <th className="py-3 px-4">स्थिती</th>
                  <th className="py-3 px-4">मुदत (Expiry)</th>
                  <th className="py-3 px-4 text-right">कृती (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      कोणतीही विनंती सापडली नाही.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const isPending = req.status === 'pending';
                    const isActive = req.status === 'active';

                    // Compute days remaining
                    let daysLeft = 0;
                    if (req.expiresAt) {
                      daysLeft = Math.ceil(
                        (new Date(req.expiresAt).getTime() - Date.now()) / (1000 * 3600 * 24)
                      );
                    }

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
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
                              <span>✓ अटी मान्य ({req.termsVersion || 'v1.0'})</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{req.userName || '-'}</div>
                          <div className="text-[11px] text-slate-500">{req.userEmail}</div>
                          {req.phone && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              मो: {req.phone}
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
                              प्रलंबित (Pending)
                            </span>
                          )}
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              सक्रिय (Active)
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              नामंजूर
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {isActive && req.expiresAt ? (
                            <div>
                              <div className="font-mono text-slate-800">
                                {new Date(req.expiresAt).toLocaleDateString('mr-IN')}
                              </div>
                              <div
                                className={`text-[10px] font-semibold ${
                                  daysLeft > 30
                                    ? 'text-emerald-700'
                                    : daysLeft > 0
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                {daysLeft > 0 ? `${daysLeft} दिवस शिल्लक` : 'मुदत संपली'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleOpenApproveModal(req)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                              >
                                मंजुरी द्या (Approve)
                              </button>
                            )}

                            {isActive && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleExtend(req.id, 1)}
                                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                                  title="१ महिना मुदत वाढवा"
                                >
                                  +1 महिना
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExtend(req.id, 6)}
                                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                                  title="६ महिने मुदत वाढवा"
                                >
                                  +6 महिने
                                </button>
                              </div>
                            )}

                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleReject(req.id)}
                                className="px-2 py-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs cursor-pointer"
                              >
                                नामंजूर
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDelete(req.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
                              title="हटवा"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
                <span className="text-xs font-semibold text-slate-500">एकूण रेफरल्स</span>
                <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  {referrals.length}
                </p>
                <span className="text-[11px] text-slate-400">नोंदणी केलेल्या शाळा</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/30 shadow-xs">
                <span className="text-xs font-semibold text-emerald-800">मंजूर झालेल्या शाळा</span>
                <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">
                  {referrals.filter((r) => r.registrationStatus === 'active').length}
                </p>
                <span className="text-[11px] text-emerald-600">सक्रिय सदस्यत्व सुरू</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/40 shadow-xs">
                <span className="text-xs font-semibold text-amber-800">बक्षीस देण्यास पात्र</span>
                <p className="text-2xl font-black text-amber-800 mt-1 font-mono">
                  ₹{referrals.filter((r) => r.rewardStatus === 'eligible').reduce((sum, r) => sum + r.rewardAmount, 0)}
                </p>
                <span className="text-[11px] text-amber-700">
                  {referrals.filter((r) => r.rewardStatus === 'eligible').length} शाळा (वितरण बाकी)
                </span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">वितरित केलेले बक्षीस</span>
                <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                  ₹{referrals.filter((r) => r.rewardStatus === 'paid').reduce((sum, r) => sum + r.rewardAmount, 0)}
                </p>
                <span className="text-[11px] text-slate-400">
                  {referrals.filter((r) => r.rewardStatus === 'paid').length} शाळांना अदा केले
                </span>
              </div>
            </div>

            {/* Referrals List Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-600" />
                    <span>रेफरल यादी व बक्षीस वितरण व्यवस्थापन</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    शिक्षकांनी जोडलेल्या शाळा तपासा आणि थेट UPI द्वारे बक्षीस वितरण नोंदवा
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadData}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>रिफ्रेश</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-3 px-4">रेफर करणारा शिक्षक (Referrer)</th>
                      <th className="py-3 px-4">बक्षीस मिळण्यासाठी UPI तपशील</th>
                      <th className="py-3 px-4">जोडलेली नवीन शाळा (Referred School)</th>
                      <th className="py-3 px-4">शाळा स्थिती</th>
                      <th className="py-3 px-4">बक्षीस स्थिती</th>
                      <th className="py-3 px-4 text-right">ॲक्शन (Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {referrals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          सध्या कोणत्याही रेफरल नोंदी उपलब्ध नाहीत.
                        </td>
                      </tr>
                    ) : (
                      referrals.map((ref) => (
                        <tr key={ref.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{ref.referrerName}</div>
                            <div className="text-[11px] text-slate-500">{ref.referrerSchool}</div>
                            <div className="text-[10px] font-mono text-amber-800 font-semibold mt-0.5">
                              कोड: {ref.referrerCode}
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
                                    alert(`UPI ID कॉपी झाला: ${ref.referrerUpiId}`);
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-700 cursor-pointer"
                                  title="UPI ID कॉपी करा"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                UPI नोंदवलेला नाही
                              </span>
                            )}
                            {ref.referrerPhone && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                मो: {ref.referrerPhone}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{ref.referredSchoolName}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              UDISE: {ref.referredUdise}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              नोंदणी: {new Date(ref.registeredAt).toLocaleDateString('mr-IN')}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {ref.registrationStatus === 'active' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>सक्रिय (Approved)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>प्रलंबित (Pending)</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {ref.rewardStatus === 'paid' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>₹{ref.rewardAmount} दिले (Paid)</span>
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
                                <span>बक्षीस पात्र (₹{ref.rewardAmount})</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">
                                शाळा मंजुरी प्रलंबित
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
                                  setPayoutAmount(ref.rewardAmount || 100);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                              >
                                <Wallet className="w-3.5 h-3.5" />
                                <span>बक्षीस द्या (Pay)</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-semibold">
                                ✓ पूर्ण झाले
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  रेफरल बक्षीस वितरण नोंदवा (Manual Reward Payout)
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
                <span className="text-slate-500">रेफर करणारा:</span>{' '}
                <span className="font-bold text-slate-900">
                  {selectedReferralForPayout.referrerName} ({selectedReferralForPayout.referrerSchool})
                </span>
              </div>
              <div>
                <span className="text-slate-500">जोडलेली शाळा:</span>{' '}
                <span className="font-semibold text-slate-800">
                  {selectedReferralForPayout.referredSchoolName} ({selectedReferralForPayout.referredUdise})
                </span>
              </div>
              <div className="pt-1 border-t border-amber-200/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[11px]">UPI ID:</span>
                  <span className="font-mono font-bold text-sm text-amber-950">
                    {selectedReferralForPayout.referrerUpiId || 'UPI नोंदवलेला नाही'}
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
                    <span>{copiedUpi ? 'कॉपी झाले!' : 'Copy UPI'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  बक्षीस रक्कम (₹ Amount)
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
                  UPI ट्रान्झॅक्शन संदर्भ / UTR क्रमांक <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. UPI-UTR-49201948123 किंवा GPay Ref"
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
                      alert('कृपया UPI ट्रान्झॅक्शन संदर्भ क्रमांक टाका.');
                      return;
                    }
                    markRewardAsPaid(selectedReferralForPayout.id, payoutPaymentRef, payoutAmount);
                    setSelectedReferralForPayout(null);
                    loadData();
                    alert(`₹${payoutAmount} चे बक्षीस जमा झाल्याची नोंद यशस्वी झाली!`);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  बक्षीस दिल्याची नोंद करा (Confirm Paid)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReferralForPayout(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  रद्द करा
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Duration Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  वापरकर्ता प्रवेश व मुदत मंजूर करा
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
              <div>ईमेल: {selectedRequest.userEmail}</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-2">
                  सदस्यत्व कालावधी निवडा (Duration)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '१ महिना (1 Month)', months: 1 },
                    { label: '३ महिने (3 Months)', months: 3 },
                    { label: '६ महिने (6 Months)', months: 6 },
                    { label: '१ वर्ष (12 Months)', months: 12 },
                  ].map((opt) => (
                    <button
                      key={opt.months}
                      type="button"
                      onClick={() => {
                        setApprovalDurationMonths(opt.months);
                        setCustomExpiryDate('');
                      }}
                      className={`p-2.5 rounded-xl border font-semibold text-center transition-all cursor-pointer ${
                        approvalDurationMonths === opt.months && !customExpiryDate
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
                  किंवा सानुकूल समाप्ती तारीख (Custom Expiry Date)
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
                  मंजूर करा (Confirm Access)
                </button>
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  रद्द करा
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

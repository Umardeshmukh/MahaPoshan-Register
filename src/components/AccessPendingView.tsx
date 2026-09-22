import React, { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/react';
import {
  UserAccessRequest,
  SubscriptionStatus,
  LegalDocType,
} from '../types';
import {
  submitAccessRequest,
  getUserAccessStatus,
} from '../lib/subscription-store';
import { syncSchoolProfileToCloud } from '../lib/cloud-sync';
import { LegalModal } from './LegalModal';
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from '../lib/legal-docs';
import { validateReferralCode } from '../lib/referral-store';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  School,
  Building2,
  Phone,
  Mail,
  RefreshCw,
  LogOut,
  Send,
  ShieldAlert,
  HelpCircle,
  Gift,
  ShieldCheck,
  FileText,
  Trash2,
} from 'lucide-react';

interface AccessPendingViewProps {
  initialRequest?: UserAccessRequest;
  status: SubscriptionStatus;
  onRefresh: () => void;
}

export const AccessPendingView: React.FC<AccessPendingViewProps> = ({
  initialRequest,
  status,
  onRefresh,
}) => {
  const { user } = useUser();
  const { signOut } = useClerk();

  const [schoolName, setSchoolName] = useState(initialRequest?.schoolName || '');
  const [udiseNumber, setUdiseNumber] = useState(initialRequest?.udiseNumber || '');
  const [centerCluster, setCenterCluster] = useState(initialRequest?.centerCluster || '');
  const [district, setDistrict] = useState(initialRequest?.district || 'पुणे');
  const [phone, setPhone] = useState(initialRequest?.phone || '');
  const [notes, setNotes] = useState(initialRequest?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Referral code state (auto-fill from ?ref= query param if present)
  const [referralCode, setReferralCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlRef = new URLSearchParams(window.location.search).get('ref');
      if (urlRef) return urlRef.toUpperCase();
    }
    return initialRequest?.referralCode || '';
  });
  const [referralFeedback, setReferralFeedback] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  // Legal agreement compulsory checkbox & modal state
  const [agreedToLegal, setAgreedToLegal] = useState<boolean>(
    initialRequest?.agreedToTerms || false
  );
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [activeLegalTab, setActiveLegalTab] = useState<LegalDocType>('terms');

  // Validate referral code on change or load
  useEffect(() => {
    if (referralCode.trim()) {
      const res = validateReferralCode(referralCode, user?.id);
      setReferralFeedback({ valid: res.valid, message: res.message });
    } else {
      setReferralFeedback(null);
    }
  }, [referralCode, user?.id]);

  // Periodically check live approval status from Supabase Cloud
  useEffect(() => {
    if (status !== 'active') {
      const interval = setInterval(() => {
        onRefresh();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [status, onRefresh]);

  const openLegalDoc = (tab: LegalDocType) => {
    setActiveLegalTab(tab);
    setLegalModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName || !udiseNumber) {
      alert('कृपया शाळेचे नाव आणि UDISE क्रमांक भरा.');
      return;
    }

    if (!agreedToLegal) {
      alert('कृपया पुढे जाण्यापूर्वी नियम व अटी (Terms & Conditions) आणि गोपनीयता धोरण (Privacy Policy) मान्य करा.');
      return;
    }

    setIsSubmitting(true);
    try {
      const userEmail = user?.primaryEmailAddress?.emailAddress || 'unknown@example.com';
      const userName = user?.fullName || user?.firstName || 'शिक्षक / मुख्याध्यापक';
      const clerkUserId = user?.id || 'unknown';

      submitAccessRequest({
        clerkUserId,
        userEmail,
        userName,
        schoolName,
        udiseNumber,
        centerCluster,
        district,
        phone,
        notes,
        referralCode: referralCode.trim() ? referralCode.trim().toUpperCase() : undefined,
        // Legal compliance audit trail
        agreedToTerms: true,
        agreedAt: new Date().toISOString(),
        termsVersion: CURRENT_TERMS_VERSION,
        privacyPolicyVersion: CURRENT_PRIVACY_VERSION,
      });

      // Also persist profile to Supabase schools table
      await syncSchoolProfileToCloud(
        {
          schoolName,
          udiseNumber,
          centerCluster,
          standardCategory: 'इयत्ता १ ली ते ५ वी (प्राथमिक)',
          district,
          taluka: '',
          headmasterName: userName,
          inchargeTeacher: '',
          cookName: '',
        },
        clerkUserId,
        userEmail,
        userName
      ).catch((err) => console.warn('Supabase profile sync background notice:', err));

      setSubmittedSuccess(true);
      setTimeout(() => {
        onRefresh();
      }, 600);

    } catch (err) {
      console.error(err);
      alert('विनंती सादर करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenewRequest = () => {
    if (!initialRequest) return;
    submitAccessRequest({
      ...initialRequest,
      notes: 'सदस्यत्व नूतनीकरण विनंती (Renewal Request)',
    });
    alert('नूतनीकरणाची विनंती ॲडमिनकडे पाठवली आहे.');
    onRefresh();
  };

  const hasSubmitted = !!initialRequest || submittedSuccess;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-800 text-white flex items-center justify-center font-bold">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
              MahaPoshan Register • सदस्यत्व व प्रवेश नियंत्रण
            </h1>
            <p className="text-xs text-slate-500">
              खाते: {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>बाहेर पडा (Sign Out)</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full flex flex-col justify-center">
        {/* Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {status === 'pending_deletion' ? (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center mb-4">
                <Trash2 className="w-7 h-7 text-rose-700" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-900 font-semibold text-xs mb-2">
                खाते हटवणे प्रलंबित (Scheduled for Deletion)
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                आपले खाते हटवण्यासाठी चिन्हांकित केले आहे
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
                प्रशासकीय सूचनेनुसार हे खाते बंद करण्यात आले असून पुढील{' '}
                <strong className="text-rose-700 font-bold">
                  {initialRequest?.permanentDeletionDate
                    ? Math.max(
                        0,
                        Math.ceil(
                          (new Date(initialRequest.permanentDeletionDate).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24)
                        )
                      )
                    : 28}{' '}
                  दिवसांत
                </strong>{' '}
                नोंदवहीतील सर्व डेटा (रजिस्टर, शाळा माहिती, साठा) क्लाउडवरून कायमचा नष्ट केला जाईल.
              </p>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 max-w-md mx-auto">
                <p className="font-semibold">खाते पूर्ववत (Restore) करावयाचे असल्यास:</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  कृपया मुदत संपण्यापूर्वी त्वरित Super Admin शी संपर्क साधा: <strong>umardesh@gmail.com</strong>
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>स्थिती पुन्हा तपासा (Check Status)</span>
                </button>
              </div>
            </div>
          ) : status === 'expired' ? (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-amber-700" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold text-xs mb-2">
                सदस्यत्व मुदत संपली (Subscription Expired)
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                आपल्या नोंदवहीचे सदस्यत्व समाप्त झाले आहे
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-lg mx-auto">
                आपल्या शाळेसाठी देण्यात आलेली प्रवेश मुदत संपली आहे.
                पुढील नोंदणी व वापरासाठी कृपया सदस्यत्व नूतनीकरण करा किंवा ॲडमिनशी संपर्क साधा.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRenewRequest}
                  className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>नूतनीकरणासाठी विनंती पाठवा</span>
                </button>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  स्थिती पुन्हा तपासा (Refresh)
                </button>
              </div>
            </div>
          ) : hasSubmitted ? (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mb-4">
                <Clock className="w-7 h-7 text-amber-700 animate-spin-slow" />
              </div>

              <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold text-xs mb-2">
                प्रवेश मंजुरी प्रक्रियेत आहे (Approval Pending)
              </span>

              <h2 className="text-xl font-bold text-slate-900">
                आपली विनंती ॲडमिन मंजुरीच्या प्रतीक्षेत आहे
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
                आपली शाळा नोंदणी विनंती यशस्वीरीत्या प्राप्त झाली आहे.
                सुपर ॲडमिनद्वारे खातरजमा करून सदस्यत्व कालावधी मंजूर केल्यावर आपले खाते त्वरित सुरू होईल.
              </p>

              {/* Submitted Details Box */}
              {initialRequest && (
                <div className="mt-6 text-left bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200/80 max-w-lg mx-auto text-xs space-y-2.5">
                  <div className="font-semibold text-slate-800 pb-2 border-b border-slate-200 flex items-center justify-between">
                    <span>नोंदणी तपशील:</span>
                    <span className="text-amber-800 font-mono">
                      {new Date(initialRequest.requestedAt).toLocaleDateString('mr-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">शाळेचे नाव:</span>
                    <span className="font-medium text-slate-900">{initialRequest.schoolName}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">UDISE क्रमांक:</span>
                    <span className="font-mono font-medium text-slate-900">{initialRequest.udiseNumber}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">केंद्र / जिल्हा:</span>
                    <span className="font-medium text-slate-900">
                      {initialRequest.centerCluster || '-'} / {initialRequest.district}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">ईमेल:</span>
                    <span className="font-medium text-slate-900">{initialRequest.userEmail}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>स्थिती अपडेट करा (Check Status)</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                  <Building2 className="w-6 h-6 text-amber-700" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  शाळा तपशील नोंदवा व प्रवेश विनंती करा
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  आपल्या शाळेचे PM POSHAN दैनिक हिशोब सुरू करण्यासाठी खालील माहिती भरून ॲडमिनकडे विनंती सादर करा.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    शाळेचे अधिकृत नाव <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. जि. प. प्राथमिक शाळा..."
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      UDISE क्रमांक (११ अंकी) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      placeholder="उदा. 27251403201"
                      value={udiseNumber}
                      onChange={(e) => setUdiseNumber(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      केंद्र / Kendra
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. केंद्र वडगाव"
                      value={centerCluster}
                      onChange={(e) => setCenterCluster(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      जिल्हा
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      संपर्क मोबाईल क्र.
                    </label>
                    <input
                      type="tel"
                      placeholder="उदा. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    अतिरिक्त टीप / संदेश (पर्यायी)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="उदा. प्राथमिक विभागासाठी वार्षिक नोंदवही..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                  />
                </div>

                {/* Referral Code Input (Optional) */}
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-800 flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-amber-700" />
                      <span>रेफरल कोड (Referral Code - ऐच्छिक)</span>
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                      बक्षीस योजना
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="उदा. MP-PUNE98 किंवा MP-272501"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 font-mono uppercase bg-white text-xs"
                  />
                  {referralFeedback && (
                    <p
                      className={`text-[11px] font-medium flex items-center gap-1 ${
                        referralFeedback.valid ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {referralFeedback.valid ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{referralFeedback.message}</span>
                    </p>
                  )}
                </div>

                {/* Compulsory Legal Agreement Checkbox */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      required
                      checked={agreedToLegal}
                      onChange={(e) => setAgreedToLegal(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-amber-700 focus:ring-amber-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 leading-snug">
                      <span className="font-semibold text-slate-900">
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={() => openLegalDoc('terms')}
                          className="text-amber-800 font-bold underline hover:text-amber-950 inline cursor-pointer"
                        >
                          Terms & Conditions
                        </button>{' '}
                        and{' '}
                        <button
                          type="button"
                          onClick={() => openLegalDoc('privacy')}
                          className="text-amber-800 font-bold underline hover:text-amber-950 inline cursor-pointer"
                        >
                          Privacy Policy
                        </button>
                        . <span className="text-rose-600">*</span>
                      </span>
                      <br />
                      <span className="text-[11px] text-slate-500">
                        (मी महापोषण रजिस्टरचे सर्व नियम व अटी आणि गोपनीयता धोरण वाचले असून ते मला मान्य आहेत.)
                      </span>
                    </span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !agreedToLegal}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-amber-700/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'पाठवत आहे...' : 'प्रवेश विनंती पाठवा (Submit Request)'}</span>
                  </button>
                  {!agreedToLegal && (
                    <p className="text-[11px] text-center text-amber-800 mt-1.5 font-medium">
                      * नोंदणी करण्यासाठी वरील नियम व अटींचा चेकबॉक्स निवडणे अनिवार्य आहे.
                    </p>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Support & Helpline Card */}
        <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
            <span>काही अडचण किंवा तात्काळ मंजुरी हवी असल्यास संपर्क: </span>
            <span className="font-semibold text-slate-700">support@mahaposhan.in</span>
          </p>
        </div>
      </main>

      {/* Footer with 4 Mandatory Legal Links */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            MahaPoshan Register • महाराष्ट्र शासन शालेय पोषण आहार (PM POSHAN)
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]">
            <button
              type="button"
              onClick={() => openLegalDoc('terms')}
              className="text-slate-600 hover:text-amber-800 hover:underline cursor-pointer transition-colors"
            >
              1. Terms & Conditions (नियम व अटी)
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => openLegalDoc('privacy')}
              className="text-slate-600 hover:text-amber-800 hover:underline cursor-pointer transition-colors"
            >
              2. Privacy Policy (गोपनीयता)
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => openLegalDoc('refund')}
              className="text-slate-600 hover:text-amber-800 hover:underline cursor-pointer transition-colors"
            >
              3. Refund Policy (परतावा धोरण)
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => openLegalDoc('contact')}
              className="text-slate-600 hover:text-amber-800 hover:underline cursor-pointer transition-colors"
            >
              4. Contact / Legal Info (संपर्क)
            </button>
          </div>
        </div>
      </footer>

      {/* Legal Documents Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        initialTab={activeLegalTab}
        onClose={() => setLegalModalOpen(false)}
      />
    </div>
  );
};

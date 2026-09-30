import React, { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/react';
import {
  UserAccessRequest,
  SubscriptionStatus,
  LegalDocType,
  SchoolProfile,
} from '../types';
import {
  submitAccessRequest,
  getUserAccessStatus,
  resubmitMoreInfoRequest,
} from '../lib/subscription-store';
import { syncSchoolProfileToCloud, lookupSchoolByUdise } from '../lib/cloud-sync';
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
  Search,
  Check,
  ArrowRight,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

interface AccessPendingViewProps {
  initialRequest?: UserAccessRequest;
  status: SubscriptionStatus;
  onRefresh: () => void;
  onSuccess?: (schoolData: Partial<SchoolProfile>) => void;
}

export const AccessPendingView: React.FC<AccessPendingViewProps> = ({
  initialRequest,
  status,
  onRefresh,
  onSuccess,
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

  // Two-Stage UDISE Discovery State
  const [searchUdise, setSearchUdise] = useState(initialRequest?.udiseNumber || '');
  const [isSearchingUdise, setIsSearchingUdise] = useState(false);
  const [existingSchoolFound, setExistingSchoolFound] = useState<any | null>(null);
  const [isConfirmedExistingSchool, setIsConfirmedExistingSchool] = useState(false);
  const [isNewSchoolForm, setIsNewSchoolForm] = useState(false);

  // More Info Required State
  const [isEditingMoreInfo, setIsEditingMoreInfo] = useState(false);
  const [moreInfoName, setMoreInfoName] = useState(initialRequest?.schoolName || '');
  const [moreInfoUdise, setMoreInfoUdise] = useState(initialRequest?.udiseNumber || '');
  const [moreInfoCluster, setMoreInfoCluster] = useState(initialRequest?.centerCluster || '');
  const [moreInfoDistrict, setMoreInfoDistrict] = useState(initialRequest?.district || 'पुणे');
  const [moreInfoPhone, setMoreInfoPhone] = useState(initialRequest?.phone || '');
  const [moreInfoNotes, setMoreInfoNotes] = useState('');
  const [isSubmittingMoreInfo, setIsSubmittingMoreInfo] = useState(false);

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

  // Visibility-aware adaptive backoff status check (replaces fixed 10s polling for scale)
  useEffect(() => {
    if (status === 'active') return;

    let timerId: ReturnType<typeof setTimeout> | null = null;
    let currentDelayMs = 15000; // Start at 15s, scale up to 90s max
    let isCancelled = false;

    const scheduleNextCheck = () => {
      if (isCancelled) return;
      timerId = setTimeout(() => {
        if (typeof document === 'undefined' || document.visibilityState === 'visible') {
          onRefresh();
          currentDelayMs = Math.min(90000, Math.round(currentDelayMs * 1.5));
        }
        scheduleNextCheck();
      }, currentDelayMs);
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        currentDelayMs = 15000;
        onRefresh();
      }
    };

    scheduleNextCheck();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [status, onRefresh]);

  const openLegalDoc = (tab: LegalDocType) => {
    setActiveLegalTab(tab);
    setLegalModalOpen(true);
  };

  // Stage 2: Look up School by UDISE
  const handleLookupUdise = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = searchUdise.trim();
    if (!clean) {
      alert('कृपया ११ अंकी UDISE क्रमांक प्रविष्ट करा.');
      return;
    }
    if (!/^\d{11}$/.test(clean)) {
      alert('UDISE क्रमांक अचूक ११ अंकांचा असावा (उदा. 27251403201).');
      return;
    }

    setIsSearchingUdise(true);
    try {
      const res = await lookupSchoolByUdise(clean);
      if (res?.exists && res.school) {
        setExistingSchoolFound(res.school);
        setIsNewSchoolForm(false);
      } else {
        setExistingSchoolFound(null);
        setIsNewSchoolForm(true);
        setUdiseNumber(clean);
      }
    } catch (err) {
      console.error(err);
      setIsNewSchoolForm(true);
      setUdiseNumber(clean);
    } finally {
      setIsSearchingUdise(false);
    }
  };

  const handleConfirmExistingSchool = () => {
    if (!existingSchoolFound) return;
    setSchoolName(existingSchoolFound.schoolName);
    setUdiseNumber(existingSchoolFound.udiseNumber);
    setCenterCluster(existingSchoolFound.centerCluster || '');
    setDistrict(existingSchoolFound.district || 'पुणे');
    setIsConfirmedExistingSchool(true);
  };

  const handleResetUdiseLookup = () => {
    setExistingSchoolFound(null);
    setIsConfirmedExistingSchool(false);
    setIsNewSchoolForm(false);
    setSearchUdise('');
    setSchoolName('');
    setUdiseNumber('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSchoolName = isConfirmedExistingSchool && existingSchoolFound ? existingSchoolFound.schoolName : schoolName;
    const finalUdise = isConfirmedExistingSchool && existingSchoolFound ? existingSchoolFound.udiseNumber : udiseNumber;

    if (!finalSchoolName || !finalUdise) {
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

      const assignedRole = isConfirmedExistingSchool ? 'TEACHER' : 'SCHOOL_ADMIN';
      const targetSchoolId = isConfirmedExistingSchool && existingSchoolFound ? existingSchoolFound.id : undefined;

      submitAccessRequest({
        clerkUserId,
        schoolId: targetSchoolId,
        role: assignedRole,
        userEmail,
        userName,
        schoolName: finalSchoolName,
        udiseNumber: finalUdise,
        centerCluster: isConfirmedExistingSchool && existingSchoolFound ? (existingSchoolFound.centerCluster || '') : centerCluster,
        district: isConfirmedExistingSchool && existingSchoolFound ? (existingSchoolFound.district || 'पुणे') : district,
        phone,
        notes: isConfirmedExistingSchool ? 'विद्यमान शाळेत शिक्षक म्हणून सामील होण्याची विनंती' : notes,
        referralCode: referralCode.trim() ? referralCode.trim().toUpperCase() : undefined,
        // Legal compliance audit trail
        agreedToTerms: true,
        agreedAt: new Date().toISOString(),
        termsVersion: CURRENT_TERMS_VERSION,
        privacyPolicyVersion: CURRENT_PRIVACY_VERSION,
      });

      const schoolProfileData = {
        id: targetSchoolId,
        schoolName: finalSchoolName,
        udiseNumber: finalUdise,
        centerCluster: isConfirmedExistingSchool && existingSchoolFound ? (existingSchoolFound.centerCluster || '') : centerCluster,
        standardCategory: 'इयत्ता १ ली ते ५ वी (प्राथमिक)',
        district: isConfirmedExistingSchool && existingSchoolFound ? (existingSchoolFound.district || 'पुणे') : district,
        taluka: '',
        headmasterName: isConfirmedExistingSchool && existingSchoolFound?.headmasterName ? existingSchoolFound.headmasterName : userName,
        inchargeTeacher: isConfirmedExistingSchool ? userName : '',
        cookName: '',
      };

      // Also persist profile to Supabase schools table if creating new school
      if (!isConfirmedExistingSchool) {
        await syncSchoolProfileToCloud(
          schoolProfileData,
          clerkUserId,
          userEmail,
          userName
        ).catch((err) => console.warn('Supabase profile sync background notice:', err));
      }

      if (onSuccess) {
        onSuccess(schoolProfileData);
      }
      setSubmittedSuccess(true);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('नोंदणी करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmitMoreInfo = () => {
    if (!initialRequest) return;
    if (!moreInfoName || !moreInfoUdise) {
      alert('कृपया शाळेचे नाव आणि UDISE क्रमांक भरा.');
      return;
    }

    setIsSubmittingMoreInfo(true);
    try {
      resubmitMoreInfoRequest(initialRequest.id, {
        schoolName: moreInfoName,
        udiseNumber: moreInfoUdise,
        centerCluster: moreInfoCluster,
        district: moreInfoDistrict,
        phone: moreInfoPhone,
        notes: moreInfoNotes || initialRequest.notes,
      });
      alert('दुरुस्त केलेली माहिती सुपर ॲडमिनकडे पुन्हा सादर केली आहे.');
      setIsEditingMoreInfo(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('माहिती सादर करताना त्रुटी आली.');
    } finally {
      setIsSubmittingMoreInfo(false);
    }
  };

  const handleRenewRequest = () => {
    if (!initialRequest) return;
    submitAccessRequest({
      ...initialRequest,
      notes: 'सदस्यत्व नूतनीकरण (Renewal Request)',
    });
    alert('सदस्यत्व नूतनीकरणाची विनंती Super Admin (umardesh@gmail.com) कडे पाठवण्यात आली आहे. मंजुरी मिळताच आपले खाते सक्रिय होईल.');
    onRefresh();
  };

  const isMoreInfoRequired = initialRequest?.verificationStatus === 'MORE_INFO_REQUIRED';
  const isApproved = status === 'active' || initialRequest?.verificationStatus === 'VERIFIED';
  const isRejected = status === 'rejected' || initialRequest?.verificationStatus === 'REJECTED';
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
                  कृपया मुदत संपण्यापूर्वी त्वरित Super Admin शी संपर्क साधा: <strong>poshanragister@gmail.com</strong>
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
                पुढील दैनंदिन नोंदणी व वापरासाठी कृपया खालील बटणाद्वारे सदस्यत्व नूतनीकरण (Renewal) करा.
              </p>

              <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 max-w-lg mx-auto flex items-start gap-2.5 text-left">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">आपल्या शाळेचा संपूर्ण डेटा १००% सुरक्षित आहे (School Data Preserved)</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    सदस्यत्व मुदत संपली तरीही आपल्या शाळेची दैनंदिन नोंदवही, धान्य साठा व प्रोफाईल माहिती कधीही डिलीट केली जात नाही. नूतनीकरण होताच सर्व नोंदी जशास तशा उपलब्ध होतील.
                  </p>
                </div>
              </div>

              {initialRequest && (
                <div className="mt-4 text-left bg-slate-50 rounded-xl p-4 border border-slate-200 max-w-lg mx-auto text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">शाळेचे नाव:</span>
                    <span className="font-semibold text-slate-900">{initialRequest.schoolName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">UDISE क्रमांक:</span>
                    <span className="font-mono font-semibold text-slate-900">{initialRequest.udiseNumber}</span>
                  </div>
                  {initialRequest.expiresAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">संपलेली मुदत:</span>
                      <span className="font-mono font-semibold text-rose-700">
                        {new Date(initialRequest.expiresAt).toLocaleDateString('mr-IN')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRenewRequest}
                  className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>नूतनीकरणासाठी विनंती पाठवा (Request Renewal)</span>
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
          ) : isApproved ? (
            /* 8. User Status Screen: APPROVED */
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-700" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-semibold text-xs mb-2">
                शाळा पडताळणी पूर्ण • सदस्यत्व सक्रिय (Verified & Active)
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                आपले MahaPoshan Register खाते सुरू झाले आहे!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-lg mx-auto">
                सुपर ॲडमिन द्वारे शाळेची खातरजमा झाली असून सदस्यत्व सक्रिय करण्यात आले आहे. आपण आता नोंदवही वापरू शकता.
              </p>

              {initialRequest && (
                <div className="mt-6 text-left bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200/80 max-w-lg mx-auto text-xs space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">शाळेचे नाव:</span>
                    <span className="font-semibold text-slate-900">{initialRequest.schoolName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">UDISE:</span>
                    <span className="font-mono font-semibold text-slate-900">{initialRequest.udiseNumber}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">भूमिका (Role):</span>
                    <span className="font-semibold text-amber-800">{initialRequest.role || 'TEACHER'}</span>
                  </div>
                  {initialRequest.approvedAt && (
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">सक्रिय दिनांक (Activation):</span>
                      <span className="font-mono text-slate-700">
                        {new Date(initialRequest.approvedAt).toLocaleDateString('mr-IN')}
                      </span>
                    </div>
                  )}
                  {initialRequest.expiresAt && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">सदस्यत्व मुदत (Expiry Date):</span>
                      <span className="font-mono font-semibold text-emerald-800">
                        {new Date(initialRequest.expiresAt).toLocaleDateString('mr-IN')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>नोंदवहीत प्रवेश करा (Open Register)</span>
                </button>
              </div>
            </div>
          ) : isMoreInfoRequired ? (
            /* 8. User Status Screen: MORE_INFO_REQUIRED */
            <div className="text-left">
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                  <AlertCircle className="w-7 h-7 text-amber-700" />
                </div>
                <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold text-xs mb-2">
                  अतिरिक्त माहिती आवश्यक (More Information Required)
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  सुपर ॲडमिनने माहिती सुधारणेची विनंती केली आहे
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-lg mx-auto">
                  खालील प्रशासकीय संदेश वाचा आणि आवश्यक दुरुस्ती करून पुन्हा सादर करा.
                </p>
              </div>

              {/* Admin Feedback Box */}
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl mb-6 max-w-lg mx-auto">
                <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5 mb-1">
                  <ShieldAlert className="w-4 h-4 text-amber-800" />
                  <span>ॲडमिन संदेश (Admin Message):</span>
                </p>
                <p className="text-xs text-amber-900 bg-white p-3 rounded-lg border border-amber-200 leading-relaxed font-medium">
                  {initialRequest?.adminFeedback || initialRequest?.notes || 'कृपया UDISE क्रमांक व शाळेचे अचूक नाव तपासून दुरुस्ती करा.'}
                </p>
              </div>

              {/* Editable Correction Form */}
              <form onSubmit={handleResubmitMoreInfo} className="space-y-4 max-w-lg mx-auto text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    शाळेचे अधिकृत नाव <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={moreInfoName}
                    onChange={(e) => setMoreInfoName(e.target.value)}
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
                      value={moreInfoUdise}
                      onChange={(e) => setMoreInfoUdise(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      केंद्र / Kendra
                    </label>
                    <input
                      type="text"
                      value={moreInfoCluster}
                      onChange={(e) => setMoreInfoCluster(e.target.value)}
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
                      value={moreInfoDistrict}
                      onChange={(e) => setMoreInfoDistrict(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      संपर्क मोबाईल क्र.
                    </label>
                    <input
                      type="tel"
                      value={moreInfoPhone}
                      onChange={(e) => setMoreInfoPhone(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    दुरुस्तीबाबत खुलासा / टीप (Correction Note)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="उदा. UDISE क्रमांक दुरुस्त केला असून शाळेचे नाव अपडेट केले आहे."
                    value={moreInfoNotes}
                    onChange={(e) => setMoreInfoNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmittingMoreInfo}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-700/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingMoreInfo ? 'सादर होत आहे...' : 'दुरुस्ती सादर करा (Resubmit Updated Details)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                  >
                    रिफ्रेश
                  </button>
                </div>
              </form>
            </div>
          ) : isRejected ? (
            /* 8. User Status Screen: REJECTED */
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center mb-4">
                <ShieldAlert className="w-7 h-7 text-rose-700" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-900 font-semibold text-xs mb-2">
                प्रवेश विनंती नाकारली (Request Rejected)
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                आपली नोंदणी विनंती मंजूर झालेली नाही
              </h2>
              <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-left max-w-lg mx-auto">
                <p className="text-xs font-semibold text-rose-900 mb-1">नाकारण्याचे कारण (Reason):</p>
                <p className="text-xs text-rose-800 leading-relaxed font-mono">
                  {initialRequest?.notes || 'प्रशासकीय खातरजमा पूर्ण न झाल्याने ही विनंती नाकारण्यात आली आहे.'}
                </p>
              </div>
              <p className="text-xs text-slate-600 mt-4 max-w-lg mx-auto">
                आपण माहिती दुरुस्त करून नवीन विनंती सादर करू शकता किंवा सुपर ॲडमिनशी संपर्क साधू शकता.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedSuccess(false);
                    handleResetUdiseLookup();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>माहिती सुधारून पुन्हा सादर करा (Resubmit Request)</span>
                </button>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                >
                  स्थिती तपासा
                </button>
              </div>
            </div>
          ) : hasSubmitted ? (
            /* 8. User Status Screen: PENDING VERIFICATION */
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mb-4">
                <Clock className="w-7 h-7 text-amber-700 animate-pulse" />
              </div>

              <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold text-xs mb-2">
                प्रवेश मंजुरी प्रलंबित (School Verification Pending)
              </span>

              <h2 className="text-xl font-bold text-slate-900">
                आपली शाळा नोंदणी विनंती तपासणीत आहे!
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
                आपल्या शाळेची माहिती सुपर ॲडमिन (<strong className="text-slate-800 font-semibold">umardesh@gmail.com</strong>) कडे मंजुरीसाठी पाठवण्यात आली आहे. खातरजमा करून मंजुरी दिल्यावर आपले खाते त्वरित सुरू होईल.
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
                    <span className="text-slate-500">अर्जदार भूमिका (Role):</span>
                    <span className="font-medium text-amber-800">{initialRequest.role || 'SCHOOL_ADMIN'}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">ईमेल:</span>
                    <span className="font-medium text-slate-900">{initialRequest.userEmail}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">स्वयंचलित तपासणी (Auto-Validation):</span>
                    <span className="font-mono font-semibold text-slate-800 bg-slate-200 px-2 py-0.5 rounded text-[11px]">
                      {initialRequest.validationResult || 'REQUIRES_REVIEW'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-t border-slate-200 pt-2">
                    <span className="text-slate-500">पुढील पायरी (Next Step):</span>
                    <span className="font-semibold text-amber-900">
                      सुपर ॲडमिन पडताळणी व सदस्यत्व सक्रियीकरण
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-md shadow-amber-700/20 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>स्थिती तपासा (Check Live Approval Status)</span>
                </button>
              </div>

              {/* Support & Admin Contact Card */}
              <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center max-w-md mx-auto">
                <p className="text-xs text-slate-700 font-semibold flex items-center justify-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-700" />
                  <span>सुपर ॲडमिन संपर्क (Admin Alert Sent To):</span>
                </p>
                <a
                  href="mailto:umardesh@gmail.com"
                  className="font-mono text-xs font-bold text-amber-950 underline hover:text-amber-800 mt-1 inline-block"
                >
                  umardesh@gmail.com
                </a>
                <p className="text-[11px] text-slate-500 mt-1">
                  प्रणाली दर १० सेकंदांनी स्वयंचलितपणे मंजुरी तपासत आहे. मंजुरी मिळताच ॲप आपोआप सुरू होईल.
                </p>
              </div>
            </div>
          ) : (
            /* 1. TWO-STAGE REGISTRATION - Stage 2: Identify School using UDISE */
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                  <Building2 className="w-6 h-6 text-amber-700" />
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold text-xs mb-2">
                  पायरी २: शाळा ओळख व पडताळणी (Stage 2: Identify School)
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  आपली शाळा शोधा किंवा नवीन नोंदवा
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  शाळेचा ११ अंकी UDISE क्रमांक टाका. शाळा आधीच नोंदणीकृत असल्यास आपण थेट शिक्षक म्हणून सामील होऊ शकता.
                </p>
              </div>

              {/* Stage 2.A: UDISE Lookup Form */}
              {!existingSchoolFound && !isNewSchoolForm && (
                <form onSubmit={handleLookupUdise} className="space-y-4 max-w-md mx-auto text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      शाळेचा ११ अंकी UDISE क्रमांक <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        maxLength={11}
                        placeholder="उदा. 27251403201"
                        value={searchUdise}
                        onChange={(e) => setSearchUdise(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 font-mono text-sm bg-white"
                      />
                      <button
                        type="submit"
                        disabled={isSearchingUdise || searchUdise.length !== 11}
                        className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        {isSearchingUdise ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Building2 className="w-4 h-4" />
                        )}
                        <span>शोधा (Lookup)</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      अचूक ११ अंकांचा UDISE टाका. आधीपासून नोंदणीकृत शाळा असेल तर पुनरावृत्ती टळेल.
                    </p>
                  </div>
                </form>
              )}

              {/* Stage 2.B: Existing School Found - Confirm & Join as Teacher */}
              {existingSchoolFound && (
                <div className="space-y-4 max-w-lg mx-auto text-xs">
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold mb-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                      <span>विद्यमान शाळा सापडली (Existing School Found)</span>
                    </div>
                    <div className="space-y-1.5 text-slate-800 bg-white p-3.5 rounded-xl border border-emerald-200">
                      <div className="flex justify-between">
                        <span className="text-slate-500">शाळेचे नाव:</span>
                        <span className="font-bold text-slate-900">{existingSchoolFound.schoolName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">UDISE:</span>
                        <span className="font-mono font-bold text-slate-900">{existingSchoolFound.udiseNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">केंद्र / जिल्हा:</span>
                        <span className="font-medium text-slate-800">
                          {existingSchoolFound.centerCluster || '-'} / {existingSchoolFound.district || 'पुणे'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">आपली भूमिका:</span>
                        <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                          शिक्षक (TEACHER)
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-900 mt-2 font-medium">
                      ही शाळा महापोषण रजिस्टरवर आधीच पडताळलेली आहे. आपल्याला शाळेची माहिती पुन्हा भरण्याची गरज नाही.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        आपला संपर्क मोबाईल क्र. <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="उदा. 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 bg-white"
                      />
                    </div>

                    {/* Referral Code (Optional) */}
                    <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block font-semibold text-slate-800 flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-amber-700" />
                          <span>रेफरल कोड (Referral Code - ऐच्छिक)</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="उदा. MP-PUNE98 किंवा MP-272501"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 font-mono uppercase bg-white text-xs"
                      />
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
                        </span>
                      </label>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="submit"
                        disabled={isSubmitting || !agreedToLegal}
                        onClick={handleConfirmExistingSchool}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isSubmitting ? 'सामील होत आहे...' : 'या शाळेत शिक्षक म्हणून सामील व्हा (Confirm & Join)'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetUdiseLookup}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                      >
                        दुसरा UDISE शोधा
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Stage 2.C: New School Form (UDISE doesn't exist) */}
              {isNewSchoolForm && (
                <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto text-xs">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                    <p className="font-semibold">नवीन शाळा नोंदणी (New School Registration)</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      हा UDISE क्रमांक ({udiseNumber}) नवीन आहे. शाळेची मूलभूत माहिती भरा आणि सुपर ॲडमिन पडताळणीसाठी पाठवा.
                    </p>
                  </div>

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
                        value={udiseNumber}
                        onChange={(e) => setUdiseNumber(e.target.value.replace(/\D/g, ''))}
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

                  <div className="pt-2 flex gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting || !agreedToLegal}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-amber-700/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? 'नोंदणी होत आहे...' : 'शाळा पडताळणी विनंती पाठवा (Submit for Verification)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetUdiseLookup}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                    >
                      दुसरा UDISE शोधा
                    </button>
                  </div>
                  {!agreedToLegal && (
                    <p className="text-[11px] text-center text-amber-800 mt-1.5 font-medium">
                      * नोंदणी करण्यासाठी वरील नियम व अटींचा चेकबॉक्स निवडणे अनिवार्य आहे.
                    </p>
                  )}
                </form>
              )}
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

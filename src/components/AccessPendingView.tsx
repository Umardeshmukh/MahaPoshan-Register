import React, { useState } from 'react';
import { useUser, useClerk } from '@clerk/react';
import {
  UserAccessRequest,
  SubscriptionStatus,
} from '../types';
import {
  submitAccessRequest,
  getUserAccessStatus,
} from '../lib/subscription-store';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName || !udiseNumber) {
      alert('कृपया शाळेचे नाव आणि UDISE क्रमांक भरा.');
      return;
    }

    setIsSubmitting(true);
    try {
      submitAccessRequest({
        clerkUserId: user?.id || 'unknown',
        userEmail: user?.primaryEmailAddress?.emailAddress || 'unknown@example.com',
        userName: user?.fullName || user?.firstName || 'शिक्षक / मुख्याध्यापक',
        schoolName,
        udiseNumber,
        centerCluster,
        district,
        phone,
        notes,
      });

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
          {status === 'expired' ? (
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
                      केंद्र / Cluster
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

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-700/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'पाठवत आहे...' : 'प्रवेश विनंती पाठवा (Submit Request)'}</span>
                  </button>
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

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 px-4 text-center text-[11px] text-slate-400">
        MahaPoshan Register • सुरक्षित सदस्यत्व प्रणाली
      </footer>
    </div>
  );
};

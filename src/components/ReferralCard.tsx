import React, { useState, useEffect } from 'react';
import {
  getOrCreateUserReferralCode,
  getReferralStats,
  getUserPayoutDetails,
  saveUserPayoutDetails,
  DEFAULT_REWARD_PER_SCHOOL,
} from '../lib/referral-store';
import { ReferralStats, UserPayoutDetails } from '../types';
import {
  Gift,
  Share2,
  Copy,
  CheckCircle2,
  Send,
  Users,
  Wallet,
  Sparkles,
  ArrowRight,
  School,
  X,
  Clock,
  CheckCheck,
} from 'lucide-react';

interface ReferralCardProps {
  user?: {
    id: string;
    fullName?: string | null;
    firstName?: string | null;
    primaryEmailAddress?: { emailAddress: string } | null;
  } | null;
  schoolName?: string;
  udiseNumber?: string;
  isModal?: boolean;
  onClose?: () => void;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({
  user,
  schoolName,
  udiseNumber,
  isModal = false,
  onClose,
}) => {
  const userId = user?.id || 'demo_user';
  const userName = user?.fullName || user?.firstName || 'शिक्षक';
  const userEmail = user?.primaryEmailAddress?.emailAddress || '';

  const [referralCode, setReferralCode] = useState<string>('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // UPI Payout State
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [payoutSavedSuccess, setPayoutSavedSuccess] = useState(false);

  useEffect(() => {
    if (userId) {
      const code = getOrCreateUserReferralCode({
        id: userId,
        name: userName,
        email: userEmail,
        schoolName,
        udise: udiseNumber,
      });
      setReferralCode(code);
      setStats(getReferralStats(code));

      const existingPayout = getUserPayoutDetails(userId);
      if (existingPayout) {
        setUpiId(existingPayout.upiId || '');
        setPhone(existingPayout.phone || '');
      }
    }
  }, [userId, userName, userEmail, schoolName, udiseNumber]);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${referralCode}`
    : `https://poshanregister.netlify.app/?ref=${referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const message = `नमस्कार सर / मॅडम,\n\nशालेय पोषण आहार (PM POSHAN) दैनिक नोंदवही आणि मासिक ताळेबंद आता मोबाईलवर अवघ्या २ मिनिटांत तयार करा! अचूक शासन दर, एक्सेल व पीडीएफ प्रिंट सुविधा.\n\nनोंदणी करताना माझा रेफरल कोड वापरा: *${referralCode}*\n\nयेथे क्लिक करून नोंदणी करा:\n${shareUrl}\n\nधन्यवाद! 🙏`;
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleSavePayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim()) {
      alert('कृपया आपला वैध UPI ID प्रविष्ट करा (उदा. 9822114455@okhdfcbank).');
      return;
    }
    setIsSavingPayout(true);
    try {
      saveUserPayoutDetails(userId, upiId, phone);
      setPayoutSavedSuccess(true);
      setTimeout(() => setPayoutSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingPayout(false);
    }
  };

  const content = (
    <div className="bg-gradient-to-br from-amber-700 via-amber-800 to-slate-900 text-white rounded-3xl shadow-xl border border-amber-500/30 overflow-hidden relative font-sans">
      {/* Background Decorative Rings */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Close button if modal */}
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-amber-100 hover:text-white transition-colors z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Top Banner Header */}
      <div className="p-6 sm:p-8 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>रेफरल व बक्षीस योजना (Refer & Earn)</span>
          </div>

          <div className="text-right">
            <span className="text-xs text-amber-200">प्रत्येक शाळेमागे बक्षीस:</span>
            <span className="ml-1.5 text-base sm:text-lg font-black text-emerald-300 font-mono">
              ₹{DEFAULT_REWARD_PER_SCHOOL} रोख
            </span>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white mt-3 leading-tight tracking-tight">
          इतर शाळा जोडा आणि मिळवा रोख बक्षीस! 🎁
        </h2>
        <p className="text-xs sm:text-sm text-amber-100/90 mt-1.5 max-w-xl leading-relaxed">
          तुमच्या तालुक्यातील इतर मुख्याध्यापक व शिक्षकांना महापोषण रजिस्टर ॲप सुचवा. त्यांनी आपल्या रेफरल कोडद्वारे नोंदणी करून खाते सुरू केल्यास आपणास प्रत्येक शाळेमागे थेट रोख बक्षीस मिळेल!
        </p>

        {/* Unique Referral Code Box */}
        <div className="mt-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <span className="text-[11px] uppercase tracking-wider text-amber-200 font-semibold block">
              आपला युनिक रेफरल कोड (Your Referral Code)
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-amber-300 mt-0.5">
              {referralCode || 'MP-XXXXXX'}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-900" />
                  <span>कोड कॉपी झाला!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>कोड कॉपी करा</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-900/30 transition-all active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp वर पाठवा</span>
            </button>
          </div>
        </div>

        {/* Direct Link Share Row */}
        <div className="mt-3 flex items-center justify-between gap-2 px-3 py-2 bg-black/20 rounded-xl border border-white/10 text-xs text-amber-100">
          <span className="truncate font-mono text-[11px] text-amber-200/80">
            {shareUrl}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="shrink-0 text-[11px] font-semibold text-amber-300 hover:text-white transition-colors underline cursor-pointer"
          >
            {copiedLink ? 'लिंक कॉपी झाली!' : 'लिंक कॉपी'}
          </button>
        </div>

        {/* Live Referral Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 text-center">
            <Users className="w-4 h-4 mx-auto text-amber-300 mb-1" />
            <div className="text-xl font-bold font-mono text-white">
              {stats?.totalReferred || 0}
            </div>
            <div className="text-[11px] text-amber-200">एकूण जोडलेल्या शाळा</div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 text-center">
            <CheckCheck className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
            <div className="text-xl font-bold font-mono text-emerald-300">
              {stats?.approvedCount || 0}
            </div>
            <div className="text-[11px] text-amber-200">मंजूर झालेल्या शाळा</div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 text-center">
            <Clock className="w-4 h-4 mx-auto text-amber-400 mb-1" />
            <div className="text-xl font-bold font-mono text-amber-300">
              ₹{stats?.rewardsPending || 0}
            </div>
            <div className="text-[11px] text-amber-200">प्रलंबित बक्षीस</div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 text-center">
            <Wallet className="w-4 h-4 mx-auto text-emerald-300 mb-1" />
            <div className="text-xl font-bold font-mono text-emerald-300">
              ₹{stats?.rewardsPaid || 0}
            </div>
            <div className="text-[11px] text-amber-200">जमा झालेले बक्षीस</div>
          </div>
        </div>

        {/* UPI Payout Settings Form */}
        <div className="mt-6 bg-black/25 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <h4 className="font-bold text-sm text-white">
              बक्षीस मिळण्यासाठी आपला UPI तपशील नोंदवा
            </h4>
          </div>
          <p className="text-[11px] text-amber-100/80 mb-3">
            शाळा मंजूर झाल्यानंतर ॲडमिन थेट आपल्या दिलेल्या PhonePe / Google Pay UPI आयडीवर बक्षीस रक्कम पाठवतील.
          </p>

          <form onSubmit={handleSavePayout} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              required
              placeholder="UPI ID (उदा. 9822114455@okhdfcbank)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="sm:col-span-2 px-3 py-2 rounded-xl bg-white/90 text-slate-900 placeholder:text-slate-500 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="submit"
              disabled={isSavingPayout}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {payoutSavedSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>जतन झाले!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>UPI जतन करा</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Referred Schools Mini List */}
        {stats && stats.referrals.length > 0 && (
          <div className="mt-6">
            <h5 className="text-xs font-semibold text-amber-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5" />
              <span>आपण जोडलेल्या शाळांची स्थिती ({stats.referrals.length})</span>
            </h5>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {stats.referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">
                      {ref.referredSchoolName}
                    </p>
                    <p className="text-[10px] text-amber-200/80 font-mono truncate">
                      UDISE: {ref.referredUdise} • {new Date(ref.registeredAt).toLocaleDateString('mr-IN')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right ml-2">
                    {ref.rewardStatus === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                        <CheckCheck className="w-3 h-3" />
                        <span>₹{ref.rewardAmount} दिले</span>
                      </span>
                    ) : ref.rewardStatus === 'eligible' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-semibold border border-amber-400/30">
                        <Clock className="w-3 h-3" />
                        <span>बक्षीस पात्र (₹{ref.rewardAmount})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-500/20 text-slate-300 text-[10px] font-semibold border border-slate-500/30">
                        <span>प्रलंबित नोंदणी</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
        <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import {
  verifyAdminCredentials,
  setAdminAuthenticated,
} from '../lib/subscription-store';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  defaultEmail?: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  defaultEmail = '',
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const trimmedEmail = email.trim();
    const trimmedPasscode = passcode.trim();

    if (!trimmedEmail || !trimmedPasscode) {
      setErrorMsg('कृपया ॲडमिन ईमेल आणि पासकोड दोन्ही भरा.');
      setIsSubmitting(false);
      return;
    }

    const isValid = verifyAdminCredentials(trimmedEmail, trimmedPasscode);

    if (isValid) {
      setAdminAuthenticated(trimmedEmail);
      setIsSubmitting(false);
      onClose();
      onLoginSuccess();
    } else {
      setIsSubmitting(false);
      setErrorMsg(
        'अवैध ॲडमिन क्रेडेंशियल्स (Invalid Admin Credentials)! फक्त अधिकृत प्रशासकच योग्य आयडी व पासकोडने लॉगिन करू शकतात.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
          </div>

          <h3 className="text-lg font-bold leading-tight">
            प्रशासक लॉगिन (Admin Login)
          </h3>
          <p className="text-xs text-amber-200/80 mt-1">
            केवळ अधिकृत सुपर ॲडमिनसाठी • सुरक्षित प्रवेश नियंत्रण
          </p>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in shake duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Admin Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ॲडमिन ईमेल आयडी (Admin Email) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoFocus
                placeholder="poshanragister@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-xs text-slate-900 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Admin Passcode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ॲडमिन पासकोड / पासवर्ड (Passcode) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-xs text-slate-900 bg-slate-50 focus:bg-white font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                aria-label={showPassword ? 'Hide passcode' : 'Show passcode'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Notice Card */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
            <KeyRound className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span className="leading-snug">
              हे नियंत्रण पॅनेल फक्त अधिकृत सुपर ॲडमिनसाठी आहे. अनधिकृत व्यक्तींना प्रवेशास मनाई आहे.
            </span>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              रद्द करा (Cancel)
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-700/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{isSubmitting ? 'तपासत आहे...' : 'लॉगिन करा'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useUser, SignInButton, SignUpButton } from '@clerk/react';
import { Sparkles, Menu, X, ArrowRight, ShieldCheck, ChevronRight, KeyRound } from 'lucide-react';

interface LandingNavbarProps {
  onOpenLegal?: (tab: 'terms' | 'privacy' | 'refund' | 'contact') => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onOpenLegal }) => {
  const { isSignedIn } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#workflow' },
    { label: 'Preview', href: '#preview' },
    { label: 'Time Saving', href: '#time-saving' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md shadow-xs border-b border-emerald-900/10 py-3'
          : 'bg-transparent py-4 sm:py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-300/60 shadow-md shadow-amber-900/10 group-hover:scale-105 transition-transform bg-white shrink-0">
              <img
                src="/icon-192.png"
                alt="MahaPoshan Register Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 leading-none">
                MahaPoshan <span className="text-emerald-700">Register</span>
              </span>
              <span className="text-[10px] font-medium text-slate-500 tracking-wider uppercase mt-0.5">
                PM-POSHAN Records, Simplified
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-full border border-slate-200/80 backdrop-blur-sm">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-emerald-800 hover:bg-white transition-all"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Right CTAs */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Admin Login Quick Link */}
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({ superAdmin: true }, '', '/admin');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200/90 hover:border-amber-500 bg-white/80 hover:bg-amber-50/80 text-slate-700 hover:text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer group"
              title="Super Admin Portal (पासकोड किंवा ॲडमिन ईमेलने प्रवेश करा)"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
              <span>Admin Login</span>
            </a>

            {isSignedIn ? (
              <a
                href="/daily"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({ tab: 'daily' }, '', '/daily');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-emerald-700/25 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                </SignInButton>

                <SignUpButton mode="modal">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-emerald-700/25 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </SignUpButton>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 sm:hidden">
            {isSignedIn ? (
              <a
                href="/daily"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({ tab: 'daily' }, '', '/daily');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg shadow-xs"
              >
                Dashboard
              </a>
            ) : (
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200"
                >
                  Sign In
                </button>
              </SignInButton>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:text-emerald-800 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Sheet */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center justify-between transition-colors"
              >
                <span>{link.label}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </a>
            ))}
          </nav>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                window.history.pushState({ superAdmin: true }, '', '/admin');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-amber-700" />
              <span>🔐 ॲडमिन लॉगिन (Admin Login)</span>
            </a>

            <SignUpButton mode="modal">
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </SignUpButton>
          </div>
        </div>
      )}
    </header>
  );
};

import React from 'react';
import {
  ShieldCheck,
  Lock,
  Database,
  Cloud,
  FileCheck2,
  Clock,
  Sparkles,
  Server,
} from 'lucide-react';

export const SecurityTrustSection: React.FC = () => {
  const securityPillars = [
    {
      title: 'Enterprise Authentication',
      desc: 'Secured via Clerk authentication with session encryption, email verification, and Google OAuth protection.',
      icon: Lock,
    },
    {
      title: 'School-Level Data Isolation',
      desc: 'Database Row-Level Security (RLS) ensures that each school can only query and mutate their own institution records.',
      icon: ShieldCheck,
    },
    {
      title: 'Offline-First Resilience',
      desc: 'Browser LocalStorage retains all daily logs instantly. Never lose records during power outages or rural internet dropouts.',
      icon: Database,
    },
    {
      title: '28-Day Soft Deletion Buffer',
      desc: 'Accounts marked for deletion enter a mandatory 28-day holding grace period to allow complete recovery in case of accidental requests.',
      icon: Clock,
    },
    {
      title: 'Encrypted Cloud Synchronization',
      desc: 'All data synchronized to Supabase PostgreSQL database over modern TLS 1.3 encryption in transit.',
      icon: Cloud,
    },
    {
      title: 'Statutory Audit Compliance',
      desc: 'Generates exact Government Schedule-II Part-2 records with verifiable mathematical audit trails.',
      icon: FileCheck2,
    },
  ];

  return (
    <section id="security" className="py-20 sm:py-28 bg-slate-50/70 border-t border-slate-200/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Data Security & Compliance</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Built with Security, Privacy &{' '}
            <span className="text-emerald-700">Integrity First</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Educational records demand strict confidentiality, resilient backups, and transparent data ownership.
          </p>
        </div>

        {/* 6 Security Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityPillars.map((pillar, idx) => {
            const Icon = pillar.icon;

            return (
              <div
                key={idx}
                className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-4">
                    <Icon className="w-5 h-5" />
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 mb-1.5 leading-snug">
                    {pillar.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Architecture</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

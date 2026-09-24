import React from 'react';
import { School, GraduationCap, Building2, CheckCircle2, Sparkles, HeartHandshake } from 'lucide-react';

export const WhoIsItForSection: React.FC = () => {
  const personas = [
    {
      title: 'Government-Aided Private Schools',
      role: 'Our Primary Focus (अनुदानित खाजगी शाळा)',
      badge: 'Primary Focus',
      highlight: true,
      icon: School,
      desc: 'Designed specifically for high-strength aided institutions where managing hundreds of daily meals makes manual arithmetic exhausting.',
      benefits: [
        'Effortlessly handles large student strengths (200 to 1,500+ students).',
        'Eliminates manual arithmetic for 19 statutory commodities across multiple divisions.',
        'Prevents costly audit objections during state inspection & auditor scrutiny.',
        'Saves administrative staff & teachers 45+ minutes every single afternoon.',
      ],
    },
    {
      title: 'Class Teachers & MDM Incharges',
      role: 'Classroom & Kitchen Operations (शिक्षक व पोषण आहार प्रमुख)',
      badge: 'Zero Math Headaches',
      highlight: false,
      icon: GraduationCap,
      desc: 'For dedicated educators who want to focus on teaching rather than spending afternoons cross-multiplying grain grams.',
      benefits: [
        'Input daily meals served in under 10 seconds via touch stepper buttons.',
        'Automatic Schedule-II ingredient calculations with zero rounding discrepancies.',
        'Opening, inward, and closing grain inventory reconciles automatically.',
        'Works offline seamlessly even in areas with weak classroom internet connectivity.',
      ],
    },
    {
      title: 'Zilla Parishad & Municipal Schools',
      role: 'Always Welcome! (जि.प. व मनपा शाळा)',
      badge: 'Warmly Welcome',
      highlight: false,
      icon: HeartHandshake,
      desc: 'While smaller student counts make manual math possible, Z.P. teachers who value error-free convenience are warmly supported.',
      benefits: [
        'Instant compilation of certified Government Part-2 Page 43 registers.',
        'Always inspection-ready for surprise Kendra Pramukh & BEEO visits.',
        'Export beautiful landscape PDFs and colored Excel (.xlsx) files with one click.',
        'Complete peace of mind knowing all cooking costs & grain calculations are 100% accurate.',
      ],
    },
  ];

  return (
    <section id="who-is-it-for" className="py-20 sm:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Target Institutions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Built for High-Enrollment{' '}
            <span className="text-emerald-700">Aided Schools</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Engineered primarily for Government-Aided Private Schools with large student enrollments, while gladly welcoming Zilla Parishad and municipal schools across Maharashtra.
          </p>
        </div>

        {/* 3 Persona Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch mb-10">
          {personas.map((persona, idx) => {
            const Icon = persona.icon;

            return (
              <div
                key={idx}
                className={`rounded-3xl p-6 sm:p-8 border transition-all duration-300 flex flex-col justify-between group ${
                  persona.highlight
                    ? 'bg-gradient-to-b from-emerald-50/90 via-white to-emerald-50/30 border-2 border-emerald-500 shadow-xl shadow-emerald-950/10 relative'
                    : 'bg-slate-50/70 hover:bg-white border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-lg'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-transform group-hover:scale-105 ${
                        persona.highlight
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/20'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        persona.highlight
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      {persona.badge}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                    {persona.role}
                  </span>

                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 mb-2 leading-snug">
                    {persona.title}
                  </h3>

                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    {persona.desc}
                  </p>

                  <div className="space-y-2.5 pt-3 border-t border-slate-200/80">
                    {persona.benefits.map((b, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 text-right">
                  <span className="text-[11px] font-semibold text-slate-400 group-hover:text-emerald-700 transition-colors">
                    Tailored workflow &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reassurance Callout Bar */}
        <div className="max-w-4xl mx-auto p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <HeartHandshake className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              <strong>Every school is welcome:</strong> Whether you manage 35 students in a rural Z.P. primary or 900+ students in an aided high school, MahaPoshan scales effortlessly.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

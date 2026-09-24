import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      question: 'What is MahaPoshan Register?',
      answer:
        'MahaPoshan Register is a specialized software tool designed for elementary and upper primary schools across Maharashtra. It automates daily PM-POSHAN student meal headcount calculations, grain and commodity weights, inventory stock ledgers, and official Government Part-2 booklet reporting.',
    },
    {
      question: 'Is MahaPoshan Register for Government-Aided schools or Zilla Parishad schools?',
      answer:
        'Our primary focus is Government-Aided Private Schools (अनुदानित खाजगी शाळा) because their large student numbers (hundreds of meals daily) make manual calculation especially difficult and time-consuming. However, Zilla Parishad and municipal schools are warmly welcome—they enjoy the exact same automated calculations, stock ledger, and certified government reports!',
    },
    {
      question: 'Does the application work smoothly on mobile phones and tablets?',
      answer:
        'Yes! MahaPoshan Register is built mobile-first. You can record daily meals served, update inward grain supplies, and view reports right from your smartphone or tablet with touch-friendly steppers and responsive layouts.',
    },
    {
      question: 'Can I export reports to Excel (.xlsx) and print-ready PDF files?',
      answer:
        'Yes. With a single tap, you can download color-formatted Excel (.xlsx) sheets and certified landscape A4 PDF documents formatted precisely according to Government Booklet Page 43 (Schedule-II Part-2).',
    },
    {
      question: 'Is my school data separated and secure from other schools?',
      answer:
        'Yes. Each school has its own authenticated profile protected by Clerk authentication and database Row-Level Security (RLS) policies. No other school can access or view your institution’s registers.',
    },
    {
      question: 'Can I access and review previous months’ records?',
      answer:
        'Yes. The application maintains full monthly historical archives. You can easily switch between past academic months using the month picker to review or re-print earlier reports.',
    },
    {
      question: 'Does it work when the school does not have internet access?',
      answer:
        'Yes. MahaPoshan Register features an offline-first architecture using browser LocalStorage. You can record daily entries completely offline. Once you connect to the internet, your records automatically sync to the secure Supabase cloud.',
    },
    {
      question: 'Is MahaPoshan Register an official Government application?',
      answer:
        'No. MahaPoshan Register is an independent software assistance tool developed to simplify clerical calculations for educators. It is not an official application of the Government of Maharashtra or the Government of India.',
    },
  ];

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 sm:py-28 bg-slate-50/70 border-t border-slate-200/80 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-700" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Got Questions? We Have Answers.
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Everything you need to know about MahaPoshan Register, its statutory compliance, and data security.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => handleToggle(index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <div
                    className={`w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-emerald-100 text-emerald-800' : 'text-slate-500'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in duration-200">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

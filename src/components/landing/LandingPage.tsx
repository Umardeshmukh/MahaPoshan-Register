import React, { useState, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LandingNavbar } from './LandingNavbar';
import { HeroSection } from './HeroSection';
import { ProblemSolutionSection } from './ProblemSolutionSection';
import { FeatureShowcaseSection } from './FeatureShowcaseSection';
import { WorkflowSection } from './WorkflowSection';
import { ProductPreviewSection } from './ProductPreviewSection';
import { TimeSavingSection } from './TimeSavingSection';
import { ReportGenerationSection } from './ReportGenerationSection';
import { WhoIsItForSection } from './WhoIsItForSection';
import { SecurityTrustSection } from './SecurityTrustSection';
import { PricingSection } from './PricingSection';
import { FaqSection } from './FaqSection';
import { FinalCtaSection } from './FinalCtaSection';
import { LandingFooter } from './LandingFooter';
import { LegalModal } from '../LegalModal';
import { LegalDocType } from '../../types';

// Register GSAP ScrollTrigger plugin safely
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const LandingPage: React.FC = () => {
  const [legalModalOpen, setLegalModalOpen] = useState<boolean>(false);
  const [activeLegalTab, setActiveLegalTab] = useState<LegalDocType>('terms');

  const handleOpenLegal = (tab: LegalDocType) => {
    setActiveLegalTab(tab);
    setLegalModalOpen(true);
  };

  useEffect(() => {
    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    // Scroll reveal triggers for sections
    const sections = document.querySelectorAll('.landing-section-reveal');
    sections.forEach((section) => {
      gsap.fromTo(
        section,
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-950 overflow-x-hidden">
      {/* Top Fixed Sticky Navbar */}
      <LandingNavbar onOpenLegal={handleOpenLegal} />

      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Problem → Solution Transformation */}
      <div className="landing-section-reveal">
        <ProblemSolutionSection />
      </div>

      {/* 3. Feature Showcase */}
      <div className="landing-section-reveal">
        <FeatureShowcaseSection />
      </div>

      {/* 4. "From Entry to Report" Interactive Workflow */}
      <div className="landing-section-reveal">
        <WorkflowSection />
      </div>

      {/* 5. Product Preview Mockup */}
      <div className="landing-section-reveal">
        <ProductPreviewSection />
      </div>

      {/* 6. Time Saving Comparison */}
      <div className="landing-section-reveal">
        <TimeSavingSection />
      </div>

      {/* 7. Report Generation Pipeline Animation */}
      <div className="landing-section-reveal">
        <ReportGenerationSection />
      </div>

      {/* 8. Who Is It For */}
      <div className="landing-section-reveal">
        <WhoIsItForSection />
      </div>

      {/* 9. Security & Trust */}
      <div className="landing-section-reveal">
        <SecurityTrustSection />
      </div>

      {/* 10. Pricing Section */}
      <div className="landing-section-reveal">
        <PricingSection />
      </div>

      {/* 11. FAQ Accordion */}
      <div className="landing-section-reveal">
        <FaqSection />
      </div>

      {/* 12. Final CTA Banner */}
      <div className="landing-section-reveal">
        <FinalCtaSection />
      </div>

      {/* 13. Footer */}
      <LandingFooter onOpenLegal={handleOpenLegal} />

      {/* Legal Documents Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        initialTab={activeLegalTab}
        onClose={() => setLegalModalOpen(false)}
      />
    </div>
  );
};

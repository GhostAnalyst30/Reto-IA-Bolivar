import { SiteHeader, SiteFooter } from '@/components/layout/SiteHeader';
import {
  HeroSection,
  ProblemSolutionNarrative,
  ModuleBentoGrid,
  ExperienceShowcase,
  KpiCarousel,
  SecurityTrustSection,
  FinalCta,
} from '@/components/landing/sections';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <ProblemSolutionNarrative />
        <ModuleBentoGrid />
        <ExperienceShowcase />
        <KpiCarousel />
        <SecurityTrustSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

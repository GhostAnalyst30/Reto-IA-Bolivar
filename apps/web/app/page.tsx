import { SiteHeader, SiteFooter } from '@/components/layout/SiteHeader';
import {
  HeroSection,
  ProblemSolutionNarrative,
  ModuleBentoGrid,
  ExperienceShowcase,
  KpiCarousel,
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
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

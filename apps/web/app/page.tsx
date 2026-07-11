import { PublicSiteShell } from '@/components/immersive/layout/PublicSiteShell';
import {
  HeroSection,
  ProblemSolutionSection,
  ModuleBentoGrid,
  ExperienceShowcase,
  KpiSection,
  FinalCtaSection,
} from '@/components/immersive/sections';

export default function HomePage() {
  return (
    <PublicSiteShell variant="narrative" showProgressBar>
      <HeroSection />
      <ProblemSolutionSection />
      <ModuleBentoGrid />
      <ExperienceShowcase />
      <KpiSection />
      <FinalCtaSection />
    </PublicSiteShell>
  );
}

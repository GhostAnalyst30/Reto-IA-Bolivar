import { PublicSiteShell } from '@/components/immersive/layout/PublicSiteShell';
import { PageHero } from '@/components/immersive/layout/PageHero';
import { AboutContent } from './AboutContent';

export default function QuienesSomosPage() {
  return (
    <PublicSiteShell variant="content">
      <PageHero
        badge="Quiénes somos · UTB 2026"
        title="Quiénes"
        titleAccent="somos"
        subtitle="UTB Te acompaña es el microservicio de acompañamiento estudiantil de la Universidad Tecnológica de Bolívar, diseñado para prevenir la deserción y apoyar la toma de decisiones institucionales."
      />
      <AboutContent />
    </PublicSiteShell>
  );
}

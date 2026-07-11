import { PublicSiteShell } from '@/components/immersive/layout/PublicSiteShell';
import { PageHero } from '@/components/immersive/layout/PageHero';
import { TermsContent } from './TermsContent';

export default function TerminosPage() {
  return (
    <PublicSiteShell variant="content">
      <PageHero
        badge="Legal · UTB 2026"
        title="Términos de"
        titleAccent="uso"
        subtitle="Última actualización: julio 2026 · UTB Te acompaña"
      />
      <TermsContent />
    </PublicSiteShell>
  );
}

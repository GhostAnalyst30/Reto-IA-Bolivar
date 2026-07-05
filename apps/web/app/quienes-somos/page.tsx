import { SiteHeader, SiteFooter } from '@/components/layout/SiteHeader';
import { BentoGrid, BentoCell } from '@/components/ui/BentoGrid';

export default function QuienesSomosPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pt-28 pb-16">
        <h1 className="font-display text-4xl font-bold text-brand-blue md:text-5xl">Quiénes somos</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          UTB Te acompaña es el microservicio de acompañamiento estudiantil de la Universidad Tecnológica de Bolívar,
          diseñado para prevenir la deserción y apoyar la toma de decisiones institucionales.
        </p>

        <BentoGrid cols={3} className="mt-12">
          <BentoCell colSpan={2}>
            <h2 className="font-display text-xl font-semibold text-brand-blue">Nuestra misión</h2>
            <p className="mt-3 text-muted leading-relaxed">
              Integrar inteligencia artificial responsable en la vida académica UTB: Digital Twin, encuesta psicométrica,
              oportunidades personalizadas, panel de riesgo e intervenciones para el personal autorizado.
            </p>
          </BentoCell>
          <BentoCell>
            <h2 className="font-display text-xl font-semibold text-brand-blue">UTB</h2>
            <p className="mt-3 text-muted">
              Universidad Tecnológica de Bolívar — Cartagena, Colombia. Formación tecnológica con impacto regional.
            </p>
          </BentoCell>
          <BentoCell>
            <h2 className="font-display text-xl font-semibold text-brand-blue">Estudiantes</h2>
            <p className="mt-3 text-muted">
              Encuesta de caracterización, Digital Twin, oportunidades, recursos de apoyo y tutoría con IA.
            </p>
          </BentoCell>
          <BentoCell>
            <h2 className="font-display text-xl font-semibold text-brand-blue">Directivos</h2>
            <p className="mt-3 text-muted">
              Dashboard de riesgo, analítica, predicción de deserción, intervenciones y gestión de contenido.
            </p>
          </BentoCell>
          <BentoCell>
            <h2 className="font-display text-xl font-semibold text-brand-blue">Equipo</h2>
            <p className="mt-3 text-muted">
              Microservicio universitario con enfoque en privacidad, consentimiento informado y transparencia algorítmica.
            </p>
          </BentoCell>
        </BentoGrid>
      </main>
      <SiteFooter />
    </div>
  );
}

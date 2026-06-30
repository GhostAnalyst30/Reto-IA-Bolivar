import { SiteHeader, SiteFooter } from '@/components/layout/SiteHeader';
import { BentoGrid, BentoCell } from '@/components/ui/BentoGrid';

export default function QuienesSomosPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pt-28 pb-16">
        <h1 className="font-display text-4xl font-bold md:text-5xl">Quiénes somos</h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-500">
          Bolívar IA es la plataforma inteligente de la Universidad Tecnológica de Bolívar (UTB),
          diseñada para potenciar el aprendizaje estudiantil y la toma de decisiones institucionales.
        </p>

        <BentoGrid cols={3} className="mt-12">
          <BentoCell colSpan={2}>
            <h2 className="text-xl font-semibold">Nuestra misión</h2>
            <p className="mt-3 text-zinc-500 leading-relaxed">
              Integrar inteligencia artificial responsable en la vida académica de la UTB: tutoría personalizada,
              orientación vocacional, analítica en tiempo real y herramientas ejecutivas para directivos.
            </p>
          </BentoCell>
          <BentoCell>
            <h2 className="text-xl font-semibold">UTB</h2>
            <p className="mt-3 text-zinc-500">
              Universidad Tecnológica de Bolívar — Cartagena, Colombia. Formación tecnológica con impacto regional.
            </p>
          </BentoCell>
          <BentoCell>
            <h2 className="text-xl font-semibold">Estudiantes</h2>
            <p className="mt-3 text-zinc-500">
              Chat IA, rutas de aprendizaje, test vocacional, buscador de recursos educativos y seguimiento de progreso.
            </p>
          </BentoCell>
          <BentoCell>
            <h2 className="text-xl font-semibold">Directivos</h2>
            <p className="mt-3 text-zinc-500">
              Analítica, predicción de retención, resumen ejecutivo, acciones recomendadas y Director de IA.
            </p>
          </BentoCell>
          <BentoCell>
            <h2 className="text-xl font-semibold">Equipo</h2>
            <p className="mt-3 text-zinc-500">
              Desarrollado para el Reto IA Bolívar 2026. Plataforma institucional con enfoque en privacidad y transparencia.
            </p>
          </BentoCell>
        </BentoGrid>
      </main>
      <SiteFooter />
    </div>
  );
}

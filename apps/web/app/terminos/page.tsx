import { SiteHeader, SiteFooter } from '@/components/layout/SiteHeader';
import { BentoGrid, BentoCell } from '@/components/ui/BentoGrid';

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pt-28 pb-16">
        <h1 className="font-display text-4xl font-bold">Términos de uso</h1>
        <p className="mt-4 text-zinc-500">Última actualización: junio 2026 · Plataforma Bolívar IA — UTB</p>

        <BentoGrid cols={2} className="mt-12">
          <BentoCell colSpan={2}>
            <div id="seguridad">
            <h2 className="text-xl font-semibold">Uso de inteligencia artificial</h2>
            <ul className="mt-4 space-y-2 text-zinc-500 list-disc pl-5">
              <li>Los asistentes IA (tutor, Director de IA, test vocacional) utilizan modelos de lenguaje vía proveedores externos (OpenRouter, Gemini, Hugging Face, LiteLLM).</li>
              <li>Las respuestas son orientativas y no sustituyen asesoría académica, legal o médica profesional.</li>
              <li>No comparta datos sensibles (contraseñas, documentos de identidad completos) en el chat.</li>
              <li>El razonamiento mostrado es un resumen del proceso interno; puede omitir detalles técnicos.</li>
              <li>En caso de indisponibilidad del servicio IA, se mostrará un mensaje genérico sin detalles técnicos del error.</li>
            </ul>
            </div>
          </BentoCell>
          <BentoCell>
            <h2 className="text-xl font-semibold">Manejo de datos</h2>
            <ul className="mt-4 space-y-2 text-zinc-500 list-disc pl-5">
              <li>Datos almacenados en Supabase (PostgreSQL) con cifrado en tránsito (TLS).</li>
              <li>Perfiles, chats, progreso y evaluaciones vocacionales vinculados a su cuenta institucional.</li>
              <li>Row Level Security (RLS) limita el acceso por rol e institución.</li>
              <li>Correos de confirmación y recuperación enviados vía Resend; cuentas @utb.demo no reciben correos.</li>
            </ul>
          </BentoCell>
          <BentoCell>
            <h2 className="text-xl font-semibold">Recursos educativos</h2>
            <ul className="mt-4 space-y-2 text-zinc-500 list-disc pl-5">
              <li>Recursos indexados desde fuentes públicas (YouTube, edX, Khan Academy, W3Schools, etc.).</li>
              <li>Respetamos robots.txt y términos de servicio de cada fuente.</li>
              <li>Los enlaces dirigen al contenido original; Bolívar IA no aloja material con derechos de autor.</li>
            </ul>
          </BentoCell>
          <BentoCell colSpan={2}>
            <h2 className="text-xl font-semibold">Sus derechos</h2>
            <p className="mt-4 text-zinc-500 leading-relaxed">
              Puede solicitar acceso, corrección o eliminación de sus datos contactando al administrador institucional
              (admin@utb.demo). Las cuentas pendientes de aprobación no acceden a funcionalidades completas hasta
              ser validadas por un administrador UTB.
            </p>
          </BentoCell>
        </BentoGrid>
      </main>
      <SiteFooter />
    </div>
  );
}

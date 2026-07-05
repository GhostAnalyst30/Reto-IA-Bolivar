import { SiteHeader, SiteFooter } from '@/components/layout/SiteHeader';
import { BentoGrid, BentoCell } from '@/components/ui/BentoGrid';

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pt-28 pb-16">
        <h1 className="font-display text-4xl font-bold text-brand-blue">Términos de uso</h1>
        <p className="mt-4 text-muted">Última actualización: julio 2026 · UTB Te acompaña</p>

        <BentoGrid cols={2} className="mt-12">
          <BentoCell colSpan={2}>
            <div id="seguridad">
            <h2 className="font-display text-xl font-semibold text-brand-blue">Uso de inteligencia artificial</h2>
            <ul className="mt-4 space-y-2 text-muted list-disc pl-5">
              <li>Los asistentes IA (Digital Twin, tutor RAG, Director de IA) utilizan modelos vía OpenRouter.</li>
              <li>Las respuestas son orientativas y no sustituyen asesoría académica, legal o médica profesional.</li>
              <li>No comparta datos sensibles (contraseñas, documentos de identidad completos) en el chat.</li>
              <li>El razonamiento mostrado es un resumen del proceso interno; puede omitir detalles técnicos.</li>
            </ul>
            </div>
          </BentoCell>
          <BentoCell>
            <h2 className="font-display text-xl font-semibold text-brand-blue">Manejo de datos</h2>
            <ul className="mt-4 space-y-2 text-muted list-disc pl-5">
              <li>Datos almacenados en Supabase (PostgreSQL) con cifrado en tránsito (TLS).</li>
              <li>Registro exclusivo con correo @utb.edu.co e identificador de usuario único.</li>
              <li>Row Level Security (RLS) limita el acceso por rol e institución.</li>
              <li>Correos enviados vía Resend; cuentas demo @utb.demo no reciben correos.</li>
            </ul>
          </BentoCell>
          <BentoCell>
            <h2 className="font-display text-xl font-semibold text-brand-blue">Recursos educativos</h2>
            <ul className="mt-4 space-y-2 text-muted list-disc pl-5">
              <li>Recursos indexados desde fuentes públicas (YouTube, edX, Khan Academy, etc.).</li>
              <li>Respetamos robots.txt y términos de servicio de cada fuente.</li>
              <li>Los enlaces dirigen al contenido original; UTB Te acompaña no aloja material con derechos de autor.</li>
            </ul>
          </BentoCell>
          <BentoCell colSpan={2}>
            <h2 className="font-display text-xl font-semibold text-brand-blue">Sus derechos</h2>
            <p className="mt-4 text-muted leading-relaxed">
              Puede solicitar acceso, corrección o eliminación de sus datos contactando al administrador institucional.
              Las cuentas pendientes de aprobación no acceden a funcionalidades completas hasta ser validadas.
            </p>
          </BentoCell>
        </BentoGrid>
      </main>
      <SiteFooter />
    </div>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProviders } from '@/components/providers/AuthProviders';

export const metadata: Metadata = {
  title: 'UTB Te acompaña — Acompañamiento Estudiantil',
  description: 'Microservicio universitario: Digital Twin, oportunidades y panel de riesgo para la UTB.',
  icons: {
    icon: '/icons/images.ico',
    apple: '/icons/images.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-brand-bg text-foreground">
        <ThemeProvider>
          <AuthProviders>{children}</AuthProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { DM_Sans, Newsreader } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProviders } from '@/components/providers/AuthProviders';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-newsreader',
  display: 'swap',
  adjustFontFallback: false,
});

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
    <html lang="es" suppressHydrationWarning className={`${dmSans.variable} ${newsreader.variable}`}>
      <body className={`${dmSans.className} min-h-screen antialiased bg-brand-bg text-foreground`}>
        <ThemeProvider>
          <AuthProviders>{children}</AuthProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}

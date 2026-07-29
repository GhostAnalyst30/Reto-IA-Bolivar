import type { Metadata, Viewport } from 'next';
import { DM_Sans, Newsreader, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProviders } from '@/components/providers/AuthProviders';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

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
  title: 'UTB Te Acompaña — Portal Estudiantil Inteligente',
  description:
    'Tu portal universitario inteligente para el éxito académico y el bienestar integral. Digital Twin, chat de acompañamiento, oportunidades y becas.',
  icons: {
    icon: '/icons/images.ico',
    apple: '/icons/images.png',
  },
  openGraph: {
    title: 'UTB Te Acompaña',
    description: 'UTB Te acompaña es una plataforma de acompañamiento estudiantil de la Universidad Tecnológica de Bolívar, orientada a prevenir la deserción. Combina un Digital Twin psicológico (chat empático + citas con psicología), encuesta de caracterización y test vocacional, con herramientas institucionales de riesgo, CareQueue y apoyo humano.',
    url: 'https://reto-ia-bolivar.vercel.app/',
    siteName: 'UTB Te Acompaña',
    images: [{ url: 'front/og.png', width: 1200, height: 630 }],
    locale: 'es_CO',
    type: 'website',
  }
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7fafd' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0b' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${jakarta.variable} ${dmSans.variable} ${newsreader.variable} bg-background`}
    >
      <body className={`${jakarta.className} min-h-screen antialiased bg-background text-foreground`}>
        <ThemeProvider>
          <AuthProviders>{children}</AuthProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}

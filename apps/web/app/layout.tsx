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
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#002576',
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

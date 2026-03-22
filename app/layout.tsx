import type { Metadata } from 'next';
import { Inter, Montserrat, Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import { getServerSession } from 'next-auth';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import SessionProviderWrapper from '@/components/session-provider-wrapper';
import { authOptions } from '@/lib/auth-options';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const montserrat = Montserrat({ 
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-montserrat',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MACOFEL - Materiais para Construção',
  description: 'Loja completa de materiais para construção. Cimento, tijolos, tintas, ferramentas e muito mais.',
  icons: {
    icon: 'https://vedrmtowoosqxzqxgxpb.supabase.co/storage/v1/object/public/Macofel/og-image.jpeg',
    shortcut: 'https://vedrmtowoosqxzqxgxpb.supabase.co/storage/v1/object/public/Macofel/og-image.jpeg',
  },
  metadataBase: (() => {
    const url = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    // Garantir que a URL tenha protocolo
    const urlWithProtocol = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
    return new URL(urlWithProtocol);
  })(),
  openGraph: {
    images: ['/og-image.png'],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={`${inter.variable} ${montserrat.variable} ${plusJakartaSans.variable} ${playfairDisplay.variable} font-sans`}>
        <SessionProviderWrapper session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster position="top-right" richColors />
          </ThemeProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}

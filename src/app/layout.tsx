import type { Metadata } from 'next';
import { Barlow_Condensed, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-barlow',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'HR RISE AND FALL — Live Competition Voting',
  description: 'Real-time event voting and live stage reveal platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${barlowCondensed.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#09090B] font-sans text-[#F4F2EC] antialiased">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111114',
              border: '1px solid #27272A',
              color: '#F4F2EC',
              borderRadius: '2px',
            },
          }}
        />
      </body>
    </html>
  );
}
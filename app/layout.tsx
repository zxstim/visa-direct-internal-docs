import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Inter } from 'next/font/google';
import type { Metadata } from "next";

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PVCB TA',
  description: 'PVCB Tourist App',
  metadataBase: new URL('https://internaldocs.globalcard.ai'),
  openGraph: {
    title: 'PVCB TA',
    description: 'PVCB Tourist App',
    url: 'https://internaldocs.tigerfinancials.com',
    siteName: 'PVCB TA',
    images: [
      {
        url: '/tigerfinancials-tbn.png',
        width: 1200,
        height: 630,
        alt: 'og-image',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PVCB Tourist App',
    description: 'PVCB Tourist App',
    creator: '@tigerfinancials',
    images: ['/tigerfinancials-tbn.png'],
  },
}

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

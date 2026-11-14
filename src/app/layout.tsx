import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { twMerge } from 'tailwind-variants';
import './globals.css';

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={twMerge(
        geistSans.variable,
        geistMono.variable,
        'h-full antialiased'
      )}
    >
      <body className="flex min-h-full flex-col bg-canvas font-sans text-text-primary">
        {children}
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  title: 'AI Data Cleanup Assistant',
  description:
    'Find duplicates, inconsistent values, missing data and suspicious records in a CSV, and decide what changes.',
};

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

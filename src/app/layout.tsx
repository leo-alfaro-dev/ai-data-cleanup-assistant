import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { twMerge } from 'tailwind-variants';
import { PRODUCT_NAME } from '@/features/workspace/productName';
import './globals.css';

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={twMerge(
        inter.variable,
        jetBrainsMono.variable,
        'h-full antialiased'
      )}
    >
      <body className="flex min-h-full flex-col bg-surface font-sans text-text-primary">
        {children}
      </body>
    </html>
  );
}

const DESCRIPTION =
  'Find duplicates, inconsistent values, missing data and suspicious records in a CSV, and decide what changes.';

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: DESCRIPTION,
  openGraph: {
    title: PRODUCT_NAME,
    description: DESCRIPTION,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PRODUCT_NAME,
    description: DESCRIPTION,
  },
};

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  axes: ['opsz'],
});

// Cell values: its 0, O, 1, l and I never look alike.
const jetBrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

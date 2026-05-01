import type { Metadata } from 'next';

import '@/styles/globals.css';


export const metadata: Metadata = {
  title:       'LeaseWise Canada',
  description: 'Real lease data for Canadian car buyers.',
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // data-theme="dark" is the default per the design system; the toggle
  // component lands in Phase 1.6 polish. tokens.css already keys to
  // [data-theme="dark"] and [data-theme="light"].
  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* tokens.css is the single source of truth for colour, type,
            spacing. Loaded as a static asset from /public so the same
            file works in any page or design-phase preview, per the
            design-phase usage pattern. */}
        <link rel="stylesheet" href="/tokens.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}

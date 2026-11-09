import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import messages from '@/messages/id.json';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: messages.meta.title,
    template: `%s | ${messages.meta.title}`,
  },
  description: messages.meta.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-dvh bg-stone-50 font-sans text-stone-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
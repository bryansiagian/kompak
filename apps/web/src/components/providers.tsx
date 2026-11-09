'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';
import messages from '@/messages/id.json';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <NextIntlClientProvider
      locale="id"
      messages={messages}
      timeZone="Asia/Jakarta"
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NextIntlClientProvider>
  );
}
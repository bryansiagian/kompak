'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useSession } from './hooks';
import { peekNextPath } from './next-path';

export function GuestOnly({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user, isPending } = useSession();

  useEffect(() => {
    if (user) {
      // Tujuan disimpan oleh halaman undangan; dibersihkan di sana setelah tiba.
      router.replace(peekNextPath() ?? '/');
    }
  }, [user, router]);

  if (isPending || user) {
    return <LoadingScreen />;
  }
  return <>{children}</>;
}
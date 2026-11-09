'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useSession } from './hooks';

export function GuestOnly({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user, isPending } = useSession();

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  if (isPending || user) {
    return <LoadingScreen />;
  }
  return <>{children}</>;
}
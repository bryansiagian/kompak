'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '@kompak/shared';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useSession } from './hooks';

export function RequireAuth({
  children,
}: {
  children: (user: AuthUser) => ReactNode;
}) {
  const router = useRouter();
  const { data: user, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !user) {
      router.replace('/login');
    }
  }, [isPending, user, router]);

  if (isPending || !user) {
    return <LoadingScreen />;
  }
  return <>{children(user)}</>;
}
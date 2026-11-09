'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useLogoutMutation } from '@/features/auth/hooks';
import { RequireAuth } from '@/features/auth/require-auth';

export function HomeScreen() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');
  const logout = useLogoutMutation();

  return (
    <RequireAuth>
      {(user) => (
        <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-8">
          <header className="flex items-center justify-between gap-3">
            <p className="text-xl font-extrabold tracking-tight text-emerald-700">
              {tCommon('appName')}
            </p>
            <Button
              variant="secondary"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              {logout.isPending ? tCommon('loggingOut') : tCommon('logout')}
            </Button>
          </header>

          <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
            <h1 className="text-xl font-bold">
              {t('greeting', { name: user.name })}
            </h1>
            <p className="mt-2 text-sm text-stone-600">{t('intro')}</p>
          </section>
        </main>
      )}
    </RequireAuth>
  );
}
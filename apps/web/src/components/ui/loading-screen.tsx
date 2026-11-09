'use client';

import { useTranslations } from 'next-intl';

export function LoadingScreen() {
  const t = useTranslations('common');

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <p role="status" className="flex items-center gap-3 text-stone-600">
        <span
          aria-hidden="true"
          className="size-5 rounded-full border-2 border-emerald-600 border-t-transparent motion-safe:animate-spin"
        />
        {t('loading')}
      </p>
    </main>
  );
}
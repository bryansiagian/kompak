'use client';

import { useTranslations } from 'next-intl';

export function LoadingScreen() {
  const t = useTranslations('common');

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <p role="status" className="flex items-center gap-3 text-muted-foreground">
        <span
          aria-hidden="true"
          className="size-5 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin"
        />
        {t('loading')}
      </p>
    </main>
  );
}
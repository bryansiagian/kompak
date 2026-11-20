'use client';

import { useTranslations } from 'next-intl';
import { Brand } from './app-shell';

export function LoadingScreen() {
  const t = useTranslations('common');

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm rounded-3xl border border-divider bg-surface p-5 shadow-panel sm:p-8">
        <Brand />
        <p
          role="status"
          className="mt-6 flex items-center gap-3 text-muted-foreground"
        >
          <span
            aria-hidden="true"
            className="size-5 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin"
          />
          {t('loading')}
        </p>
        <div
          aria-hidden="true"
          className="mt-5 h-12 rounded-xl bg-surface-muted motion-safe:animate-pulse"
        />
      </div>
    </main>
  );
}

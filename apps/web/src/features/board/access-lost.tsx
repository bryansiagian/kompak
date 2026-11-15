'use client';

import { useTranslations } from 'next-intl';
import { LinkButton } from '@/components/ui/link-button';

export type RealtimeLoss = 'deleted' | 'revoked';

export function AccessLost({ loss }: { loss: RealtimeLoss }) {
  const t = useTranslations('board.realtime');

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md space-y-4 px-4 py-8">
      <h1 className="text-xl font-bold">{t(`${loss}Title`)}</h1>
      <p className="text-sm text-stone-600">{t(`${loss}Body`)}</p>
      <LinkButton href="/">{t('toHome')}</LinkButton>
    </main>
  );
}
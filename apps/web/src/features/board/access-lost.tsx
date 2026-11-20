'use client';

import { useTranslations } from 'next-intl';
import { LinkButton } from '@/components/ui/link-button';

export type RealtimeLoss = 'deleted' | 'revoked';

export function AccessLost({ loss }: { loss: RealtimeLoss }) {
  const t = useTranslations('board.realtime');

  return (
    <main className="mx-auto my-8 w-[calc(100%-2rem)] max-w-lg space-y-4 rounded-2xl border border-divider bg-surface p-6 shadow-panel">
      <h1 className="text-xl font-bold">{t(`${loss}Title`)}</h1>
      <p className="text-sm text-stone-600">{t(`${loss}Body`)}</p>
      <LinkButton href="/groups">{t('toHome')}</LinkButton>
    </main>
  );
}

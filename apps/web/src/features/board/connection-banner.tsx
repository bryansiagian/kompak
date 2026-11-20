'use client';

import { useTranslations } from 'next-intl';
import type { ConnectionStatus } from '@/lib/realtime/client';

export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  const t = useTranslations('board.realtime');
  if (status !== 'disconnected') {
    return null;
  }

  return (
    <p
      role="status"
      className="mt-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
    >
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full bg-amber-700"
      />
      {t('reconnecting')}
    </p>
  );
}

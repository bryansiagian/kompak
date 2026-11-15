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
      className="mt-3 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-900"
    >
      {t('reconnecting')}
    </p>
  );
}
'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { classifyLoadError } from '@/lib/api/load-error';
import { Button } from './button';

interface ErrorCopy {
  title: string;
  subtitle: string;
}

interface LoadQuery {
  error: Error | null;
  isFetching: boolean;
  refetch: (options: { cancelRefetch: boolean }) => Promise<unknown>;
}

export function useLoadError(
  query: LoadQuery,
  notFound: ErrorCopy,
  invalid?: ErrorCopy,
) {
  const t = useTranslations('common.loadError');
  const [retryError, setRetryError] = useState<Error | null>(null);
  // A retry without cached data clears the query error while loading.
  // Keep the retry button mounted so keyboard focus stays in place.
  const error = query.error ?? retryError;
  if (!error) return null;

  const kind = classifyLoadError(error);

  if (kind === 'notFound') return { ...notFound, retry: null };
  if (kind === 'badRequest' && invalid) return { ...invalid, retry: null };

  const key = kind === 'badRequest' ? 'unexpected' : kind;
  return {
    title: t(`${key}.title`),
    subtitle: t(`${key}.subtitle`),
    retry:
      kind === 'temporary'
        ? {
            isFetching: retryError !== null || query.isFetching,
            onRetry: async () => {
              setRetryError(error);
              try {
                await query.refetch({ cancelRefetch: false });
              } finally {
                setRetryError(null);
              }
            },
          }
        : null,
  };
}

export function RetryButton({
  isFetching,
  onRetry,
  fullWidth,
}: {
  isFetching: boolean;
  onRetry: () => void;
  fullWidth?: boolean;
}) {
  const t = useTranslations('common.loadError');
  return (
    <>
      <Button
        fullWidth={fullWidth}
        aria-disabled={isFetching || undefined}
        onClick={() => {
          if (!isFetching) onRetry();
        }}
      >
        {isFetching ? t('retrying') : t('retry')}
      </Button>
      <span role="status" className="sr-only">
        {isFetching ? t('retrying') : ''}
      </span>
    </>
  );
}

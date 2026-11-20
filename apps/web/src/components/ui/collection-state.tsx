import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

export function CollectionSkeleton({ rows = 3 }: { rows?: number }) {
  const t = useTranslations('common');
  return (
    <div role="status" className="grid gap-3">
      <span className="sr-only">{t('loading')}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="h-16 rounded-xl border border-divider bg-surface-muted motion-safe:animate-pulse"
        />
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-control-border/50 bg-surface-muted/60 px-4 py-5 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

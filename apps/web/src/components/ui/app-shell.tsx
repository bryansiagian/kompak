import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

export function Brand({ linked = false }: { linked?: boolean }) {
  const t = useTranslations('common');
  const mark = (
    <>
      <span
        aria-hidden="true"
        className="brand-stamp grid size-9 shrink-0 place-items-center"
      >
        K
      </span>
      <span className="wordmark">{t('appName')}</span>
    </>
  );
  return linked ? (
    <Link
      href="/groups"
      className="control-focus inline-flex min-h-11 items-center gap-2.5 rounded-lg"
    >
      {mark}
    </Link>
  ) : (
    <div className="inline-flex items-center gap-2.5">{mark}</div>
  );
}

export function AppShell({
  children,
  actions,
  wide,
  home,
}: {
  children: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
  home?: boolean;
}) {
  const t = useTranslations('redesign');
  return (
    <>
      <a
        href="#main-content"
        className="control-focus sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3"
      >
        {t('skip')}
      </a>
      <header className="masthead">
        <div
          className={`mx-auto flex min-h-16 items-center justify-between gap-3 px-4 py-2 sm:px-6 ${wide ? 'max-w-[100rem]' : 'max-w-7xl'}`}
        >
          <nav aria-label={t('navigation')} className="flex items-center gap-5">
            <Brand linked={!home} />
            <span
              aria-current={home ? 'page' : 'location'}
              className="rounded-full bg-brand-tint px-3 py-1.5 text-xs font-semibold text-brand-ink"
            >
              {t(wide ? 'project' : 'groups')}
            </span>
          </nav>
          {actions}
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className={`mx-auto min-w-0 px-4 py-6 sm:px-6 sm:py-8 ${wide ? 'max-w-[100rem]' : 'max-w-7xl'}`}
      >
        {children}
      </main>
    </>
  );
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="display-heading wrap-anywhere">{title}</h1>
        {description ? (
          <p className="mt-2 wrap-anywhere text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}

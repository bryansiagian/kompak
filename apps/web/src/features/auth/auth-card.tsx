'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Brand } from '@/components/ui/app-shell';
import { TextLink } from '@/components/ui/text-link';

interface AuthCardFooter {
  text: string;
  label: string;
  href: string;
}

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: AuthCardFooter;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  const t = useTranslations('common');
  const design = useTranslations('redesign');

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl content-center gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-stretch lg:gap-0">
      <aside className="auth-jacket relative isolate overflow-hidden rounded-3xl bg-brand-ink p-5 text-white sm:p-8 lg:flex lg:flex-col lg:justify-between lg:rounded-r-none lg:p-12">
        <Brand />
        <div className="mt-4 lg:mt-16">
          <p className="display-heading hidden max-w-sm lg:block">
            {design('authHeading')}
          </p>
          <p className="max-w-sm text-sm lg:mt-4 lg:text-base">
            {t('tagline')}
          </p>
        </div>
        <ul className="mt-10 hidden space-y-3 text-sm font-semibold lg:block">
          {[design('authGroups'), design('authTasks'), design('authShare')].map(
            (item) => (
              <li key={item} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-emerald-200"
                />
                {item}
              </li>
            ),
          )}
        </ul>
      </aside>
      <div className="rounded-3xl border border-divider bg-surface p-5 shadow-panel sm:p-8 lg:rounded-l-none lg:p-12">
        <h1 className="display-heading wrap-anywhere">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-6">{children}</div>
        {footer ? (
          <p className="mt-5 border-t border-divider pt-3 text-sm text-muted-foreground">
            {footer.text} <TextLink href={footer.href}>{footer.label}</TextLink>
          </p>
        ) : null}
      </div>
    </main>
  );
}

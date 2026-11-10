'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
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

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-8">
      <p className="text-center text-2xl font-extrabold tracking-tight text-emerald-700">
        {t('appName')}
      </p>
      <p className="mt-1 text-center text-sm text-stone-600">{t('tagline')}</p>

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
        <div className="mt-5">{children}</div>
      </div>

      {footer ? (
        <p className="mt-4 text-center text-sm text-stone-600">
          {footer.text} <TextLink href={footer.href}>{footer.label}</TextLink>
        </p>
      ) : null}
    </main>
  );
}
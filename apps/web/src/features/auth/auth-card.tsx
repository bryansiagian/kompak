'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  switchText: string;
  switchLabel: string;
  switchHref: string;
}

export function AuthCard({
  title,
  subtitle,
  children,
  switchText,
  switchLabel,
  switchHref,
}: AuthCardProps) {
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

      <p className="mt-4 text-center text-sm text-stone-600">
        {switchText}{' '}
        <Link
          href={switchHref}
          className="inline-flex min-h-11 items-center font-semibold text-emerald-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          {switchLabel}
        </Link>
      </p>
    </main>
  );
}
'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { extractInviteCode } from './invite';

export function JoinCodeForm() {
  const t = useTranslations('groups.joinCode');
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = new FormData(event.currentTarget).get('code');
    const code = typeof raw === 'string' ? extractInviteCode(raw) : '';

    if (code.length === 0) {
      setError(t('required'));
      return;
    }
    setError(undefined);
    router.push(`/join/${encodeURIComponent(code)}`);
  }

  return (
    <details className="group col-span-12 rounded-xl border border-divider bg-surface-muted sm:col-span-9 lg:col-span-6">
      <summary className="control-focus flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-3 font-semibold">
        <span>{t('title')}</span>
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-lg text-primary transition-transform duration-200 group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="px-5 pb-5">
        <p className="mb-3 text-sm text-muted-foreground">{t('description')}</p>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <TextField
            name="code"
            label={t('label')}
            autoCapitalize="characters"
            autoComplete="off"
            error={error}
          />
          <Button type="submit" variant="secondary">
            {t('submit')}
          </Button>
        </form>
      </div>
    </details>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
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
    <Section title={t('title')} description={t('description')}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          name="code"
          label={t('label')}
          autoCapitalize="characters"
          autoComplete="off"
          error={error}
        />
        <Button type="submit" variant="secondary" fullWidth>
          {t('submit')}
        </Button>
      </form>
    </Section>
  );
}
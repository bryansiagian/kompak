'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { requestCodeSchema } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { TextField } from '@/components/ui/text-field';
import { AuthCard } from './auth-card';
import { authErrorKey } from './errors';
import { useForgotPasswordMutation } from './hooks';

interface ForgotEmailStepProps {
  onCodeSent: (email: string) => void;
}

export function ForgotEmailStep({ onCodeSent }: ForgotEmailStepProps) {
  const t = useTranslations('auth');
  const forgot = useForgotPasswordMutation();
  const [emailError, setEmailError] = useState<string | undefined>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = requestCodeSchema.safeParse({ email: form.get('email') });

    if (!parsed.success) {
      setEmailError(t('errors.emailInvalid'));
      return;
    }

    setEmailError(undefined);
    const { email } = parsed.data;
    forgot.mutate(email, { onSuccess: () => onCodeSent(email) });
  }

  const formError = forgot.isError
    ? t(`errors.${authErrorKey(forgot.error)}`)
    : null;

  return (
    <AuthCard
      title={t('forgot.emailStep.title')}
      subtitle={t('forgot.emailStep.subtitle')}
      footer={{
        text: t('forgot.switchText'),
        label: t('forgot.switchLink'),
        href: '/login',
      }}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          name="email"
          type="email"
          label={t('fields.email')}
          autoComplete="email"
          inputMode="email"
          error={emailError}
        />
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <Button type="submit" fullWidth disabled={forgot.isPending}>
          {forgot.isPending
            ? t('forgot.emailStep.submitting')
            : t('forgot.emailStep.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
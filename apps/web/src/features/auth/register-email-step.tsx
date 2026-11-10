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
import { useRequestRegistrationCodeMutation } from './hooks';

interface RegisterEmailStepProps {
  onCodeSent: (email: string) => void;
}

export function RegisterEmailStep({ onCodeSent }: RegisterEmailStepProps) {
  const t = useTranslations('auth');
  const requestCode = useRequestRegistrationCodeMutation();
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
    requestCode.mutate(email, { onSuccess: () => onCodeSent(email) });
  }

  const formError = requestCode.isError
    ? t(`errors.${authErrorKey(requestCode.error)}`)
    : null;

  return (
    <AuthCard
      title={t('register.emailStep.title')}
      subtitle={t('register.emailStep.subtitle')}
      footer={{
        text: t('register.switchText'),
        label: t('register.switchLink'),
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
        <Button type="submit" fullWidth disabled={requestCode.isPending}>
          {requestCode.isPending
            ? t('register.emailStep.submitting')
            : t('register.emailStep.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
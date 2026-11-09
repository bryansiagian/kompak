'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { loginSchema } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { AuthCard } from './auth-card';
import { authErrorKey } from './errors';
import { GuestOnly } from './guest-only';
import { useLoginMutation } from './hooks';

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginForm() {
  const t = useTranslations('auth');
  const login = useLoginMutation();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: form.get('email'),
      password: form.get('password'),
    });

    if (!parsed.success) {
      const failed = new Set(
        parsed.error.issues.map((issue) => String(issue.path[0])),
      );
      setFieldErrors({
        email: failed.has('email') ? t('errors.emailInvalid') : undefined,
        password: failed.has('password')
          ? t('errors.passwordRequired')
          : undefined,
      });
      return;
    }

    setFieldErrors({});
    login.mutate(parsed.data);
  }

  const formError = login.isError
    ? t(`errors.${authErrorKey(login.error)}`)
    : null;

  return (
    <GuestOnly>
      <AuthCard
        title={t('login.title')}
        subtitle={t('login.subtitle')}
        switchText={t('login.switchText')}
        switchLabel={t('login.switchLink')}
        switchHref="/register"
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <TextField
            name="email"
            type="email"
            label={t('fields.email')}
            autoComplete="email"
            inputMode="email"
            error={fieldErrors.email}
          />
          <TextField
            name="password"
            type="password"
            label={t('fields.password')}
            autoComplete="current-password"
            error={fieldErrors.password}
          />
          {formError ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700"
            >
              {formError}
            </p>
          ) : null}
          <Button type="submit" fullWidth disabled={login.isPending}>
            {login.isPending ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>
      </AuthCard>
    </GuestOnly>
  );
}
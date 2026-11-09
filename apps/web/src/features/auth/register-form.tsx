'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { registerSchema } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { AuthCard } from './auth-card';
import { authErrorKey } from './errors';
import { GuestOnly } from './guest-only';
import { useRegisterMutation } from './hooks';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

export function RegisterForm() {
  const t = useTranslations('auth');
  const register = useRegisterMutation();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      name: form.get('name'),
      email: form.get('email'),
      password: form.get('password'),
    });

    if (!parsed.success) {
      const failed = new Set(
        parsed.error.issues.map((issue) => String(issue.path[0])),
      );
      setFieldErrors({
        name: failed.has('name') ? t('errors.nameRequired') : undefined,
        email: failed.has('email') ? t('errors.emailInvalid') : undefined,
        password: failed.has('password') ? t('errors.passwordMin') : undefined,
      });
      return;
    }

    setFieldErrors({});
    register.mutate(parsed.data);
  }

  const formError = register.isError
    ? t(`errors.${authErrorKey(register.error)}`)
    : null;

  return (
    <GuestOnly>
      <AuthCard
        title={t('register.title')}
        subtitle={t('register.subtitle')}
        switchText={t('register.switchText')}
        switchLabel={t('register.switchLink')}
        switchHref="/login"
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <TextField
            name="name"
            label={t('fields.name')}
            autoComplete="name"
            error={fieldErrors.name}
          />
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
            hint={t('fields.passwordHint')}
            autoComplete="new-password"
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
          <Button type="submit" fullWidth disabled={register.isPending}>
            {register.isPending
              ? t('register.submitting')
              : t('register.submit')}
          </Button>
        </form>
      </AuthCard>
    </GuestOnly>
  );
}
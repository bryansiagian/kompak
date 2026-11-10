'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { EMAIL_CODE_LENGTH, resetPasswordSchema } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { TextField } from '@/components/ui/text-field';
import { AuthCard } from './auth-card';
import { RESEND_COOLDOWN_SECONDS } from './constants';
import { authErrorKey } from './errors';
import { useForgotPasswordMutation, useResetPasswordMutation } from './hooks';
import { useCountdown } from './use-countdown';

interface FieldErrors {
  code?: string;
  password?: string;
}

interface ResetPasswordStepProps {
  email: string;
  onChangeEmail: () => void;
  onDone: () => void;
}

export function ResetPasswordStep({
  email,
  onChangeEmail,
  onDone,
}: ResetPasswordStepProps) {
  const t = useTranslations('auth');
  const reset = useResetPasswordMutation();
  const resend = useForgotPasswordMutation();
  const { secondsLeft, start } = useCountdown(RESEND_COOLDOWN_SECONDS);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      email,
      code: form.get('code'),
      password: form.get('password'),
    });

    if (!parsed.success) {
      const failed = new Set(
        parsed.error.issues.map((issue) => String(issue.path[0])),
      );
      setFieldErrors({
        code: failed.has('code') ? t('errors.codeInvalid') : undefined,
        password: failed.has('password') ? t('errors.passwordMin') : undefined,
      });
      return;
    }

    setFieldErrors({});
    reset.mutate(parsed.data, { onSuccess: onDone });
  }

  function handleResend() {
    resend.mutate(email, { onSuccess: () => start(RESEND_COOLDOWN_SECONDS) });
  }

  const formError = reset.isError
    ? t(`errors.${authErrorKey(reset.error)}`)
    : null;
  const resendError = resend.isError
    ? t(`errors.${authErrorKey(resend.error)}`)
    : null;

  return (
    <AuthCard
      title={t('forgot.resetStep.title')}
      subtitle={t('forgot.resetStep.subtitle', { email })}
      footer={{
        text: t('forgot.switchText'),
        label: t('forgot.switchLink'),
        href: '/login',
      }}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          name="code"
          label={t('fields.code')}
          hint={t('fields.codeHint')}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={EMAIL_CODE_LENGTH}
          error={fieldErrors.code}
        />
        <TextField
          name="password"
          type="password"
          label={t('fields.newPassword')}
          hint={t('fields.passwordHint')}
          autoComplete="new-password"
          error={fieldErrors.password}
        />
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <Button type="submit" fullWidth disabled={reset.isPending}>
          {reset.isPending
            ? t('forgot.resetStep.submitting')
            : t('forgot.resetStep.submit')}
        </Button>
      </form>

      <div className="mt-4 space-y-3">
        <Button
          variant="secondary"
          fullWidth
          onClick={handleResend}
          disabled={secondsLeft > 0 || resend.isPending}
        >
          {secondsLeft > 0
            ? t('code.resendIn', { seconds: secondsLeft })
            : t('code.resend')}
        </Button>
        {resendError ? <FormAlert>{resendError}</FormAlert> : null}
        {resend.isSuccess && secondsLeft > 0 ? (
          <p role="status" className="text-center text-sm text-emerald-700">
            {t('code.resent')}
          </p>
        ) : null}
        <Button variant="secondary" fullWidth onClick={onChangeEmail}>
          {t('code.changeEmail')}
        </Button>
      </div>
    </AuthCard>
  );
}
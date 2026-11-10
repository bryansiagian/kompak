'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthCard } from './auth-card';
import { ForgotEmailStep } from './forgot-email-step';
import { GuestOnly } from './guest-only';
import { ResetPasswordStep } from './reset-password-step';

type Phase =
  | { name: 'email' }
  | { name: 'reset'; email: string }
  | { name: 'done' };

export function ForgotPasswordFlow() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: 'email' });

  return (
    <GuestOnly>
      {phase.name === 'email' ? (
        <ForgotEmailStep
          onCodeSent={(email) => setPhase({ name: 'reset', email })}
        />
      ) : null}
      {phase.name === 'reset' ? (
        <ResetPasswordStep
          email={phase.email}
          onChangeEmail={() => setPhase({ name: 'email' })}
          onDone={() => setPhase({ name: 'done' })}
        />
      ) : null}
      {phase.name === 'done' ? (
        <AuthCard
          title={t('forgot.done.title')}
          subtitle={t('forgot.done.subtitle')}
        >
          <Button fullWidth onClick={() => router.push('/login')}>
            {t('forgot.done.toLogin')}
          </Button>
        </AuthCard>
      ) : null}
    </GuestOnly>
  );
}
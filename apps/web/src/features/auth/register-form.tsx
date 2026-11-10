'use client';

import { useState } from 'react';
import { GuestOnly } from './guest-only';
import { RegisterDetailsStep } from './register-details-step';
import { RegisterEmailStep } from './register-email-step';

export function RegisterForm() {
  const [email, setEmail] = useState<string | null>(null);

  return (
    <GuestOnly>
      {email === null ? (
        <RegisterEmailStep onCodeSent={setEmail} />
      ) : (
        <RegisterDetailsStep
          email={email}
          onChangeEmail={() => setEmail(null)}
        />
      )}
    </GuestOnly>
  );
}
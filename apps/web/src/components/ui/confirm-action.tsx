'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from './button';

interface ConfirmActionProps {
  label: string;
  prompt: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
}

// Aksi yang merusak butuh satu konfirmasi di tempat (tanpa dialog).
export function ConfirmAction({
  label,
  prompt,
  confirmLabel,
  onConfirm,
  disabled = false,
}: ConfirmActionProps) {
  const t = useTranslations('common');
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <Button
        variant="secondary"
        onClick={() => setAsking(true)}
        disabled={disabled}
      >
        {label}
      </Button>
    );
  }

  return (
    <div role="alert" className="w-full space-y-3 rounded-xl bg-red-50 p-3">
      <p className="text-sm text-red-800">{prompt}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="danger"
          onClick={() => {
            setAsking(false);
            onConfirm();
          }}
        >
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={() => setAsking(false)}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}
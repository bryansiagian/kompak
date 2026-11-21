'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from './button';

interface ConfirmActionProps {
  label: string;
  prompt: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}

// Aksi yang merusak butuh satu konfirmasi di tempat (tanpa dialog).
export function ConfirmAction({
  label,
  prompt,
  confirmLabel,
  onConfirm,
  disabled = false,
  icon,
}: ConfirmActionProps) {
  const t = useTranslations('common');
  const [asking, setAsking] = useState(false);

  const promptId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (asking) {
      cancelRef.current?.focus();
      return;
    }

    const container = containerRef.current;
    if (restoreFocus.current) {
      restoreFocus.current = false;
      if (disabled) container?.focus();
      else triggerRef.current?.focus();
    } else if (container && document.activeElement === container && !disabled) {
      triggerRef.current?.focus();
    }
  }, [asking, disabled]);

  function dismiss() {
    restoreFocus.current = true;
    setAsking(false);
  }

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="group"
      aria-label={label}
      className={
        asking
          ? 'basis-full w-full space-y-3 wrap-anywhere rounded-xl bg-danger-surface p-3'
          : undefined
      }
      onKeyDown={(event) => {
        if (asking && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          dismiss();
        }
      }}
    >
      {asking ? (
        <>
          <p id={promptId} className="text-sm text-danger">
            {prompt}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              disabled={disabled}
              onClick={() => {
                dismiss();
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
            <Button
              ref={cancelRef}
              variant="secondary"
              aria-describedby={promptId}
              onClick={dismiss}
            >
              {t('cancel')}
            </Button>
          </div>
        </>
      ) : icon ? (
        <div className="group/action relative">
          <button
            ref={triggerRef}
            type="button"
            aria-label={label}
            aria-busy={disabled}
            disabled={disabled}
            onClick={() => setAsking(true)}
            className="control-focus grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-brand-tint hover:text-brand-ink disabled:opacity-45"
          >
            {icon}
          </button>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-0 bottom-full z-10 hidden w-max max-w-48 wrap-anywhere rounded-md bg-foreground px-2 py-1 text-xs text-white group-hover/action:block group-focus-within/action:block"
          >
            {label}
          </span>
        </div>
      ) : (
        <Button
          ref={triggerRef}
          variant="secondary"
          onClick={() => setAsking(true)}
          disabled={disabled}
        >
          {label}
        </Button>
      )}
    </div>
  );
}

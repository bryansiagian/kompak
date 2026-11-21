'use client';

import { useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button, buttonClassName } from './button';
import { FormAlert } from './form-alert';
import { TextField } from './text-field';
import './destructive-confirm-dialog.css';

interface Props {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  icon?: ReactNode;
  exactName?: string;
  disabled?: boolean;
  onConfirm: () => Promise<unknown>;
  describeError: (error: unknown) => string;
}

export function DestructiveConfirmDialog({
  label,
  title,
  description,
  confirmLabel,
  pendingLabel,
  icon,
  exactName,
  disabled,
  onConfirm,
  describeError,
}: Props) {
  const t = useTranslations('common');
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const matches = exactName === undefined || typed === exactName;

  function open() {
    setTyped('');
    setError('');
    dialog.current?.showModal();
    cancel.current?.focus();
  }

  async function confirm() {
    if (inFlight.current || !matches || disabled) return;
    inFlight.current = true;
    setPending(true);
    setError('');
    cancel.current?.focus();
    try {
      await onConfirm();
      dialog.current?.close();
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!inFlight.current) dialog.current?.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = event.currentTarget.querySelectorAll<HTMLElement>(
      'button:enabled,input:enabled',
    );
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (
      event.shiftKey
        ? document.activeElement === first
        : document.activeElement === last
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        title={icon ? label : undefined}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={open}
        className={
          icon
            ? 'control-focus grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-danger-surface hover:text-danger disabled:opacity-50'
            : buttonClassName('secondary')
        }
      >
        {icon ?? label}
      </button>
      <dialog
        ref={dialog}
        data-destructive-confirm=""
        aria-labelledby={id}
        aria-describedby={id + '-description'}
        closedby={pending ? 'none' : 'closerequest'}
        onKeyDown={handleKeyDown}
        onCancel={(event) => {
          if (inFlight.current) event.preventDefault();
        }}
        onClose={() => trigger.current?.focus()}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overscroll-contain rounded-2xl border border-divider bg-surface p-5 text-foreground shadow-xl backdrop:bg-brand-ink/55 sm:p-6"
      >
        <span
          aria-hidden="true"
          className="mb-4 grid size-10 place-items-center rounded-xl bg-danger-surface text-danger"
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7m4-7v7" />
          </svg>
        </span>
        <h2 id={id} className="wrap-anywhere text-xl font-bold tracking-tight">
          {title}
        </h2>
        <p
          id={id + '-description'}
          className="mt-2 wrap-anywhere text-sm leading-relaxed text-muted-foreground"
        >
          {description}
        </p>
        {exactName !== undefined && (
          <div className="mt-4 wrap-anywhere">
            <TextField
              label={t('confirmGroupName', { name: exactName })}
              value={typed}
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
              onChange={(event) => setTyped(event.currentTarget.value)}
            />
          </div>
        )}
        {error && (
          <div className="mt-4">
            <FormAlert>{error}</FormAlert>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            ref={cancel}
            variant="secondary"
            aria-disabled={pending}
            onClick={() => {
              if (!inFlight.current) dialog.current?.close();
            }}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={!matches || pending || disabled}
            onClick={confirm}
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}

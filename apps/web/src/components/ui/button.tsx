import type { ComponentPropsWithRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps
  extends Omit<ComponentPropsWithRef<'button'>, 'className'> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border-transparent bg-primary text-on-primary not-disabled:not-aria-disabled:hover:bg-primary-hover',
  secondary:
    'border-control-border bg-surface text-foreground not-disabled:not-aria-disabled:hover:bg-surface-muted',
  danger: 'border-transparent bg-danger text-on-danger not-disabled:not-aria-disabled:hover:bg-danger-hover',
};

// Dipakai juga oleh tautan yang tampil seperti tombol.
export function buttonClassName(
  variant: ButtonVariant = 'primary',
  fullWidth = false,
): string {
  return `min-h-11 rounded-xl border px-4 py-2 text-base font-semibold transition-colors control-focus disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${
    VARIANT_CLASSES[variant]
  } ${fullWidth ? 'w-full' : ''}`;
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName(variant, fullWidth)}
      {...props}
    />
  );
}
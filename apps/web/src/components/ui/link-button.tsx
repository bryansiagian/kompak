import Link from 'next/link';
import type { ComponentProps } from 'react';
import { buttonClassName } from './button';
import type { ButtonVariant } from './button';

type LinkButtonProps = Omit<ComponentProps<typeof Link>, 'className'> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function LinkButton({
  variant = 'primary',
  fullWidth = false,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={`${buttonClassName(variant, fullWidth)} inline-flex items-center justify-center text-center`}
      {...props}
    />
  );
}
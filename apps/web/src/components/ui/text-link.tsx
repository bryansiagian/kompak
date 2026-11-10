    import Link from 'next/link';
import type { ComponentProps } from 'react';

type TextLinkProps = Omit<ComponentProps<typeof Link>, 'className'>;

export function TextLink(props: TextLinkProps) {
  return (
    <Link
      className="inline-flex min-h-11 items-center font-semibold text-emerald-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      {...props}
    />
  );
}
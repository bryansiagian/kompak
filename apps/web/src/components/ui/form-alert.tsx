import type { ReactNode } from 'react';

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-danger-surface px-3.5 py-3 text-sm text-danger"
    >
      {children}
    </p>
  );
}
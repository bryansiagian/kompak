import type { ReactNode } from 'react';

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700"
    >
      {children}
    </p>
  );
}
import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
}

export function Section({ title, description, children, id }: SectionProps) {
  return (
    <section
      id={id}
      className="min-w-0 scroll-mt-4 rounded-2xl border border-divider bg-surface p-4 shadow-panel sm:p-5"
    >
      <h2 className="text-lg font-bold">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

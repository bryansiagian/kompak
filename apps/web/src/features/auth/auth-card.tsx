'use client';

import type { ReactNode } from 'react';
import { LoginStory } from './login-story';
import { TextLink } from '@/components/ui/text-link';

interface AuthCardFooter {
  text: string;
  label: string;
  href: string;
}

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: AuthCardFooter;
  login?: boolean;
}

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  login = false,
}: AuthCardProps) {
  return (
    <main className="login-spread">
      <LoginStory compact={!login} />
      <section className="login-sheet">
        <div>
          <h1 className="display-heading wrap-anywhere">{title}</h1>
          <p className="mt-2 wrap-anywhere text-sm text-muted-foreground">
            {subtitle}
          </p>
          <div className="mt-5">{children}</div>
          {footer && (
            <p className="mt-4 border-t border-divider pt-2 text-sm text-muted-foreground">
              {footer.text}{' '}
              <TextLink href={footer.href}>{footer.label}</TextLink>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

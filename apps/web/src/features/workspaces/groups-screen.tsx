'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { LinkButton } from '@/components/ui/link-button';
import { Section } from '@/components/ui/section';
import { useLogoutMutation } from '@/features/auth/hooks';
import { RequireAuth } from '@/features/auth/require-auth';
import { workspaceErrorKey } from './errors';
import { useWorkspaces } from './hooks';
import { JoinCodeForm } from './join-code-form';
import { RoleBadge } from './role-badge';

export function GroupsScreen() {
  const t = useTranslations('groups');
  const tCommon = useTranslations('common');
  const logout = useLogoutMutation();
  const workspaces = useWorkspaces();

  return (
    <RequireAuth>
      {(user) => (
        <main className="mx-auto min-h-dvh w-full max-w-md space-y-5 px-4 py-8">
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xl font-extrabold tracking-tight text-emerald-700">
                {tCommon('appName')}
              </p>
              <p className="text-sm text-stone-600">
                {t('list.greeting', { name: user.name })}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              {logout.isPending ? tCommon('loggingOut') : tCommon('logout')}
            </Button>
          </header>

          <Section title={t('list.title')}>
            {workspaces.isPending ? (
              <p role="status" className="text-sm text-stone-600">
                {tCommon('loading')}
              </p>
            ) : workspaces.isError ? (
              <FormAlert>
                {t(`errors.${workspaceErrorKey(workspaces.error)}`)}
              </FormAlert>
            ) : workspaces.data.length === 0 ? (
              <p className="text-sm text-stone-600">{t('list.empty')}</p>
            ) : (
              <ul className="space-y-2">
                {workspaces.data.map((workspace) => (
                  <li key={workspace.id}>
                    <Link
                      href={`/groups/${workspace.id}`}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-xl p-3 ring-1 ring-stone-200 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {workspace.name}
                        </span>
                        <span className="block text-sm text-stone-600">
                          {t('list.memberCount', { count: workspace.memberCount })}
                          {' · '}
                          {t('list.boardCount', { count: workspace.boardCount })}
                        </span>
                      </span>
                      <RoleBadge role={workspace.role} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <LinkButton href="/groups/new" fullWidth>
                {t('list.create')}
              </LinkButton>
            </div>
          </Section>

          <JoinCodeForm />
        </main>
      )}
    </RequireAuth>
  );
}
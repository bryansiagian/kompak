'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { LinkButton } from '@/components/ui/link-button';
import { AppShell, PageHeader } from '@/components/ui/app-shell';
import {
  CollectionSkeleton,
  EmptyState,
} from '@/components/ui/collection-state';
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
        <AppShell
          actions={
            <Button
              variant="secondary"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              {logout.isPending ? tCommon('loggingOut') : tCommon('logout')}
            </Button>
          }
        >
          <PageHeader
            title={t('list.title')}
            description={t('list.greeting', { name: user.name })}
          >
            <LinkButton href="/groups/new">{t('list.create')}</LinkButton>
          </PageHeader>
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section aria-label={t('list.title')} className="min-w-0">
              {workspaces.isPending ? (
                <CollectionSkeleton />
              ) : workspaces.isError ? (
                <div className="space-y-3">
                  <FormAlert>
                    {t(`errors.${workspaceErrorKey(workspaces.error)}`)}
                  </FormAlert>
                  <Button
                    variant="secondary"
                    disabled={workspaces.isFetching}
                    onClick={() => void workspaces.refetch()}
                  >
                    {tCommon('loadError.retry')}
                  </Button>
                </div>
              ) : workspaces.data.length === 0 ? (
                <EmptyState>{t('list.empty')}</EmptyState>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {workspaces.data.map((workspace) => (
                    <li key={workspace.id} className="min-w-0">
                      <Link
                        href={`/groups/${workspace.id}`}
                        className="control-focus flex h-full min-h-36 flex-col justify-between gap-4 rounded-2xl border border-divider bg-surface p-4 shadow-panel transition-colors hover:border-primary sm:p-5"
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span
                            aria-hidden="true"
                            className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-tint font-bold text-brand-ink"
                          >
                            {Array.from(
                              workspace.name.trim(),
                            )[0]?.toLocaleUpperCase('id')}
                          </span>
                          <RoleBadge role={workspace.role} />
                        </span>
                        <span>
                          <span className="block wrap-anywhere text-lg font-bold">
                            {workspace.name}
                          </span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {t('list.memberCount', {
                              count: workspace.memberCount,
                            })}
                            {' ? '}
                            {t('list.boardCount', {
                              count: workspace.boardCount,
                            })}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <JoinCodeForm />
          </div>
        </AppShell>
      )}
    </RequireAuth>
  );
}

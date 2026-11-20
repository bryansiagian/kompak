'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { AppShell } from '@/components/ui/app-shell';
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
          home
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
          <div className="mx-auto grid max-w-6xl grid-cols-12 gap-x-4 gap-y-3 sm:gap-x-5">
            <header className="col-span-12 rounded-2xl bg-primary p-5 text-white md:col-span-8 md:p-7">
              <h1 className="wrap-anywhere font-display text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
                {t('list.greeting', { name: user.name })}
              </h1>
              <Link
                href="/groups/new"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-brand-ink transition-colors hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <span aria-hidden="true">＋</span>
                {t('list.create')}
              </Link>
            </header>
            <aside className="col-span-12 flex items-baseline gap-3 rounded-2xl bg-secondary px-5 py-3 text-brand-ink md:col-span-4 md:flex-col md:justify-between md:p-6">
              <span className="order-last text-sm font-semibold md:order-first">
                {t('list.projectTotal')}
              </span>
              <strong className="font-display text-3xl leading-none tracking-tight md:text-6xl">
                {workspaces.isSuccess
                  ? workspaces.data.reduce(
                      (total, group) => total + group.boardCount,
                      0,
                    )
                  : '—'}
              </strong>
            </aside>
            <section
              className="col-span-12 min-w-0 py-4 sm:py-6"
              aria-label={t('list.title')}
            >
              <h2 className="mb-4 flex items-baseline gap-3 border-b border-divider pb-3 text-2xl font-bold tracking-tight sm:text-3xl">
                {t('list.title')}
                {workspaces.isSuccess && (
                  <span className="text-base font-medium text-muted-foreground">
                    {workspaces.data.length}
                  </span>
                )}
              </h2>
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
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {workspaces.data.map((workspace) => (
                    <li key={workspace.id} className="min-w-0">
                      <Link
                        href={`/groups/${workspace.id}`}
                        className="control-focus group flex h-full flex-col gap-4 rounded-xl border border-divider bg-surface p-4 transition duration-150 hover:border-primary hover:shadow-panel motion-safe:hover:-translate-y-0.5"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span
                            aria-hidden="true"
                            className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-lg font-bold text-brand-ink"
                          >
                            {Array.from(
                              workspace.name.trim(),
                            )[0]?.toLocaleUpperCase('id')}
                          </span>
                          <RoleBadge role={workspace.role} />
                        </span>
                        <span className="flex flex-1 flex-col justify-end">
                          <span className="block wrap-anywhere text-lg font-bold">
                            {workspace.name}
                          </span>
                          <span className="mt-3 flex flex-wrap items-center gap-x-2 border-t border-divider pt-3 text-sm text-muted-foreground">
                            {t('list.memberCount', {
                              count: workspace.memberCount,
                            })}
                            <span aria-hidden="true">·</span>
                            {t('list.boardCount', {
                              count: workspace.boardCount,
                            })}
                            <span
                              aria-hidden="true"
                              className="ml-auto font-bold text-primary"
                            >
                              →
                            </span>
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

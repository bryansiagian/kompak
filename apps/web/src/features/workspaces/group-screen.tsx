'use client';

import { useTranslations } from 'next-intl';
import type { AuthUser } from '@kompak/shared';
import { AppShell } from '@/components/ui/app-shell';
import { RetryButton, useLoadError } from '@/components/ui/load-error';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { TextLink } from '@/components/ui/text-link';
import { RequireAuth } from '@/features/auth/require-auth';
import { GroupSettings } from './group-settings';
import { useWorkspace } from './hooks';
import { InviteSection } from './invite-section';
import { MembersSection } from './members-section';
import { ProjectsSection } from './projects-section';
import { RoleBadge } from './role-badge';

export function GroupScreen({ groupId }: { groupId: string }) {
  return (
    <RequireAuth>
      {(user) => <GroupContent groupId={groupId} user={user} />}
    </RequireAuth>
  );
}

function GroupContent({ groupId, user }: { groupId: string; user: AuthUser }) {
  const t = useTranslations('groups.detail');
  const design = useTranslations('redesign');
  const workspace = useWorkspace(groupId);

  const loadError = useLoadError(workspace, {
    title: t('notFoundTitle'),
    subtitle: t('notFoundBody'),
  });

  if (workspace.isPending || workspace.isError) {
    if (!loadError) return <LoadingScreen />;

    return (
      <AppShell>
        <div className="mx-auto max-w-lg space-y-3 rounded-2xl border border-divider bg-surface p-5">
          <h1 className="text-xl font-bold">{loadError.title}</h1>
          <p role="alert" className="text-sm text-muted-foreground">
            {loadError.subtitle}
          </p>
          {loadError.retry ? (
            <div>
              <RetryButton {...loadError.retry} />
            </div>
          ) : null}
          <TextLink href="/groups">{t('back')}</TextLink>
        </div>
      </AppShell>
    );
  }

  const { data } = workspace;

  return (
    <AppShell>
      <TextLink href="/groups">{t('back')}</TextLink>
      <header className="my-4 flex flex-wrap items-center gap-3 border-b border-divider pb-5">
        <h1 className="min-w-0 wrap-anywhere text-3xl font-bold tracking-tight sm:text-5xl">
          {data.name}
        </h1>
        <RoleBadge role={data.role} />
      </header>
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-10">
        <ProjectsSection groupId={data.id} role={data.role} />
        <aside className="min-w-0 space-y-5">
          <InviteSection workspace={data} />
          <MembersSection
            groupId={data.id}
            viewer={{ userId: user.id, role: data.role }}
          />
          <details className="border-t border-divider">
            <summary className="control-focus min-h-11 cursor-pointer rounded-2xl px-4 py-3 font-semibold">
              {design('settings')}
            </summary>
            <div className="p-2 pt-0">
              <GroupSettings workspace={data} currentUserId={user.id} />
            </div>
          </details>
        </aside>
      </div>
    </AppShell>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import type { AuthUser } from '@kompak/shared';
import { AppShell, PageHeader } from '@/components/ui/app-shell';
import { Section } from '@/components/ui/section';
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
import { WorkspaceSearch } from './workspace-search';

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
          <TextLink href="/">{t('back')}</TextLink>
        </div>
      </AppShell>
    );
  }

  const { data } = workspace;

  return (
    <AppShell>
      <TextLink href="/">{t('back')}</TextLink>
      <PageHeader title={data.name} description={design('groupDescription')}>
        <RoleBadge role={data.role} />
        <a
          href="#group-invite"
          className="control-focus inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          {design('inviteAction')}
        </a>
      </PageHeader>
      <div className="workspace-spread mt-6 grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(15rem,.65fr)] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <ProjectsSection groupId={data.id} role={data.role} />
          <Section title={design('taskSearch')}>
            <WorkspaceSearch workspaceId={data.id} />
          </Section>
        </div>
        <aside
          className="min-w-0 space-y-5 md:border-l md:border-divider md:pl-5"
          aria-label={design('groups')}
        >
          <InviteSection workspace={data} />
          <MembersSection
            groupId={data.id}
            viewer={{ userId: user.id, role: data.role }}
          />
          <details className="rounded-2xl border border-divider bg-surface">
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

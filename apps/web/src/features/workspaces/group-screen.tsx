'use client';

import { useTranslations } from 'next-intl';
import type { AuthUser } from '@kompak/shared';
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
  const workspace = useWorkspace(groupId);

  const loadError = useLoadError(workspace, {
    title: t('notFoundTitle'),
    subtitle: t('notFoundBody'),
  });

  if (workspace.isPending || workspace.isError) {
    if (!loadError) return <LoadingScreen />;

    return (
      <main className="mx-auto min-h-dvh w-full max-w-md space-y-3 px-4 py-8">
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
      </main>
    );
  }

  const { data } = workspace;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md space-y-5 px-4 py-6">
      <TextLink href="/">{t('back')}</TextLink>
      <header className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 break-words text-2xl font-extrabold tracking-tight">
          {data.name}
        </h1>
        <RoleBadge role={data.role} />
      </header>

      <ProjectsSection groupId={data.id} role={data.role} />
      <WorkspaceSearch workspaceId={data.id} />
      <InviteSection workspace={data} />
      <MembersSection
        groupId={data.id}
        viewer={{ userId: user.id, role: data.role }}
      />
      <GroupSettings workspace={data} currentUserId={user.id} />
    </main>
  );
}
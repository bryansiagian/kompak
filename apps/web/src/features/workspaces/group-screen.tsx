'use client';

import { useTranslations } from 'next-intl';
import type { AuthUser } from '@kompak/shared';
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
  const workspace = useWorkspace(groupId);

  if (workspace.isPending) {
    return <LoadingScreen />;
  }

  if (workspace.isError) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md space-y-3 px-4 py-8">
        <h1 className="text-xl font-bold">{t('notFoundTitle')}</h1>
        <p className="text-sm text-stone-600">{t('notFoundBody')}</p>
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
      <InviteSection workspace={data} />
      <MembersSection
        groupId={data.id}
        viewer={{ userId: user.id, role: data.role }}
      />
      <GroupSettings workspace={data} currentUserId={user.id} />
    </main>
  );
}
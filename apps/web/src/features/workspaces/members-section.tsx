'use client';

import { useTranslations } from 'next-intl';
import type { Member, WorkspaceRole } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { FormAlert } from '@/components/ui/form-alert';
import { CollectionSkeleton } from '@/components/ui/collection-state';
import { useState } from 'react';
import { workspaceErrorKey } from './errors';
import { useChangeMemberRole, useMembers, useRemoveMember } from './hooks';
import { canChangeRoles, canRemoveMember } from './permissions';
import { RoleBadge } from './role-badge';

interface Viewer {
  userId: string;
  role: WorkspaceRole;
}

interface MembersSectionProps {
  groupId: string;
  viewer: Viewer;
}

export function MembersSection({ groupId, viewer }: MembersSectionProps) {
  const t = useTranslations('groups');
  const members = useMembers(groupId);

  const [managing, setManaging] = useState(false);
  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">
          {t('members.title')}{' '}
          <span className="text-sm text-muted-foreground">
            {members.data?.length}
          </span>
        </h2>
        {members.data?.some(
          (m) =>
            (canChangeRoles(viewer.role) && m.role !== 'OWNER') ||
            (m.userId !== viewer.userId && canRemoveMember(viewer, m)),
        ) && (
          <Button
            aria-expanded={managing}
            variant="secondary"
            onClick={() => setManaging(!managing)}
          >
            {t('members.manage')}
          </Button>
        )}
      </div>
      {members.isPending ? (
        <CollectionSkeleton rows={2} />
      ) : members.isError ? (
        <FormAlert>{t(`errors.${workspaceErrorKey(members.error)}`)}</FormAlert>
      ) : (
        <ul className="divide-y divide-divider">
          {members.data.map((member) => (
            <MemberRow
              key={member.userId}
              member={member}
              groupId={groupId}
              viewer={viewer}
              managing={managing}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface MemberRowProps {
  managing: boolean;
  member: Member;
  groupId: string;
  viewer: Viewer;
}

function MemberRow({ member, groupId, viewer, managing }: MemberRowProps) {
  const t = useTranslations('groups');
  const changeRole = useChangeMemberRole();
  const remove = useRemoveMember();

  const isSelf = member.userId === viewer.userId;
  const showRoleAction = canChangeRoles(viewer.role) && member.role !== 'OWNER';
  // Keluar dari kelompok ada di bagian Pengaturan, bukan di baris anggota.
  const showRemove =
    !isSelf &&
    canRemoveMember(viewer, { userId: member.userId, role: member.role });
  const error = changeRole.isError
    ? changeRole.error
    : remove.isError
      ? remove.error
      : null;

  return (
    <li className="space-y-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 wrap-anywhere font-medium">
          {member.name}
          {isSelf ? ` ${t('members.you')}` : ''}
        </p>
        <RoleBadge role={member.role} />
      </div>

      {managing && (showRoleAction || showRemove) ? (
        <div className="flex flex-wrap gap-2">
          {showRoleAction ? (
            <Button
              variant="secondary"
              disabled={changeRole.isPending}
              onClick={() =>
                changeRole.mutate({
                  workspaceId: groupId,
                  userId: member.userId,
                  role: member.role === 'MEMBER' ? 'ADMIN' : 'MEMBER',
                })
              }
            >
              {member.role === 'MEMBER'
                ? t('members.makeAdmin')
                : t('members.makeMember')}
            </Button>
          ) : null}
          {showRemove ? (
            <ConfirmAction
              label={t('members.remove')}
              prompt={t('members.removePrompt', { name: member.name })}
              confirmLabel={t('members.removeConfirm')}
              disabled={remove.isPending}
              onConfirm={() =>
                remove.mutate({ workspaceId: groupId, userId: member.userId })
              }
            />
          ) : null}
        </div>
      ) : null}

      {error ? (
        <FormAlert>{t(`errors.${workspaceErrorKey(error)}`)}</FormAlert>
      ) : null}
    </li>
  );
}

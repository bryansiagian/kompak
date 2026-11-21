'use client';

import { useTranslations } from 'next-intl';
import type { Member, WorkspaceRole } from '@kompak/shared';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { DestructiveConfirmDialog } from '@/components/ui/destructive-confirm-dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { CollectionSkeleton } from '@/components/ui/collection-state';
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

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">
          {t('members.title')}{' '}
          <span className="text-sm text-muted-foreground">
            {members.data?.length}
          </span>
        </h2>
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
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface MemberRowProps {
  member: Member;
  groupId: string;
  viewer: Viewer;
}

function MemberRow({ member, groupId, viewer }: MemberRowProps) {
  const t = useTranslations('groups');
  const changeRole = useChangeMemberRole();
  const remove = useRemoveMember();

  const isSelf = member.userId === viewer.userId;
  const showRoleAction =
    !isSelf && canChangeRoles(viewer.role) && member.role !== 'OWNER';
  // Keluar dari kelompok ada di bagian Pengaturan, bukan di baris anggota.
  const showRemove =
    !isSelf &&
    canRemoveMember(viewer, { userId: member.userId, role: member.role });
  const error = changeRole.isError ? changeRole.error : null;

  const roleLabel = t(
    member.role === 'MEMBER' ? 'members.promote' : 'members.demote',
    { name: member.name },
  );
  const pending = changeRole.isPending || remove.isPending;
  return (
    <li className="flex flex-wrap items-center gap-1 py-2">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="min-w-0 wrap-anywhere font-medium">
          {member.name}
          {isSelf ? ` ${t('members.you')}` : ''}
        </p>
        <RoleBadge role={member.role} />
      </div>

      {showRoleAction && (
        <ConfirmAction
          icon={
            <MemberIcon action={member.role === 'MEMBER' ? 'up' : 'down'} />
          }
          label={roleLabel}
          prompt={t('members.rolePrompt', { action: roleLabel })}
          confirmLabel={t(
            member.role === 'MEMBER'
              ? 'members.makeAdmin'
              : 'members.makeMember',
          )}
          disabled={pending}
          onConfirm={() =>
            changeRole.mutate({
              workspaceId: groupId,
              userId: member.userId,
              role: member.role === 'MEMBER' ? 'ADMIN' : 'MEMBER',
            })
          }
        />
      )}
      {showRemove ? (
        <DestructiveConfirmDialog
          icon={<MemberIcon action="remove" />}
          label={t('members.removeMember', { name: member.name })}
          title={t('members.removeTitle')}
          description={t('members.removeBody', { name: member.name })}
          confirmLabel={t('members.removeAction')}
          pendingLabel={t('members.removing')}
          disabled={changeRole.isPending}
          describeError={(cause) => t(`errors.${workspaceErrorKey(cause)}`)}
          onConfirm={() =>
            remove.mutateAsync({ workspaceId: groupId, userId: member.userId })
          }
        />
      ) : null}

      {error ? (
        <div className="basis-full">
          <FormAlert>{t(`errors.${workspaceErrorKey(error)}`)}</FormAlert>
        </div>
      ) : null}
    </li>
  );
}

function MemberIcon({ action }: { action: 'up' | 'down' | 'remove' }) {
  return (
    <svg
      aria-hidden="true"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {action === 'remove' ? (
        <>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2 20a7 7 0 0 1 14 0m0-9h6" />
        </>
      ) : (
        <path
          transform={action === 'down' ? 'rotate(180 12 12)' : undefined}
          d="M12 20V4m-7 7 7-7 7 7"
        />
      )}
    </svg>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { updateWorkspaceSchema } from '@kompak/shared';
import type { WorkspaceDetail } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { DestructiveConfirmDialog } from '@/components/ui/destructive-confirm-dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { TextField } from '@/components/ui/text-field';
import { workspaceErrorKey } from './errors';
import {
  useDeleteWorkspace,
  useLeaveWorkspace,
  useRenameWorkspace,
} from './hooks';
import { canManage } from './permissions';

interface GroupSettingsProps {
  workspace: WorkspaceDetail;
  currentUserId: string;
}

export function GroupSettings({
  workspace,
  currentUserId,
}: GroupSettingsProps) {
  const t = useTranslations('groups');
  const router = useRouter();
  const rename = useRenameWorkspace();
  const remove = useDeleteWorkspace();
  const leave = useLeaveWorkspace();
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? workspace.name;
  const parsed = updateWorkspaceSchema.safeParse({ name });
  const canSave =
    parsed.success &&
    name.trim() !== workspace.name.trim() &&
    !rename.isPending;

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || !parsed.success) return;
    rename.mutate(
      { workspaceId: workspace.id, input: parsed.data },
      {
        onSuccess: () => setDraft(null),
      },
    );
  }

  const error = rename.isError
    ? rename.error
    : leave.isError
      ? leave.error
      : null;

  return (
    <>
      <div className="space-y-4">
        {canManage(workspace.role) ? (
          <form
            onSubmit={handleRename}
            noValidate
            className="space-y-3 [&_button:disabled]:bg-surface-muted [&_button:disabled]:text-muted-foreground [&_button:disabled]:opacity-100"
          >
            <TextField
              name="name"
              label={t('settings.name')}
              value={name}
              onChange={(event) => setDraft(event.currentTarget.value)}
              readOnly={rename.isPending}
              autoComplete="off"
              error={
                draft !== null && !parsed.success
                  ? t('settings.nameRequired')
                  : undefined
              }
            />
            <Button type="submit" fullWidth disabled={!canSave}>
              {rename.isPending ? t('settings.saving') : t('settings.save')}
            </Button>
          </form>
        ) : null}

        {workspace.role === 'OWNER' ? (
          <DestructiveConfirmDialog
            label={t('settings.delete')}
            title={t('settings.deleteTitle', { name: workspace.name })}
            description={t('settings.deleteBody')}
            exactName={workspace.name}
            confirmLabel={t('settings.delete')}
            pendingLabel={t('settings.deleting')}
            describeError={(cause) => t(`errors.${workspaceErrorKey(cause)}`)}
            onConfirm={async () => {
              await remove.mutateAsync(workspace.id);
              router.replace('/groups');
            }}
          />
        ) : (
          <ConfirmAction
            label={t('settings.leave')}
            prompt={t('settings.leavePrompt')}
            confirmLabel={t('settings.leaveConfirm')}
            disabled={leave.isPending}
            onConfirm={() =>
              leave.mutate(
                { workspaceId: workspace.id, userId: currentUserId },
                { onSuccess: () => router.replace('/groups') },
              )
            }
          />
        )}

        {error ? (
          <FormAlert>{t(`errors.${workspaceErrorKey(error)}`)}</FormAlert>
        ) : null}
      </div>
    </>
  );
}

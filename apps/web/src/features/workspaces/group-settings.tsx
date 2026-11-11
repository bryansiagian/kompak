'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { updateWorkspaceSchema } from '@kompak/shared';
import type { WorkspaceDetail } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { FormAlert } from '@/components/ui/form-alert';
import { Section } from '@/components/ui/section';
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

export function GroupSettings({ workspace, currentUserId }: GroupSettingsProps) {
  const t = useTranslations('groups');
  const router = useRouter();
  const rename = useRenameWorkspace();
  const remove = useDeleteWorkspace();
  const leave = useLeaveWorkspace();
  const [nameError, setNameError] = useState<string | undefined>();

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = updateWorkspaceSchema.safeParse({
      name: new FormData(event.currentTarget).get('name'),
    });
    if (!parsed.success) {
      setNameError(t('settings.nameRequired'));
      return;
    }

    setNameError(undefined);
    rename.mutate({ workspaceId: workspace.id, input: parsed.data });
  }

  const error = rename.isError
    ? rename.error
    : remove.isError
      ? remove.error
      : leave.isError
        ? leave.error
        : null;

  return (
    <Section title={t('settings.title')}>
      <div className="space-y-4">
        {canManage(workspace.role) ? (
          <form
            key={workspace.name}
            onSubmit={handleRename}
            noValidate
            className="space-y-3"
          >
            <TextField
              name="name"
              label={t('settings.name')}
              defaultValue={workspace.name}
              autoComplete="off"
              error={nameError}
            />
            <Button type="submit" fullWidth disabled={rename.isPending}>
              {rename.isPending ? t('settings.saving') : t('settings.save')}
            </Button>
          </form>
        ) : null}

        {workspace.role === 'OWNER' ? (
          <ConfirmAction
            label={t('settings.delete')}
            prompt={t('settings.deletePrompt')}
            confirmLabel={t('settings.deleteConfirm')}
            disabled={remove.isPending}
            onConfirm={() =>
              remove.mutate(workspace.id, {
                onSuccess: () => router.replace('/'),
              })
            }
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
                { onSuccess: () => router.replace('/') },
              )
            }
          />
        )}

        {error ? (
          <FormAlert>{t(`errors.${workspaceErrorKey(error)}`)}</FormAlert>
        ) : null}
      </div>
    </Section>
  );
}
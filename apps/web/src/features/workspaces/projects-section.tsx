'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { createBoardSchema, updateBoardSchema } from '@kompak/shared';
import type { Board, WorkspaceRole } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { FormAlert } from '@/components/ui/form-alert';
import { Section } from '@/components/ui/section';
import { TextField } from '@/components/ui/text-field';
import { workspaceErrorKey } from './errors';
import {
  useBoards,
  useCreateBoard,
  useDeleteBoard,
  useRenameBoard,
} from './hooks';
import { canManage } from './permissions';

interface ProjectsSectionProps {
  groupId: string;
  role: WorkspaceRole;
}

export function ProjectsSection({ groupId, role }: ProjectsSectionProps) {
  const t = useTranslations('groups');
  const tCommon = useTranslations('common');
  const boards = useBoards(groupId);
  const manage = canManage(role);

  return (
    <Section
      title={t('projects.title')}
      description={
        manage
          ? t('projects.descriptionManager')
          : t('projects.descriptionMember')
      }
    >
      <div className="space-y-4">
        {boards.isPending ? (
          <p role="status" className="text-sm text-stone-600">
            {tCommon('loading')}
          </p>
        ) : boards.isError ? (
          <FormAlert>{t(`errors.${workspaceErrorKey(boards.error)}`)}</FormAlert>
        ) : boards.data.length === 0 ? (
          <p className="text-sm text-stone-600">
            {manage ? t('projects.emptyManager') : t('projects.emptyMember')}
          </p>
        ) : (
          <ul className="space-y-2">
            {boards.data.map((board) => (
              <BoardRow key={board.id} board={board} manage={manage} />
            ))}
          </ul>
        )}
        {manage ? <AddBoardForm groupId={groupId} /> : null}
      </div>
    </Section>
  );
}

function BoardRow({ board, manage }: { board: Board; manage: boolean }) {
  const t = useTranslations('groups');
  const tCommon = useTranslations('common');
  const rename = useRenameBoard();
  const remove = useDeleteBoard();
  const [editing, setEditing] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = updateBoardSchema.safeParse({
      name: new FormData(event.currentTarget).get('name'),
    });
    if (!parsed.success) {
      setNameError(t('projects.nameRequired'));
      return;
    }

    setNameError(undefined);
    rename.mutate(
      { boardId: board.id, workspaceId: board.workspaceId, input: parsed.data },
      { onSuccess: () => setEditing(false) },
    );
  }

  const error = rename.isError
    ? rename.error
    : remove.isError
      ? remove.error
      : null;

  return (
    <li className="space-y-2 rounded-xl p-3 ring-1 ring-stone-200">
      {editing ? (
        <form onSubmit={handleRename} noValidate className="space-y-3">
          <TextField
            name="name"
            label={t('projects.name')}
            defaultValue={board.name}
            error={nameError}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={rename.isPending}>
              {tCommon('save')}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              {tCommon('cancel')}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="font-medium">{board.name}</p>
          {manage ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                {t('projects.rename')}
              </Button>
              <ConfirmAction
                label={t('projects.delete')}
                prompt={t('projects.deletePrompt')}
                confirmLabel={t('projects.deleteConfirm')}
                disabled={remove.isPending}
                onConfirm={() =>
                  remove.mutate({
                    boardId: board.id,
                    workspaceId: board.workspaceId,
                  })
                }
              />
            </div>
          ) : null}
        </>
      )}
      {error ? (
        <FormAlert>{t(`errors.${workspaceErrorKey(error)}`)}</FormAlert>
      ) : null}
    </li>
  );
}

function AddBoardForm({ groupId }: { groupId: string }) {
  const t = useTranslations('groups');
  const create = useCreateBoard();
  const [nameError, setNameError] = useState<string | undefined>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = createBoardSchema.safeParse({
      name: new FormData(form).get('name'),
    });
    if (!parsed.success) {
      setNameError(t('projects.nameRequired'));
      return;
    }

    setNameError(undefined);
    create.mutate(
      { workspaceId: groupId, input: parsed.data },
      { onSuccess: () => form.reset() },
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <TextField
        name="name"
        label={t('projects.name')}
        autoComplete="off"
        error={nameError}
      />
      {create.isError ? (
        <FormAlert>{t(`errors.${workspaceErrorKey(create.error)}`)}</FormAlert>
      ) : null}
      <Button type="submit" fullWidth disabled={create.isPending}>
        {create.isPending ? t('projects.adding') : t('projects.add')}
      </Button>
    </form>
  );
}
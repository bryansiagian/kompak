'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createBoardSchema, updateBoardSchema } from '@kompak/shared';
import type { Board, WorkspaceRole } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { FormAlert } from '@/components/ui/form-alert';
import {
  CollectionSkeleton,
  EmptyState,
} from '@/components/ui/collection-state';
import { TextField } from '@/components/ui/text-field';
import Link from 'next/link';
import { workspaceErrorKey } from './errors';
import {
  useBoards,
  useCreateBoard,
  useDeleteBoard,
  useRenameBoard,
} from './hooks';
import { WorkspaceSearch } from './workspace-search';
import { canManage } from './permissions';

interface ProjectsSectionProps {
  groupId: string;
  role: WorkspaceRole;
}

export function ProjectsSection({ groupId, role }: ProjectsSectionProps) {
  const t = useTranslations('groups');
  const boards = useBoards(groupId);
  const manage = canManage(role);

  const [creating, setCreating] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  function close() {
    setCreating(false);
    trigger.current?.focus();
  }
  return (
    <section className="min-w-0 space-y-4">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {t('projects.title')}
      </h2>
      <WorkspaceSearch
        workspaceId={groupId}
        action={
          manage && (
            <button
              type="button"
              ref={trigger}
              aria-expanded={creating}
              onClick={() => (creating ? close() : setCreating(true))}
              className="control-focus min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              <span aria-hidden="true">＋ </span>
              {t('projects.new')}
            </button>
          )
        }
      />
      {manage && creating && <AddBoardForm groupId={groupId} close={close} />}
      <div>
        {boards.isPending ? (
          <CollectionSkeleton rows={2} />
        ) : boards.isError ? (
          <FormAlert>
            {t(`errors.${workspaceErrorKey(boards.error)}`)}
          </FormAlert>
        ) : boards.data.length === 0 ? (
          <EmptyState>
            {manage ? t('projects.emptyManager') : t('projects.emptyMember')}
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3">
            {boards.data.map((board) => (
              <BoardRow key={board.id} board={board} manage={manage} />
            ))}
          </ul>
        )}
      </div>
    </section>
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
    <li className="relative min-w-0 space-y-2 rounded-2xl border border-divider bg-surface p-4 transition-colors duration-150 hover:border-primary motion-reduce:transition-none">
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
          <Link
            className="control-focus flex min-h-24 flex-col items-start justify-between gap-4 rounded-lg pr-10"
            href={`/groups/${board.workspaceId}/projects/${board.id}`}
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-lg bg-brand-tint text-primary"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <path d="M9 4v16m6-16v16" />
              </svg>
            </span>
            <span className="wrap-anywhere text-lg font-bold">
              {board.name} <span aria-hidden="true">↗</span>
            </span>
          </Link>
          {manage ? (
            <details>
              <summary
                aria-label={t('projects.actions', { name: board.name })}
                className="control-focus absolute right-2 top-2 grid size-11 cursor-pointer list-none place-items-center rounded-lg text-xl hover:bg-brand-tint"
              >
                ⋯
              </summary>
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
            </details>
          ) : null}
        </>
      )}
      {error ? (
        <FormAlert>{t(`errors.${workspaceErrorKey(error)}`)}</FormAlert>
      ) : null}
    </li>
  );
}

function AddBoardForm({
  groupId,
  close,
}: {
  groupId: string;
  close: () => void;
}) {
  const t = useTranslations('groups');
  const common = useTranslations('common');
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
      { onSuccess: close },
    );
  }

  return (
    <form
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !create.isPending) close();
      }}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-3 rounded-xl border border-divider bg-brand-tint p-4"
    >
      <TextField
        name="name"
        label={t('projects.name')}
        autoFocus
        autoComplete="off"
        error={nameError}
      />
      {create.isError ? (
        <FormAlert>{t(`errors.${workspaceErrorKey(create.error)}`)}</FormAlert>
      ) : null}
      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? t('projects.adding') : t('projects.add')}
      </Button>
      <Button variant="secondary" disabled={create.isPending} onClick={close}>
        {common('cancel')}
      </Button>
    </form>
  );
}

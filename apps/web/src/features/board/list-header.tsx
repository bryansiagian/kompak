'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { updateListSchema } from '@kompak/shared';
import type { ListWithCards } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { FormAlert } from '@/components/ui/form-alert';
import { TextField } from '@/components/ui/text-field';
import { workspaceErrorKey } from '@/features/workspaces/errors';
import { useDeleteList, useRenameList } from './hooks';

type Mode = 'idle' | 'menu' | 'rename';

interface ListHeaderProps {
  boardId: string;
  list: ListWithCards;
  canManage: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMove: (direction: 'left' | 'right') => void;
}

export function ListHeader({
  boardId,
  list,
  canManage,
  canMoveLeft,
  canMoveRight,
  onMove,
}: ListHeaderProps) {
  const t = useTranslations('board');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('groups.errors');
  const rename = useRenameList(boardId);
  const remove = useDeleteList(boardId);
  const [mode, setMode] = useState<Mode>('idle');
  const [nameError, setNameError] = useState<string | undefined>();

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = updateListSchema.safeParse({
      name: new FormData(event.currentTarget).get('name'),
    });
    if (!parsed.success) {
      setNameError(t('list.nameRequired'));
      return;
    }

    setNameError(undefined);
    rename.mutate(
      { listId: list.id, input: parsed.data },
      { onSuccess: () => setMode('idle') },
    );
  }

  const error = rename.isError
    ? rename.error
    : remove.isError
      ? remove.error
      : null;

  if (mode === 'rename') {
    return (
      <form onSubmit={handleRename} noValidate className="space-y-2">
        <TextField
          name="name"
          label={t('list.name')}
          defaultValue={list.name}
          autoComplete="off"
          autoFocus
          error={nameError}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={rename.isPending}>
            {tCommon('save')}
          </Button>
          <Button variant="secondary" onClick={() => setMode('idle')}>
            {tCommon('cancel')}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 break-words font-bold">
          {list.name}{' '}
          <span className="text-sm font-normal text-stone-500">
            · {t('cardCount', { count: list.cards.length })}
          </span>
        </h2>
        {canManage ? (
          <Button
            variant="secondary"
            aria-label={t('list.menu', { name: list.name })}
            aria-expanded={mode === 'menu'}
            onClick={() => setMode(mode === 'menu' ? 'idle' : 'menu')}
          >
            ⋯
          </Button>
        ) : null}
      </div>

      {mode === 'menu' ? (
        <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-stone-200">
          <Button variant="secondary" fullWidth onClick={() => setMode('rename')}>
            {t('list.rename')}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              disabled={!canMoveLeft}
              onClick={() => onMove('left')}
            >
              ← {t('list.moveLeft')}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              disabled={!canMoveRight}
              onClick={() => onMove('right')}
            >
              {t('list.moveRight')} →
            </Button>
          </div>
          <ConfirmAction
            label={t('list.delete')}
            prompt={t('list.deletePrompt')}
            confirmLabel={t('list.deleteConfirm')}
            disabled={remove.isPending}
            onConfirm={() => remove.mutate(list.id)}
          />
        </div>
      ) : null}

      {error ? <FormAlert>{tErrors(workspaceErrorKey(error))}</FormAlert> : null}
    </div>
  );
}
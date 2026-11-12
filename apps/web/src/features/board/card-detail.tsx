'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { updateCardSchema } from '@kompak/shared';
import type { BoardDetail, Card, Member, WorkspaceRole } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { FormAlert } from '@/components/ui/form-alert';
import { SelectField } from '@/components/ui/select-field';
import { TextArea } from '@/components/ui/text-area';
import { TextField } from '@/components/ui/text-field';
import { workspaceErrorKey } from '@/features/workspaces/errors';
import { canDeleteCard } from '@/features/workspaces/permissions';
import type { Placement } from './board-cache';
import { CardMoveControls } from './card-move-controls';
import { useDeleteCard, useUpdateCard } from './hooks';

interface CardDetailProps {
  boardId: string;
  board: BoardDetail;
  card: Card;
  members: Member[];
  viewer: { userId: string; role: WorkspaceRole };
  onMove: (placement: Placement) => void;
  onClose: () => void;
}

export function CardDetail({
  boardId,
  board,
  card,
  members,
  viewer,
  onMove,
  onClose,
}: CardDetailProps) {
  const t = useTranslations('board.detail');
  const tErrors = useTranslations('groups.errors');
  const headingId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const update = useUpdateCard(boardId);
  const remove = useDeleteCard(boardId);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [invalid, setInvalid] = useState(false);
  const [dueDate, setDueDate] = useState(card.dueDate ?? '');

  // <dialog> native memberi focus trap, tombol Esc, dan latar belakang gratis.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  function close() {
    dialogRef.current?.close();
  }

  const assigneeOptions = [
    { value: '', label: t('noAssignee') },
    ...members.map((member) => ({ value: member.userId, label: member.name })),
  ];
  if (card.assigneeId && !members.some((m) => m.userId === card.assigneeId)) {
    assigneeOptions.push({ value: card.assigneeId, label: t('formerMember') });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const assignee = form.get('assignee');
    const assigneeId =
      typeof assignee === 'string' && assignee.length > 0 ? assignee : null;

    const parsed = updateCardSchema.safeParse({
      title: form.get('title'),
      description: form.get('description'),
      dueDate: dueDate.length > 0 ? dueDate : null,
      // Hanya dikirim bila berubah: mantan anggota ditolak API sebagai penanggung jawab baru.
      ...(assigneeId !== card.assigneeId ? { assigneeId } : {}),
    });
    if (!parsed.success) {
      const failed = new Set(
        parsed.error.issues.map((issue) => String(issue.path[0])),
      );
      setTitleError(failed.has('title') ? t('titleRequired') : undefined);
      setInvalid(!failed.has('title') || failed.size > 1);
      return;
    }

    setTitleError(undefined);
    setInvalid(false);
    update.mutate({ cardId: card.id, input: parsed.data }, { onSuccess: close });
  }

  const error = update.isError
    ? update.error
    : remove.isError
      ? remove.error
      : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={headingId}
      className="fixed inset-x-0 bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-white p-0 text-stone-900 shadow-xl backdrop:bg-black/40 sm:inset-0 sm:m-auto sm:h-fit sm:max-w-md sm:rounded-2xl"
    >
      <div className="space-y-5 p-5">
        <header className="flex items-center justify-between gap-3">
          <h2 id={headingId} className="text-lg font-bold">
            {t('title')}
          </h2>
          <Button variant="secondary" onClick={close}>
            {t('close')}
          </Button>
        </header>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <TextField
            name="title"
            label={t('taskTitle')}
            defaultValue={card.title}
            autoComplete="off"
            error={titleError}
          />
          <TextArea
            name="description"
            label={t('description')}
            defaultValue={card.description}
          />
          <SelectField
            name="assignee"
            label={t('assignee')}
            defaultValue={card.assigneeId ?? ''}
            options={assigneeOptions}
          />
          <div className="space-y-2">
            <TextField
              name="dueDate"
              type="date"
              label={t('dueDate')}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
            {dueDate.length > 0 ? (
              <Button variant="secondary" onClick={() => setDueDate('')}>
                {t('clearDue')}
              </Button>
            ) : null}
          </div>
          {invalid ? <FormAlert>{t('invalid')}</FormAlert> : null}
          {error ? (
            <FormAlert>{tErrors(workspaceErrorKey(error))}</FormAlert>
          ) : null}
          <Button type="submit" fullWidth disabled={update.isPending}>
            {update.isPending ? t('saving') : t('save')}
          </Button>
        </form>

        <CardMoveControls board={board} card={card} onMove={onMove} />

        {canDeleteCard(viewer, card) ? (
          <ConfirmAction
            label={t('delete')}
            prompt={t('deletePrompt')}
            confirmLabel={t('deleteConfirm')}
            disabled={remove.isPending}
            onConfirm={() => remove.mutate(card.id)}
          />
        ) : null}
      </div>
    </dialog>
  );
}
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
import { CardCollaboration } from './card-collaboration';
import { CardAiAssistant } from './card-ai-assistant';
import { CardLabels } from './card-labels';
import { CardMoveControls } from './card-move-controls';
import { useDeleteCard, useUpdateCard } from './hooks';

interface CardDetailProps {
  boardId: string;
  board: BoardDetail;
  card: Card;
  members: Member[];
  viewer: { userId: string; role: WorkspaceRole };
  movePending: boolean;
  moveFailed: boolean;
  onMove: (placement: Placement) => void;
  onClose: () => void;
}

export function CardDetail({
  boardId,
  board,
  card,
  members,
  viewer,
  movePending,
  moveFailed,
  onMove,
  onClose,
}: CardDetailProps) {
  const t = useTranslations('board.detail');
  const design = useTranslations('redesign');
  const tErrors = useTranslations('groups.errors');
  const headingId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
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
      closeRef.current?.focus();
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
    update.mutate(
      { cardId: card.id, input: parsed.data },
      { onSuccess: close },
    );
  }

  const error = update.isError ? update.error : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={headingId}
      className="fixed inset-x-0 bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto overscroll-contain scroll-pt-20 rounded-t-3xl bg-surface p-0 text-foreground shadow-xl backdrop:bg-brand-ink/55 sm:inset-0 sm:m-auto sm:h-fit sm:w-[calc(100%-2rem)] sm:max-w-5xl sm:rounded-3xl"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-divider bg-surface px-4 py-3 text-foreground sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-primary">
            {t('title')}
          </p>
          <h2
            id={headingId}
            className="wrap-anywhere text-xl font-bold leading-tight sm:text-2xl"
          >
            {card.title}
          </h2>
        </div>
        <Button ref={closeRef} variant="secondary" onClick={close}>
          {t('close')}
        </Button>
      </header>

      <div className="grid items-start gap-4 p-4 sm:p-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-divider bg-brand-tint p-4">
            <CardMoveControls
              board={board}
              card={card}
              onMove={onMove}
              disabled={movePending}
            />
            {movePending ? (
              <p role="status" className="mt-3 text-sm">
                {design('moving')}
              </p>
            ) : null}
            {moveFailed ? (
              <div className="mt-3">
                <FormAlert>{design('moveFailed')}</FormAlert>
              </div>
            ) : null}
          </div>
          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-4 border-t border-divider pt-4"
          >
            <h3 className="font-bold">{design('taskDetails')}</h3>
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

          {canDeleteCard(viewer, card) ? (
            <details className="rounded-xl border border-divider">
              <summary className="control-focus min-h-11 cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold">
                {design('taskDelete')}
              </summary>
              <div className="space-y-3 px-4 pb-4">
                {remove.isError ? (
                  <FormAlert>
                    {tErrors(workspaceErrorKey(remove.error))}
                  </FormAlert>
                ) : null}
                <ConfirmAction
                  label={t('delete')}
                  prompt={t('deletePrompt')}
                  confirmLabel={t('deleteConfirm')}
                  disabled={remove.isPending}
                  onConfirm={() => remove.mutate(card.id)}
                />
              </div>
            </details>
          ) : null}
        </div>
        <div className="min-w-0 space-y-4">
          <section className="space-y-4 rounded-xl bg-board-lane p-4">
            <h3 className="font-bold">{design('discussion')}</h3>
            <CardCollaboration cardId={card.id} viewer={viewer} />
          </section>
          <details className="rounded-2xl border border-divider">
            <summary className="control-focus min-h-11 cursor-pointer rounded-2xl px-4 py-3 font-semibold">
              {design('taskTools')}
            </summary>
            <div className="space-y-4 px-4 pb-4">
              <CardLabels
                key={`${card.id}:${card.labelIds.join(',')}`}
                board={board}
                card={card}
              />
              <CardAiAssistant key={card.id} card={card} />
            </div>
          </details>
        </div>
      </div>
    </dialog>
  );
}

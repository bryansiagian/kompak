'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createCardSchema } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { FormAlert } from '@/components/ui/form-alert';
import { TextField } from '@/components/ui/text-field';
import { workspaceErrorKey } from '@/features/workspaces/errors';
import { useCreateCard } from './hooks';

interface QuickAddCardProps {
  boardId: string;
  listId: string;
  destinations?: { id: string; name: string }[];
}

export function QuickAddCard({
  boardId,
  listId,
  destinations,
}: QuickAddCardProps) {
  const t = useTranslations('board.quickAdd');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('groups.errors');
  const create = useCreateCard(boardId);
  const [open, setOpen] = useState(false);
  const [titleError, setTitleError] = useState<string | undefined>();

  const trigger = useRef<HTMLButtonElement>(null);
  const [choice, setChoice] = useState(listId);
  const destination = destinations?.some((list) => list.id === choice)
    ? choice
    : listId;
  function close() {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = createCardSchema.safeParse({
      title: new FormData(form).get('title'),
    });
    if (!parsed.success) {
      setTitleError(t('required'));
      return;
    }

    setTitleError(undefined);
    // Formulir tetap terbuka agar beberapa tugas bisa diketik berturut-turut.
    create.mutate(
      { listId: destination, input: parsed.data },
      {
        onSuccess: () => {
          form.reset();
          if (destinations) close();
        },
      },
    );
  }

  if (!open) {
    return (
      <button
        ref={trigger}
        type="button"
        className={
          destinations
            ? 'control-focus min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary-hover'
            : 'control-focus min-h-11 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-brand-tint'
        }
        disabled={!listId}
        onClick={() => setOpen(true)}
      >
        + {t(destinations ? 'new' : 'open')}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !create.isPending) close();
      }}
      noValidate
      className="space-y-2 rounded-xl border border-divider bg-surface p-3"
    >
      {destinations && (
        <SelectField
          label={t('destination')}
          value={destination}
          onChange={(event) => setChoice(event.currentTarget.value)}
          options={destinations.map((list) => ({
            value: list.id,
            label: list.name,
          }))}
        />
      )}
      <TextField
        name="title"
        label={t('label')}
        autoComplete="off"
        autoFocus
        error={titleError}
      />
      {create.isError ? (
        <FormAlert>{tErrors(workspaceErrorKey(create.error))}</FormAlert>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? t('adding') : t('add')}
        </Button>
        <Button variant="secondary" disabled={create.isPending} onClick={close}>
          {tCommon('cancel')}
        </Button>
      </div>
    </form>
  );
}

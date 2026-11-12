'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { createCardSchema } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { TextField } from '@/components/ui/text-field';
import { workspaceErrorKey } from '@/features/workspaces/errors';
import { useCreateCard } from './hooks';

interface QuickAddCardProps {
  boardId: string;
  listId: string;
}

export function QuickAddCard({ boardId, listId }: QuickAddCardProps) {
  const t = useTranslations('board.quickAdd');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('groups.errors');
  const create = useCreateCard(boardId);
  const [open, setOpen] = useState(false);
  const [titleError, setTitleError] = useState<string | undefined>();

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
    create.mutate({ listId, input: parsed.data }, { onSuccess: () => form.reset() });
  }

  if (!open) {
    return (
      <Button variant="secondary" fullWidth onClick={() => setOpen(true)}>
        + {t('open')}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-2">
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
        <Button variant="secondary" onClick={() => setOpen(false)}>
          {tCommon('cancel')}
        </Button>
      </div>
    </form>
  );
}
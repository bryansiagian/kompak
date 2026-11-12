'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { createListSchema } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { TextField } from '@/components/ui/text-field';
import { workspaceErrorKey } from '@/features/workspaces/errors';
import { useCreateList } from './hooks';

export function AddListForm({ boardId }: { boardId: string }) {
  const t = useTranslations('board.list');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('groups.errors');
  const create = useCreateList(boardId);
  const [open, setOpen] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = createListSchema.safeParse({
      name: new FormData(form).get('name'),
    });
    if (!parsed.success) {
      setNameError(t('nameRequired'));
      return;
    }

    setNameError(undefined);
    create.mutate(parsed.data, {
      onSuccess: () => {
        form.reset();
        setOpen(false);
      },
    });
  }

  return (
    <div className="w-[82vw] max-w-72 shrink-0 rounded-2xl bg-stone-100/60 p-3 sm:w-72">
      {open ? (
        <form onSubmit={handleSubmit} noValidate className="space-y-2">
          <TextField
            name="name"
            label={t('name')}
            autoComplete="off"
            autoFocus
            error={nameError}
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
      ) : (
        <Button variant="secondary" fullWidth onClick={() => setOpen(true)}>
          + {t('addOpen')}
        </Button>
      )}
    </div>
  );
}
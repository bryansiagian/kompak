'use client';
import { useId, useState } from 'react';
import {
  LABEL_COLORS,
  createLabelSchema,
  updateLabelSchema,
} from '@kompak/shared';
import type { BoardDetail, LabelColor } from '@kompak/shared';
import { useCreateLabel, useDeleteLabel, useUpdateLabel } from './label-hooks';
import { LABEL_STYLE } from './label-style';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { TextField } from '@/components/ui/text-field';
import { SelectField } from '@/components/ui/select-field';
export function LabelManager({ board }: { board: BoardDetail }) {
  const t = useTranslations('labels');
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<LabelColor>('emerald');
  const [editing, setEditing] = useState<string | null>(null);
  const create = useCreateLabel(board.id),
    update = useUpdateLabel(board.id),
    remove = useDeleteLabel(board.id);
  const error = create.error ?? update.error ?? remove.error;
  function save() {
    if (editing) {
      const parsed = updateLabelSchema.safeParse({ name, color });
      if (parsed.success)
        update.mutate(
          { id: editing, input: parsed.data },
          { onSuccess: reset },
        );
    } else {
      const parsed = createLabelSchema.safeParse({ name, color });
      if (parsed.success) create.mutate(parsed.data, { onSuccess: reset });
    }
  }
  function reset() {
    setName('');
    setColor('emerald');
    setEditing(null);
  }
  return (
    <section className="mt-3 rounded-xl border border-divider bg-surface p-3">
      <Button
        variant="secondary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        {t('manage')}
      </Button>
      <div id={panelId} hidden={!open} className="mt-3 space-y-3">
        <ul className="space-y-2">
          {board.labels.map((label) => (
            <li
              key={label.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-canvas p-2"
            >
              <span
                className={`wrap-anywhere rounded-full px-2 py-1 text-xs ${LABEL_STYLE[label.color]}`}
              >
                {label.name}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(label.id);
                    setName(label.name);
                    setColor(label.color);
                  }}
                >
                  {t('edit')}
                </Button>
                <ConfirmAction
                  label={t('delete')}
                  prompt={t('deleteConfirm', { name: label.name })}
                  confirmLabel={t('delete')}
                  disabled={remove.isPending}
                  onConfirm={() => remove.mutate(label.id)}
                />
              </div>
            </li>
          ))}
        </ul>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label={t('name')}
              maxLength={30}
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
            <SelectField
              label={t('color')}
              value={color}
              onChange={(event) => {
                const selected = LABEL_COLORS.find(
                  (option) => option === event.currentTarget.value,
                );
                if (selected) setColor(selected);
              }}
              options={LABEL_COLORS.map((value) => ({
                value,
                label: t(`colors.${value}`),
              }))}
            />
          </div>
          {error ? <FormAlert>{t('error')}</FormAlert> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={!name.trim() || create.isPending || update.isPending}
            >
              {editing ? t('save') : t('create')}
            </Button>
            {editing ? (
              <Button variant="secondary" onClick={reset}>
                {t('cancel')}
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}

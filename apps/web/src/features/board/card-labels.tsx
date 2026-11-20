'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MAX_LABELS_PER_CARD } from '@kompak/shared';
import type { BoardDetail, Card } from '@kompak/shared';
import { useSetCardLabels } from './label-hooks';

interface CardLabelsProps {
  board: BoardDetail;
  card: Card;
}

export function CardLabels({ board, card }: CardLabelsProps) {
  const t = useTranslations('labels');
  const [selected, setSelected] = useState<string[]>(() => [...card.labelIds]);
  const mutation = useSetCardLabels(board.id);

  function toggle(labelId: string) {
    setSelected((current) => {
      if (current.includes(labelId)) {
        return current.filter((id) => id !== labelId);
      }

      if (current.length >= MAX_LABELS_PER_CARD) {
        return current;
      }

      return [...current, labelId];
    });
  }

  function applyLabels() {
    mutation.mutate({
      cardId: card.id,
      input: { labelIds: selected },
    });
  }

  return (
    <section className="space-y-2">
      <h3 className="font-semibold">{t('taskLabels')}</h3>

      <div className="max-h-48 space-y-1 overflow-y-auto overscroll-contain">
        {board.labels.map((label) => (
          <label
            key={label.id}
            className="flex min-h-11 items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selected.includes(label.id)}
              onChange={() => toggle(label.id)}
            />
            <span>{label.name}</span>
          </label>
        ))}
      </div>

      <p className="text-xs text-stone-600">
        {t('selected', {
          count: selected.length,
          max: MAX_LABELS_PER_CARD,
        })}
      </p>

      {mutation.isError ? (
        <p role="alert" className="text-sm text-rose-700">
          {t('error')}
        </p>
      ) : null}

      <Button
        variant="secondary"
        disabled={mutation.isPending}
        onClick={applyLabels}
      >
        {t('apply')}
      </Button>
    </section>
  );
}

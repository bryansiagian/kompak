'use client';

import { useTranslations } from 'next-intl';
import type { BoardDetail, Card } from '@kompak/shared';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { stepPlacement } from './board-cache';
import type { Placement } from './board-cache';

interface CardMoveControlsProps {
  board: BoardDetail;
  card: Card;
  onMove: (placement: Placement) => void;
}

// Alternatif tanpa drag: ramah layar sentuh dan pembaca layar.
export function CardMoveControls({ board, card, onMove }: CardMoveControlsProps) {
  const t = useTranslations('board.move');
  const up = stepPlacement(board, card.id, 'up');
  const down = stepPlacement(board, card.id, 'down');

  return (
    <section aria-labelledby="move-heading" className="space-y-3">
      <h3 id="move-heading" className="font-semibold">
        {t('title')}
      </h3>
      <SelectField
        label={t('toList')}
        value={card.listId}
        onChange={(event) => {
          const listId = event.target.value;
          if (listId !== card.listId) {
            onMove({ listId, beforeCardId: null });
          }
        }}
        options={board.lists.map((list) => ({ value: list.id, label: list.name }))}
      />
      <div className="flex gap-2">
        <Button
          variant="secondary"
          fullWidth
          disabled={!up}
          onClick={() => {
            if (up) onMove(up);
          }}
        >
          ↑ {t('up')}
        </Button>
        <Button
          variant="secondary"
          fullWidth
          disabled={!down}
          onClick={() => {
            if (down) onMove(down);
          }}
        >
          ↓ {t('down')}
        </Button>
      </div>
    </section>
  );
}
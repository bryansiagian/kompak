'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import type { ListWithCards, Label } from '@kompak/shared';
import { CardView, SortableCard } from './card-item';
import { listDroppableId } from './dnd-helpers';
import { ListHeader } from './list-header';
import { QuickAddCard } from './quick-add-card';

interface ListColumnProps {
  boardId: string;
  list: ListWithCards;
  canManage: boolean;
  dragDisabled: boolean;
  labels: Label[];
  canMoveLeft: boolean;
  canMoveRight: boolean;
  assigneeNameOf: (assigneeId: string | null) => string | undefined;
  onOpenCard: (cardId: string) => void;
  onMoveList: (direction: 'left' | 'right') => void;
}

export function ListColumn({
  boardId,
  list,
  canManage,
  dragDisabled,
  labels,
  canMoveLeft,
  canMoveRight,
  assigneeNameOf,
  onOpenCard,
  onMoveList,
}: ListColumnProps) {
  const t = useTranslations('board');
  const design = useTranslations('redesign');
  // Seluruh badan kolom menjadi area lepas, sehingga kolom kosong pun bisa menerima tugas.
  const { setNodeRef, isOver } = useDroppable({
    id: listDroppableId(list.id),
  });

  return (
    <section
      id={`lane-${list.id}`}
      tabIndex={-1}
      aria-label={list.name}
      className="control-focus w-[calc(100vw-4.5rem)] max-w-80 shrink-0 rounded-lg border-t-2 border-brand-ink bg-board-lane p-3 sm:w-76"
    >
      <ListHeader
        boardId={boardId}
        list={list}
        canManage={canManage}
        canMoveLeft={canMoveLeft}
        canMoveRight={canMoveRight}
        onMove={onMoveList}
      />

      <div className="mt-3">
        <QuickAddCard boardId={boardId} listId={list.id} />
      </div>
      <div
        ref={setNodeRef}
        className={`mt-3 min-h-16 space-y-2 rounded-xl ${
          isOver ? 'bg-brand-tint ring-2 ring-inset ring-primary' : ''
        }`}
      >
        <SortableContext
          items={list.cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {list.cards.map((card) =>
            dragDisabled ? (
              <CardView
                key={card.id}
                card={card}
                labels={labels}
                assigneeName={assigneeNameOf(card.assigneeId)}
                onOpen={() => onOpenCard(card.id)}
              />
            ) : (
              <SortableCard
                key={card.id}
                card={card}
                labels={labels}
                assigneeName={assigneeNameOf(card.assigneeId)}
                onOpen={() => onOpenCard(card.id)}
              />
            ),
          )}
        </SortableContext>
        {list.cards.length === 0 ? (
          <p className="rounded-xl border border-dashed border-control-border/50 px-3 py-4 text-sm text-muted-foreground">
            {dragDisabled ? design('filteredEmpty') : t('emptyList')}
          </p>
        ) : null}
      </div>
    </section>
  );
}

'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import type { ListWithCards } from '@kompak/shared';
import { SortableCard } from './card-item';
import { listDroppableId } from './dnd-helpers';
import { ListHeader } from './list-header';
import { QuickAddCard } from './quick-add-card';

interface ListColumnProps {
  boardId: string;
  list: ListWithCards;
  canManage: boolean;
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
  canMoveLeft,
  canMoveRight,
  assigneeNameOf,
  onOpenCard,
  onMoveList,
}: ListColumnProps) {
  const t = useTranslations('board');
  // Seluruh badan kolom menjadi area lepas, sehingga kolom kosong pun bisa menerima tugas.
  const { setNodeRef, isOver } = useDroppable({
    id: listDroppableId(list.id),
  });

  return (
    <section
      aria-label={list.name}
      className="w-[82vw] max-w-72 shrink-0 rounded-2xl bg-stone-100 p-3 sm:w-72"
    >
      <ListHeader
        boardId={boardId}
        list={list}
        canManage={canManage}
        canMoveLeft={canMoveLeft}
        canMoveRight={canMoveRight}
        onMove={onMoveList}
      />

      <div
        ref={setNodeRef}
        className={`mt-3 min-h-16 space-y-2 rounded-xl ${
          isOver ? 'bg-emerald-50' : ''
        }`}
      >
        <SortableContext
          items={list.cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {list.cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              assigneeName={assigneeNameOf(card.assigneeId)}
              onOpen={() => onOpenCard(card.id)}
            />
          ))}
        </SortableContext>
        {list.cards.length === 0 ? (
          <p className="px-1 py-2 text-sm text-stone-500">{t('emptyList')}</p>
        ) : null}
      </div>

      <div className="mt-3">
        <QuickAddCard boardId={boardId} listId={list.id} />
      </div>
    </section>
  );
}
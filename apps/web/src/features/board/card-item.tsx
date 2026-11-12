'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { Card } from '@kompak/shared';
import { dueState, formatDueDate, todayIso } from './due-date';
import type { DueState } from './due-date';

const DUE_CLASSES: Record<DueState, string> = {
  overdue: 'bg-red-100 text-red-800',
  today: 'bg-amber-100 text-amber-800',
  upcoming: 'bg-stone-100 text-stone-700',
};

interface CardViewProps {
  card: Card;
  assigneeName?: string;
  onOpen?: () => void;
  handle?: ReactNode;
  overlay?: boolean;
}

// Tampilan tugas tanpa logika drag, dipakai juga untuk lapisan yang ikut bergerak.
export function CardView({
  card,
  assigneeName,
  onOpen,
  handle,
  overlay = false,
}: CardViewProps) {
  const t = useTranslations('board.card');
  const due = card.dueDate
    ? {
        state: dueState(card.dueDate, todayIso()),
        label: formatDueDate(card.dueDate),
      }
    : null;

  return (
    <div
      className={`flex items-stretch rounded-xl bg-white ring-1 ring-stone-200 ${
        overlay ? 'shadow-lg' : 'shadow-sm'
      }`}
    >
      {handle}
      <button
        type="button"
        onClick={onOpen}
        className="min-h-11 min-w-0 flex-1 rounded-xl p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      >
        <span className="block break-words font-medium">{card.title}</span>
        {due || assigneeName ? (
          <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            {due ? (
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${DUE_CLASSES[due.state]}`}
              >
                {t(`due.${due.state}`, { date: due.label })}
              </span>
            ) : null}
            {assigneeName ? (
              <span className="text-stone-600">{assigneeName}</span>
            ) : null}
          </span>
        ) : null}
      </button>
    </div>
  );
}

function GripIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-5"
      fill="currentColor"
    >
      <circle cx="7" cy="5" r="1.5" />
      <circle cx="13" cy="5" r="1.5" />
      <circle cx="7" cy="10" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="7" cy="15" r="1.5" />
      <circle cx="13" cy="15" r="1.5" />
    </svg>
  );
}

interface SortableCardProps {
  card: Card;
  assigneeName?: string;
  onOpen: () => void;
}

export function SortableCard({ card, assigneeName, onOpen }: SortableCardProps) {
  const t = useTranslations('board.card');
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-40' : undefined}
    >
      <CardView
        card={card}
        assigneeName={assigneeName}
        onOpen={onOpen}
        // touch-none hanya di pegangan: menggulir halaman di HP tetap normal.
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label={t('drag', { title: card.title })}
            className="flex min-h-11 w-9 shrink-0 touch-none items-center justify-center rounded-l-xl text-stone-400 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            {...attributes}
            {...listeners}
          >
            <GripIcon />
          </button>
        }
      />
    </div>
  );
}
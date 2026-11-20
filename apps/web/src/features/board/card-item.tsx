'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { Card, Label } from '@kompak/shared';
import { LABEL_STYLE } from './label-style';
import { dueState, formatDueDate, todayIso } from './due-date';
import type { DueState } from './due-date';

const DUE_CLASSES: Record<DueState, string> = {
  overdue: 'bg-red-100 text-red-800',
  today: 'bg-amber-100 text-amber-800',
  upcoming: 'bg-stone-100 text-stone-700',
};

interface CardViewProps {
  card: Card;
  labels?: Label[];
  assigneeName?: string;
  onOpen?: () => void;
  handle?: ReactNode;
  overlay?: boolean;
}

// Tampilan tugas tanpa logika drag, dipakai juga untuk lapisan yang ikut bergerak.
export function CardView({
  card,
  labels = [],
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
      className={`task-slip flex items-stretch rounded-lg border border-divider bg-surface ${
        overlay ? 'drag-preview' : 'shadow-panel'
      }`}
    >
      {handle}
      <button
        type="button"
        onClick={onOpen}
        className="min-h-11 min-w-0 flex-1 rounded-xl p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <span className="block wrap-anywhere font-semibold">{card.title}</span>
        {card.labelIds.length > 0 ? (
          <span className="mt-1.5 flex flex-wrap gap-1">
            {labels
              .filter((label) => card.labelIds.includes(label.id))
              .map((label) => (
                <span
                  key={label.id}
                  className={`rounded-full px-2 py-0.5 text-xs ${LABEL_STYLE[label.color]}`}
                >
                  {label.name}
                </span>
              ))}
          </span>
        ) : null}
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
  labels?: Label[];
  assigneeName?: string;
  onOpen: () => void;
}

export function SortableCard({
  card,
  labels,
  assigneeName,
  onOpen,
}: SortableCardProps) {
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
        labels={labels}
        assigneeName={assigneeName}
        onOpen={onOpen}
        // touch-none hanya di pegangan: menggulir halaman di HP tetap normal.
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label={t('drag', { title: card.title })}
            className="flex min-h-11 w-11 shrink-0 touch-none items-center justify-center rounded-l-xl text-muted-foreground hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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

'use client';

import type { BoardDetail, Member } from '@kompak/shared';
import { useTranslations } from 'next-intl';
import { SelectField } from '@/components/ui/select-field';
import type { BoardFilters } from './board-filters';

const dueOptions = ['all', 'overdue', 'today', 'week'] as const;

export function BoardFilterControls({
  board,
  members,
  filters,
  onChange,
}: {
  board: BoardDetail;
  members: Member[];
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
}) {
  const t = useTranslations('filters');

  return (
    <section
      aria-label={t('title')}
      className="space-y-3 rounded-xl bg-surface p-3"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField
          label={t('assignee')}
          value={filters.assigneeId}
          onChange={(event) =>
            onChange({ ...filters, assigneeId: event.currentTarget.value })
          }
          options={[
            { value: '', label: t('all') },
            ...members.map((member) => ({
              value: member.userId,
              label: member.name,
            })),
          ]}
        />
        <SelectField
          label={t('label')}
          value={filters.labelId}
          onChange={(event) =>
            onChange({ ...filters, labelId: event.currentTarget.value })
          }
          options={[
            { value: '', label: t('all') },
            ...board.labels.map((label) => ({
              value: label.id,
              label: label.name,
            })),
          ]}
        />
        <SelectField
          label={t('due')}
          value={filters.due}
          onChange={(event) => {
            const value = event.currentTarget.value;
            const due = dueOptions.find((option) => option === value);
            if (due) onChange({ ...filters, due });
          }}
          options={dueOptions.map((value) => ({ value, label: t(value) }))}
        />
      </div>
    </section>
  );
}

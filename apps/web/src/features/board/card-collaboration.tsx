'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { WorkspaceRole } from '@kompak/shared';
import { FormAlert } from '@/components/ui/form-alert';
import { workspaceErrorKey } from '@/features/workspaces/errors';
import { useCardActivity } from './activity-hooks';
import { ActivityList } from './activity-list';
import { CommentsSection } from './comments-section';

interface CardCollaborationProps {
  cardId: string;
  viewer: { userId: string; role: WorkspaceRole };
}

// Komentar dan riwayat satu tugas, di dalam lembar detail tugas.
export function CardCollaboration({ cardId, viewer }: CardCollaborationProps) {
  return (
    <>
      <CommentsSection cardId={cardId} viewer={viewer} />
      <CardActivitySection cardId={cardId} />
    </>
  );
}

function CardActivitySection({ cardId }: { cardId: string }) {
  const t = useTranslations('board.activity');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('groups.errors');
  const headingId = useId();
  const activity = useCardActivity(cardId);

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h3 id={headingId} className="font-semibold">
        {t('cardTitle')}
      </h3>
      {activity.isPending ? (
        <p role="status" className="text-sm text-stone-600">
          {tCommon('loading')}
        </p>
      ) : activity.isError ? (
        <FormAlert>{tErrors(workspaceErrorKey(activity.error))}</FormAlert>
      ) : activity.data.length === 0 ? (
        <p className="text-sm text-stone-600">{t('empty')}</p>
      ) : (
        <ActivityList activities={activity.data} />
      )}
    </section>
  );
}
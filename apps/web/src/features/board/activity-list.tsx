'use client';

import { useTranslations } from 'next-intl';
import type { Activity } from '@kompak/shared';
import { describeActivity } from './activity-text';
import { formatRelativeTime } from './relative-time';

export function ActivityList({ activities }: { activities: Activity[] }) {
  const t = useTranslations('board.activity');

  return (
    <ol className="space-y-3">
      {activities.map((activity) => {
        const { key, values } = describeActivity(activity);
        return (
          <li key={activity.id} className="text-sm">
            <p className="break-words text-stone-800">{t(`items.${key}`, values)}</p>
            <time dateTime={activity.createdAt} className="text-xs text-stone-500">
              {formatRelativeTime(activity.createdAt)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
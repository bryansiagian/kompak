'use client';

import { useTranslations } from 'next-intl';
import type { PresenceUser } from '@kompak/shared';
import { colorIndexOf, initialsOf, visibleAvatars } from './presence';

const MAX_AVATARS = 4;

// Nama kelas ditulis utuh agar terdeteksi Tailwind.
const AVATAR_COLORS = [
  'bg-brand-tint text-brand-ink',
  'bg-amber-200 text-amber-900',
  'bg-sky-200 text-sky-900',
  'bg-rose-200 text-rose-900',
  'bg-violet-200 text-violet-900',
  'bg-teal-200 text-teal-900',
] as const;

// Penonton lain di papan ini (diri sendiri sudah dikecualikan oleh pemanggil).
export function PresenceBar({ users }: { users: PresenceUser[] }) {
  const t = useTranslations('board.realtime');
  if (users.length === 0) {
    return null;
  }

  const { shown, hidden } = visibleAvatars(users, MAX_AVATARS);

  return (
    <ul aria-label={t('viewing')} className="flex shrink-0 items-center -space-x-2">
      {shown.map((user) => (
        <li
          key={user.userId}
          title={user.name}
          className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ring-2 ring-stone-50 ${
            AVATAR_COLORS[colorIndexOf(user.userId, AVATAR_COLORS.length)]
          }`}
        >
          <span aria-hidden="true">{initialsOf(user.name)}</span>
          <span className="sr-only">{user.name}</span>
        </li>
      ))}
      {hidden > 0 ? (
        <li className="flex size-8 items-center justify-center rounded-full bg-stone-200 text-xs font-bold text-stone-700 ring-2 ring-stone-50">
          {t('more', { count: hidden })}
        </li>
      ) : null}
    </ul>
  );
}
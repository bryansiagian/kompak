'use client';

import { useTranslations } from 'next-intl';
import type { WorkspaceRole } from '@kompak/shared';

const STYLES: Record<WorkspaceRole, string> = {
  OWNER: 'bg-emerald-100 text-emerald-800',
  ADMIN: 'bg-amber-100 text-amber-800',
  MEMBER: 'bg-stone-100 text-stone-700',
};

export function RoleBadge({ role }: { role: WorkspaceRole }) {
  const t = useTranslations('groups.roles');

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[role]}`}
    >
      {t(role)}
    </span>
  );
}
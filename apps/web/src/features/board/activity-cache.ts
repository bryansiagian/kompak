import type { InfiniteData } from '@tanstack/react-query';
import type { Activity } from '@kompak/shared';

export type ActivityPages = InfiniteData<Activity[], string | undefined>;

function newestFirst(a: Activity, b: Activity): number {
  return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
}

// Daftar datar (riwayat satu tugas): catatan baru di depan, tanpa duplikat.
export function upsertActivity(
  list: Activity[],
  activity: Activity,
  limit = Number.POSITIVE_INFINITY,
): Activity[] {
  if (list.some((item) => item.id === activity.id)) {
    return list;
  }
  return [activity, ...list].sort(newestFirst).slice(0, limit);
}

// Halaman-halaman riwayat proyek: catatan baru masuk ke halaman pertama.
export function prependActivity(
  data: ActivityPages,
  activity: Activity,
): ActivityPages {
  if (data.pages.some((page) => page.some((item) => item.id === activity.id))) {
    return data;
  }
  if (data.pages.length === 0) {
    return { pages: [[activity]], pageParams: [undefined] };
  }
  const [first, ...rest] = data.pages;
  return { ...data, pages: [[activity, ...first].sort(newestFirst), ...rest] };
}

// Hanya membaca `pages`, jadi tipe parameter halaman (pageParams) tidak dipersoalkan.
export function flattenActivityPages(data: {
  pages: readonly (readonly Activity[])[];
}): Activity[] {
  const seen = new Set<string>();
  const result: Activity[] = [];
  for (const page of data.pages) {
    for (const activity of page) {
      if (!seen.has(activity.id)) {
        seen.add(activity.id);
        result.push(activity);
      }
    }
  }
  return result;
}
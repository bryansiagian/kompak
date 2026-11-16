const MINUTE = 60;
const HOUR = 3600;
const DAY = 86_400;
const WEEK = 7 * DAY;

// Teks waktu berasal dari data lokal bahasa Indonesia milik Intl, bukan ditulis tangan.
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const target = new Date(iso);
  const diffSeconds = Math.round((target.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSeconds);
  const relative = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' });

  if (abs < 45) return relative.format(0, 'second');
  if (abs < HOUR) return relative.format(Math.round(diffSeconds / MINUTE), 'minute');
  if (abs < DAY) return relative.format(Math.round(diffSeconds / HOUR), 'hour');
  if (abs < WEEK) return relative.format(Math.round(diffSeconds / DAY), 'day');

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(target);
}
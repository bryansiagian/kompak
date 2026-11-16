import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './relative-time';

const now = new Date('2026-11-20T12:00:00.000Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const relative = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' });

describe('formatRelativeTime', () => {
  it('beberapa detik terakhir dan waktu di masa depan (jam tidak sinkron) dianggap sekarang', () => {
    expect(formatRelativeTime(ago(10_000), now)).toBe(relative.format(0, 'second'));
    expect(formatRelativeTime(new Date(now.getTime() + 5000).toISOString(), now)).toBe(
      relative.format(0, 'second'),
    );
  });

  it('menit, jam, dan hari', () => {
    expect(formatRelativeTime(ago(5 * 60_000), now)).toContain('menit');
    expect(formatRelativeTime(ago(3 * 3_600_000), now)).toContain('jam');
    expect(formatRelativeTime(ago(86_400_000), now)).toBe(relative.format(-1, 'day'));
  });

  it('lebih dari seminggu memakai tanggal lengkap', () => {
    expect(formatRelativeTime(ago(30 * 86_400_000), now)).toContain('2026');
  });
});
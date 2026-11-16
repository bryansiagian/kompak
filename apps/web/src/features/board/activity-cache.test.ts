import { describe, expect, it } from 'vitest';
import type { Activity } from '@kompak/shared';
import {
  flattenActivityPages,
  prependActivity,
  upsertActivity,
} from './activity-cache';
import type { ActivityPages } from './activity-cache';

function activity(id: string, createdAt: string): Activity {
  return {
    id,
    boardId: 'b1',
    cardId: 'c1',
    actorId: 'u1',
    actorName: 'Ani',
    createdAt,
    type: 'card.deleted',
    payload: { title: id },
  };
}

const T1 = '2026-11-20T10:00:00.000Z';
const T2 = '2026-11-20T10:01:00.000Z';
const T3 = '2026-11-20T10:02:00.000Z';

const ids = (list: Activity[]) => list.map((item) => item.id);

describe('upsertActivity', () => {
  it('menaruh yang terbaru di depan dan mengabaikan duplikat', () => {
    const list = [activity('b', T2), activity('a', T1)];
    expect(ids(upsertActivity(list, activity('c', T3)))).toEqual(['c', 'b', 'a']);
    expect(upsertActivity(list, activity('a', T1))).toBe(list);
  });

  it('membatasi jumlah catatan', () => {
    const list = [activity('b', T2), activity('a', T1)];
    expect(ids(upsertActivity(list, activity('c', T3), 2))).toEqual(['c', 'b']);
  });
});

describe('prependActivity', () => {
  it('masuk ke halaman pertama, halaman lain tidak berubah', () => {
    const data: ActivityPages = {
      pages: [[activity('b', T2)], [activity('a', T1)]],
      pageParams: [undefined, T2],
    };
    const next = prependActivity(data, activity('c', T3));
    expect(ids(next.pages[0])).toEqual(['c', 'b']);
    expect(next.pages[1]).toBe(data.pages[1]);
    expect(next.pageParams).toBe(data.pageParams);
  });

  it('catatan yang sudah ada di halaman mana pun diabaikan', () => {
    const data: ActivityPages = {
      pages: [[activity('b', T2)], [activity('a', T1)]],
      pageParams: [undefined, T2],
    };
    expect(prependActivity(data, activity('a', T1))).toBe(data);
  });

  it('data kosong membuat halaman pertama', () => {
    const next = prependActivity({ pages: [], pageParams: [] }, activity('a', T1));
    expect(next.pages).toHaveLength(1);
    expect(ids(next.pages[0])).toEqual(['a']);
  });
});

describe('flattenActivityPages', () => {
  it('menyatukan halaman tanpa duplikat, urutan dipertahankan', () => {
    const data: ActivityPages = {
      pages: [
        [activity('c', T3), activity('b', T2)],
        [activity('b', T2), activity('a', T1)],
      ],
      pageParams: [undefined, T2],
    };
    expect(ids(flattenActivityPages(data))).toEqual(['c', 'b', 'a']);
  });
});
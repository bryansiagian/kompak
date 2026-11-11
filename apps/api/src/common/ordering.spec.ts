import {
  AnchorNotFoundError,
  MIN_POSITION_GAP,
  POSITION_STEP,
  appendPosition,
  planInsertion,
  positionBetween,
} from './ordering';
import type { Positioned } from './ordering';

function insertBefore(
  list: Positioned[],
  id: string,
  beforeId: string | null,
): { list: Positioned[]; renumbered: boolean } {
  const plan = planInsertion(list, beforeId);
  const updated = new Map(plan.renumbered.map((item) => [item.id, item.position]));
  const next = [
    ...list.map((item) => ({
      id: item.id,
      position: updated.get(item.id) ?? item.position,
    })),
    { id, position: plan.position },
  ].sort((a, b) => a.position - b.position);
  return { list: next, renumbered: plan.renumbered.length > 0 };
}

function expectStrictlyIncreasing(list: Positioned[]): void {
  expect(list[0].position).toBeGreaterThan(0);
  for (let index = 1; index < list.length; index += 1) {
    expect(list[index].position).toBeGreaterThan(list[index - 1].position);
  }
}

describe('positionBetween', () => {
  it('menaruh di akhir menambah satu langkah', () => {
    expect(positionBetween(null, null)).toBe(POSITION_STEP);
    expect(positionBetween(2048, null)).toBe(2048 + POSITION_STEP);
    expect(appendPosition(null)).toBe(POSITION_STEP);
  });

  it('menaruh di depan membagi dua posisi pertama', () => {
    expect(positionBetween(null, 1024)).toBe(512);
  });

  it('menaruh di tengah mengambil titik tengah', () => {
    expect(positionBetween(1024, 2048)).toBe(1536);
  });

  it('mengembalikan null bila celah terlalu sempit', () => {
    expect(positionBetween(1, 1 + MIN_POSITION_GAP / 10)).toBeNull();
    expect(positionBetween(null, MIN_POSITION_GAP / 2)).toBeNull();
  });
});

describe('planInsertion', () => {
  const list: Positioned[] = [
    { id: 'a', position: 1024 },
    { id: 'b', position: 2048 },
  ];

  it('kolom kosong: posisi pertama', () => {
    expect(planInsertion([], null)).toEqual({
      position: POSITION_STEP,
      renumbered: [],
    });
  });

  it('sebelum jangkar: di antara dua tetangga, tanpa penomoran ulang', () => {
    expect(planInsertion(list, 'b')).toEqual({ position: 1536, renumbered: [] });
    expect(planInsertion(list, 'a')).toEqual({ position: 512, renumbered: [] });
  });

  it('null berarti paling akhir', () => {
    expect(planInsertion(list, null)).toEqual({ position: 3072, renumbered: [] });
  });

  it('jangkar yang tidak ada di kolom melempar AnchorNotFoundError', () => {
    expect(() => planInsertion(list, 'x')).toThrow(AnchorNotFoundError);
  });

  it('sisipan berulang di depan tetap berurutan dan akhirnya menomori ulang', () => {
    let current: Positioned[] = [{ id: 'seed', position: POSITION_STEP }];
    const expected = ['seed'];
    let sawRenumbering = false;

    for (let step = 0; step < 100; step += 1) {
      const id = `n${step}`;
      const result = insertBefore(current, id, current[0].id);
      current = result.list;
      sawRenumbering ||= result.renumbered;
      expected.unshift(id);

      expect(current.map((item) => item.id)).toEqual(expected);
      expectStrictlyIncreasing(current);
    }
    expect(sawRenumbering).toBe(true);
  });

  it('sisipan berulang di antara dua item yang sama tetap berurutan', () => {
    let current: Positioned[] = [
      { id: 'first', position: POSITION_STEP },
      { id: 'last', position: 2 * POSITION_STEP },
    ];
    const expected = ['first', 'last'];
    let sawRenumbering = false;

    for (let step = 0; step < 120; step += 1) {
      const id = `m${step}`;
      // Selalu tepat sebelum item kedua: celahnya terus menyempit.
      const result = insertBefore(current, id, current[1].id);
      current = result.list;
      sawRenumbering ||= result.renumbered;
      expected.splice(1, 0, id);

      expect(current.map((item) => item.id)).toEqual(expected);
      expectStrictlyIncreasing(current);
    }
    expect(sawRenumbering).toBe(true);
  });
});
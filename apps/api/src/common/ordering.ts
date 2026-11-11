export const POSITION_STEP = 1024;
// Selisih terkecil yang masih aman dibagi dua; di bawah ini urutan dinomori ulang.
export const MIN_POSITION_GAP = 1e-6;

export interface Positioned {
  id: string;
  position: number;
}

export interface Insertion {
  position: number;
  // Item lain yang mendapat posisi baru saat celah habis; kosong pada kasus biasa.
  renumbered: Positioned[];
}

export class AnchorNotFoundError extends Error {
  constructor(anchorId: string) {
    super(`Anchor ${anchorId} is not in this list`);
    this.name = 'AnchorNotFoundError';
  }
}

export function appendPosition(lastPosition: number | null): number {
  return (lastPosition ?? 0) + POSITION_STEP;
}

// Posisi di antara dua tetangga, atau null bila celahnya terlalu sempit.
export function positionBetween(
  prev: number | null,
  next: number | null,
): number | null {
  if (next === null) {
    return appendPosition(prev);
  }
  const lower = prev ?? 0;
  if (next - lower < MIN_POSITION_GAP) {
    return null;
  }
  return (lower + next) / 2;
}

function positionAt(items: readonly Positioned[], index: number): number | null {
  return index >= 0 && index < items.length ? items[index].position : null;
}

// siblings: item lain di kolom tujuan (tanpa item yang dipindah), urut naik.
// beforeId: item yang harus berada tepat setelah item yang dipindah; null = paling akhir.
export function planInsertion(
  siblings: readonly Positioned[],
  beforeId: string | null,
): Insertion {
  const index =
    beforeId === null
      ? siblings.length
      : siblings.findIndex((sibling) => sibling.id === beforeId);
  if (index === -1) {
    throw new AnchorNotFoundError(beforeId ?? '');
  }

  const direct = positionBetween(
    positionAt(siblings, index - 1),
    positionAt(siblings, index),
  );
  if (direct !== null) {
    return { position: direct, renumbered: [] };
  }

  const renumbered = siblings.map((sibling, order) => ({
    id: sibling.id,
    position: (order + 1) * POSITION_STEP,
  }));
  const position = positionBetween(
    positionAt(renumbered, index - 1),
    positionAt(renumbered, index),
  );
  if (position === null) {
    // Tidak mungkin: setelah penomoran ulang, celahnya selalu POSITION_STEP.
    throw new Error('Renumbering left no gap');
  }
  return { position, renumbered };
}

import { labelColorSchema } from '@kompak/shared';
import type { Label } from '@kompak/shared';

export function toLabel(label: {
  id: string;
  boardId: string;
  name: string;
  color: string;
}): Label {
  // Nilai warna yang tidak dikenal menggunakan warna default.
  const color = labelColorSchema.safeParse(label.color);

  return {
    id: label.id,
    boardId: label.boardId,
    name: label.name,
    color: color.success ? color.data : 'stone',
  };
}

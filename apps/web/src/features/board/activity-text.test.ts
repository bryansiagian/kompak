import { describe, expect, it } from 'vitest';
import type { Activity } from '@kompak/shared';
import messages from '@/messages/id.json';
import { describeActivity } from './activity-text';

const base = {
  id: 'r1',
  boardId: 'b1',
  actorId: 'u1',
  actorName: 'Ani',
  createdAt: '2026-11-20T10:00:00.000Z',
};

const samples: Activity[] = [
  { ...base, cardId: 'c1', type: 'card.created', payload: { title: 'Laporan', listName: 'Belum dikerjakan' } },
  { ...base, cardId: 'c1', type: 'card.renamed', payload: { from: 'Laporan', to: 'Laporan Akhir' } },
  { ...base, cardId: 'c1', type: 'card.described', payload: { title: 'Laporan' } },
  { ...base, cardId: 'c1', type: 'card.assigned', payload: { title: 'Laporan', assigneeName: 'Budi' } },
  { ...base, cardId: 'c1', type: 'card.assigned', payload: { title: 'Laporan', assigneeName: null } },
  { ...base, cardId: 'c1', type: 'card.due_changed', payload: { title: 'Laporan', dueDate: '2026-12-31' } },
  { ...base, cardId: 'c1', type: 'card.due_changed', payload: { title: 'Laporan', dueDate: null } },
  { ...base, cardId: 'c1', type: 'card.moved', payload: { title: 'Laporan', fromListName: 'Belum dikerjakan', toListName: 'Selesai' } },
  { ...base, cardId: 'c1', type: 'card.deleted', payload: { title: 'Laporan' } },
  { ...base, cardId: 'c1', type: 'comment.added', payload: { title: 'Laporan', excerpt: 'Siap' } },
  { ...base, cardId: null, type: 'list.created', payload: { name: 'Review' } },
  { ...base, cardId: null, type: 'list.renamed', payload: { from: 'Review', to: 'Ditinjau' } },
  { ...base, cardId: null, type: 'list.deleted', payload: { name: 'Ditinjau' } },
];

const items = messages.board.activity.items as Record<string, string>;

describe('describeActivity', () => {
  it('semua jenis catatan terwakili', () => {
    expect(new Set(samples.map((sample) => sample.type)).size).toBe(11);
  });

  it('tiap catatan menghasilkan kunci yang ada di id.json dan semua isian pesannya terpenuhi', () => {
    for (const sample of samples) {
      const { key, values } = describeActivity(sample);
      const message = items[key];
      expect(message, `kunci ${key} tidak ada di id.json`).toBeDefined();

      const placeholders = [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
      for (const placeholder of placeholders) {
        expect(values, `${key} butuh {${placeholder}}`).toHaveProperty(placeholder);
      }
      expect(values.actor).toBe('Ani');
    }
  });

  it('penanggung jawab dan tenggat yang dikosongkan memakai kalimat tersendiri', () => {
    const kinds = samples.map((sample) => describeActivity(sample).key);
    expect(kinds).toContain('cardAssigned');
    expect(kinds).toContain('cardUnassigned');
    expect(kinds).toContain('cardDueChanged');
    expect(kinds).toContain('cardDueCleared');
  });

  it('tenggat diformat sebagai tanggal Indonesia', () => {
    const due = samples.find(
      (sample) => sample.type === 'card.due_changed' && sample.payload.dueDate !== null,
    );
    expect(due && describeActivity(due).values.date).toContain('Des');
  });
});
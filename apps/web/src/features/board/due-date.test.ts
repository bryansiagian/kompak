import { describe, expect, it } from 'vitest';
import { dueState, formatDueDate, todayIso } from './due-date';

describe('todayIso', () => {
  it('memakai tanggal kalender lokal dengan nol di depan', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(todayIso(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
  });
});

describe('dueState', () => {
  it('membedakan terlambat, hari ini, dan mendatang', () => {
    expect(dueState('2026-11-11', '2026-11-12')).toBe('overdue');
    expect(dueState('2026-11-12', '2026-11-12')).toBe('today');
    expect(dueState('2026-11-13', '2026-11-12')).toBe('upcoming');
  });

  it('membandingkan lintas bulan dan tahun dengan benar', () => {
    expect(dueState('2026-12-31', '2027-01-01')).toBe('overdue');
    expect(dueState('2027-01-01', '2026-12-31')).toBe('upcoming');
  });
});

describe('formatDueDate', () => {
  it('menampilkan tanggal dan bulan singkat tanpa bergeser hari', () => {
    const label = formatDueDate('2026-12-31');
    expect(label).toContain('31');
    expect(label).toContain('Des');
  });
});
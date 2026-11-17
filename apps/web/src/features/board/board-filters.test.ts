import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, matchesFilters, filteredBoard } from './board-filters';
import { makeBoard,makeCard } from './test-fixtures';
describe('board filters',()=>{
 it('tanpa filter menampilkan semua',()=>expect(filteredBoard(makeBoard(),EMPTY_FILTERS,'2026-11-17').lists[0].cards).toHaveLength(3));
 it('mencocokkan assignee',()=>expect(matchesFilters({...makeCard('a','todo'),assigneeId:'u1'}, {...EMPTY_FILTERS,assigneeId:'u2'}, '2026-11-17')).toBe(false));
 it('mencocokkan label',()=>expect(matchesFilters({...makeCard('a','todo'),labelIds:['a']}, {...EMPTY_FILTERS,labelId:'a'}, '2026-11-17')).toBe(true));
 it('tanggal terlambat',()=>expect(matchesFilters({...makeCard('a','todo'),dueDate:'2026-11-16'}, {...EMPTY_FILTERS,due:'overdue'}, '2026-11-17')).toBe(true));
 it('minggu termasuk hari Senin sampai Minggu',()=>expect(matchesFilters({...makeCard('a','todo'),dueDate:'2026-11-22'}, {...EMPTY_FILTERS,due:'week'}, '2026-11-17')).toBe(true));
});
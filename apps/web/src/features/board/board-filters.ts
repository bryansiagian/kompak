import type { BoardDetail, Card } from '@kompak/shared';
export type DueFilter='all'|'overdue'|'today'|'week';
export interface BoardFilters {assigneeId:string;labelId:string;due:DueFilter}
export const EMPTY_FILTERS:BoardFilters={assigneeId:'',labelId:'',due:'all'};
export function hasFilters(f:BoardFilters){return !!f.assigneeId||!!f.labelId||f.due!=='all'}
export function matchesFilters(card:Card, f:BoardFilters, today:string):boolean {
 if(f.assigneeId&&card.assigneeId!==f.assigneeId)return false;
 if(f.labelId&&!card.labelIds.includes(f.labelId))return false;
 if(f.due!=='all'){
  if(!card.dueDate)return false;
  if(f.due==='overdue'&&!(card.dueDate<today))return false;
  if(f.due==='today'&&card.dueDate!==today)return false;
  if(f.due==='week'){
   const start=new Date(`${today}T00:00:00Z`);
   const day=start.getUTCDay(); const monday=new Date(start);monday.setUTCDate(start.getUTCDate()-(day+6)%7);
   const sunday=new Date(monday);sunday.setUTCDate(monday.getUTCDate()+6);
   if(card.dueDate<monday.toISOString().slice(0,10)||card.dueDate>sunday.toISOString().slice(0,10))return false;
  }
 }
 return true;
}
export function filteredBoard(board:BoardDetail, f:BoardFilters, today:string):BoardDetail {
 return {...board,lists:board.lists.map(list=>({...list,cards:list.cards.filter(card=>matchesFilters(card,f,today))}))};
}
'use client';
import type { BoardDetail, Member } from '@kompak/shared';
import type { BoardFilters,DueFilter } from './board-filters';
import { EMPTY_FILTERS } from './board-filters';
import { useTranslations } from 'next-intl';
export function BoardFilterControls({board,members,filters,onChange,count,total}: {board:BoardDetail;members:Member[];filters:BoardFilters;onChange:(f:BoardFilters)=>void;count:number;total:number}) {
 const t=useTranslations('filters');
 const cls='min-h-11 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm';
 return <section className="mt-3 rounded-xl bg-stone-50 p-3"><h2 className="font-semibold">{t('title')}</h2><div className="mt-2 grid gap-2 sm:grid-cols-3">
 <label className="text-xs">{t('assignee')}<select aria-label={t('assignee')} className={cls} value={filters.assigneeId} onChange={e=>onChange({...filters,assigneeId:e.target.value})}><option value="">{t('all')}</option>{members.map(m=><option key={m.userId} value={m.userId}>{m.name}</option>)}</select></label>
 <label className="text-xs">{t('label')}<select aria-label={t('label')} className={cls} value={filters.labelId} onChange={e=>onChange({...filters,labelId:e.target.value})}><option value="">{t('all')}</option>{board.labels.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
 <label className="text-xs">{t('due')}<select aria-label={t('due')} className={cls} value={filters.due} onChange={e=>onChange({...filters,due:e.target.value as DueFilter})}><option value="all">{t('all')}</option><option value="overdue">{t('overdue')}</option><option value="today">{t('today')}</option><option value="week">{t('week')}</option></select></label>
 </div><div className="mt-2 flex items-center justify-between"><p className="text-sm text-stone-600">{t('showing',{count,total})}</p><button type="button" className="min-h-11 text-sm text-emerald-800 underline" onClick={()=>onChange(EMPTY_FILTERS)}>{t('clear')}</button></div></section>;
}
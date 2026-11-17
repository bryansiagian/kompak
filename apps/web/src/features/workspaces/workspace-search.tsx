'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { searchCards } from '@/lib/api/search';
import { useTranslations } from 'next-intl';
export function WorkspaceSearch({workspaceId}:{workspaceId:string}) {
 const t=useTranslations('search');
 const [value,setValue]=useState(''); const [q,setQ]=useState('');
 useEffect(()=>{const id=setTimeout(()=>setQ(value.trim()),300);return()=>clearTimeout(id)},[value]);
 const query=useQuery({queryKey:['workspace',workspaceId,'search',q],queryFn:()=>searchCards(workspaceId,q),enabled:q.length>=2});
 return <section className="space-y-2 rounded-xl border border-stone-200 bg-white p-3"><label className="block text-sm font-semibold" htmlFor="workspace-search">{t('title')}</label><input id="workspace-search" type="search" maxLength={100} value={value} onChange={e=>setValue(e.target.value)} placeholder={t('placeholder')} className="min-h-11 w-full rounded-lg border border-stone-300 p-2"/>
 {q.length<2?<p className="text-xs text-stone-500">{t('hint')}</p>:query.isPending?<p className="text-sm">{t('loading')}</p>:query.isError?<p role="alert" className="text-sm text-rose-700">{t('error')}</p>:query.data.length===0?<p className="text-sm text-stone-600">{t('empty')}</p>:<ul className="space-y-2">{query.data.map(item=><li key={item.cardId}><Link className="block min-h-11 rounded-lg border border-stone-200 p-2 hover:bg-stone-50" href={`/groups/${workspaceId}/projects/${item.boardId}?card=${encodeURIComponent(item.cardId)}`}><span className="block font-medium">{item.title}</span><span className="text-xs text-stone-500">{item.boardName} / {item.listName}</span></Link></li>)}</ul>}
 </section>;
}
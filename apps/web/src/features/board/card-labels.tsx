'use client';
import { useEffect, useState } from 'react';
import { MAX_LABELS_PER_CARD } from '@kompak/shared';
import type { BoardDetail, Card } from '@kompak/shared';
import { useSetCardLabels } from './label-hooks';
import { useTranslations } from 'next-intl';
export function CardLabels({board,card}: {board:BoardDetail;card:Card}) {
 const t=useTranslations('labels');
 const [selected,setSelected]=useState<string[]>(card.labelIds);
 useEffect(()=>{setSelected(card.labelIds)},[card.labelIds]);
 const mutation=useSetCardLabels(board.id);
 function toggle(id:string){setSelected(current=>current.includes(id)?current.filter(x=>x!==id):current.length<MAX_LABELS_PER_CARD?[...current,id]:current)}
 return <section className="space-y-2"><h3 className="font-semibold">{t('taskLabels')}</h3><div className="max-h-48 space-y-1 overflow-y-auto">{board.labels.map(label=><label key={label.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(label.id)} onChange={()=>toggle(label.id)}/>{label.name}</label>)}</div><p className="text-xs text-stone-600">{t('selected',{count:selected.length,max:MAX_LABELS_PER_CARD})}</p>{mutation.isError&&<p role="alert" className="text-sm text-rose-700">{t('error')}</p>}<button type="button" disabled={mutation.isPending} className="min-h-11 rounded-lg border px-3 text-sm" onClick={()=>mutation.mutate({cardId:card.id,input:{labelIds:selected}})}>{t('apply')}</button></section>;
}
'use client';
import { useState } from 'react';
import { LABEL_COLORS, createLabelSchema, updateLabelSchema } from '@kompak/shared';
import type { BoardDetail, LabelColor } from '@kompak/shared';
import { useCreateLabel, useDeleteLabel, useUpdateLabel } from './label-hooks';
import { LABEL_STYLE } from './label-style';
import { useTranslations } from 'next-intl';
export function LabelManager({board}: {board:BoardDetail}) {
  const t=useTranslations('labels');
  const [open,setOpen]=useState(false);
  const [name,setName]=useState('');
  const [color,setColor]=useState<LabelColor>('emerald');
  const [editing,setEditing]=useState<string|null>(null);
  const create=useCreateLabel(board.id), update=useUpdateLabel(board.id), remove=useDeleteLabel(board.id);
  const error=create.error??update.error??remove.error;
  function save(){
    if(editing){ const parsed=updateLabelSchema.safeParse({name,color});if(parsed.success) update.mutate({id:editing,input:parsed.data},{onSuccess:reset}); }
    else {const parsed=createLabelSchema.safeParse({name,color});if(parsed.success) create.mutate(parsed.data,{onSuccess:reset});}
  }
  function reset(){setName('');setColor('emerald');setEditing(null);}
  return <section className="mt-3 rounded-xl border border-stone-200 bg-white p-3">
    <button className="min-h-11 text-sm font-semibold text-emerald-800" onClick={()=>setOpen(!open)} type="button">{t('manage')} {open?'−':'+'}</button>
    {open&&<div className="space-y-3">
      <ul className="space-y-1">{board.labels.map(label=><li key={label.id} className="flex items-center justify-between gap-2"><span className={`rounded-full px-2 py-1 text-xs ${LABEL_STYLE[label.color]}`}>{label.name}</span><div className="flex gap-2"><button type="button" className="min-h-11 text-sm underline" onClick={()=>{setEditing(label.id);setName(label.name);setColor(label.color)}}>{t('edit')}</button><button type="button" className="min-h-11 text-sm text-rose-700 underline" onClick={()=>{if(window.confirm(t('deleteConfirm',{name:label.name}))) remove.mutate(label.id)}}>{t('delete')}</button></div></li>)}</ul>
      <label className="block text-sm">{t('name')}<input className="mt-1 block w-full rounded-lg border p-2" maxLength={30} value={name} onChange={e=>setName(e.target.value)}/></label>
      <label className="block text-sm">{t('color')}<select className="mt-1 block min-h-11 w-full rounded-lg border p-2" value={color} onChange={e=>setColor(e.target.value as LabelColor)}>{LABEL_COLORS.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
      {error&&<p role="alert" className="text-sm text-rose-700">{t('error')}</p>}
      <div className="flex gap-2"><button type="button" disabled={!name.trim()||create.isPending||update.isPending} className="min-h-11 rounded-lg bg-emerald-700 px-4 text-white disabled:opacity-50" onClick={save}>{editing?t('save'):t('create')}</button>{editing&&<button className="min-h-11 px-3" type="button" onClick={reset}>{t('cancel')}</button>}</div>
    </div>}
  </section>;
}
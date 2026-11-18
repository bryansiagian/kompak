'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { AiSubtask, Card } from '@kompak/shared';
import { generateSubtasks, summarizeDiscussion } from '@/lib/api/ai';
import { createCard, updateCard } from '@/lib/api/boards';
import { useQueryClient } from '@tanstack/react-query';
import { boardKey } from './hooks';
import { addCardToBoard, replaceCardInBoard } from './board-cache';
import type { BoardDetail } from '@kompak/shared';

interface Props {
  card: Card;
}

export function CardAiAssistant({ card }: Props) {
  const t = useTranslations('ai');
  const queryClient = useQueryClient();
  const subtasks = useMutation({ mutationFn: () => generateSubtasks(card.id) });
  const summary = useMutation({ mutationFn: () => summarizeDiscussion(card.id) });
  const [checked, setChecked] = useState<number[]>([]);
  const [createdIndexes, setCreatedIndexes] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // Track successful card creates even if updating their description fails.
  const createdIdRef = useRef<Record<number, string>>({});

  function generate() {
    setChecked([]);
    createdIdRef.current = {};
    setCreatedIndexes([]);
    subtasks.reset();
    setSaveError(false);
    subtasks.mutate(undefined, {
      onSuccess: (data) => setChecked(data.subtasks.map((_, index) => index)),
    });
  }

  function toggle(index: number) {
    setChecked((current) => current.includes(index)
      ? current.filter((value) => value !== index)
      : [...current, index]);
  }

  async function accept(items: AiSubtask[]) {
    if (saving) return;
    setSaving(true);
    setSaveError(false);
    const done = new Set(createdIndexes);
    try {
      for (let index = 0; index < items.length; index += 1) {
        if (!checked.includes(index) || done.has(index)) continue;
        const input = items[index];
        let createdId = createdIdRef.current[index];
        if (!createdId) {
          const created = await createCard(card.listId, { title: input.title });
          createdId = created.id;
          createdIdRef.current[index] = createdId;
          // Write to cache immediately: mutations in this component are direct API calls.
          queryClient.setQueryData<BoardDetail>(boardKey(card.boardId), (board) =>
            board ? addCardToBoard(board, created) : board,
          );
        }
        if (input.description) {
          const updated = await updateCard(createdId, { description: input.description });
          queryClient.setQueryData<BoardDetail>(boardKey(card.boardId), (board) =>
            board ? replaceCardInBoard(board, updated) : board,
          );
        }
        done.add(index);
        setCreatedIndexes([...done]);
      }
      await queryClient.invalidateQueries({ queryKey: boardKey(card.boardId) });
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label={t('title')} className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
      <h3 className="font-semibold">{t('title')}</h3>
      <p className="text-xs text-stone-600">{t('disclaimer')}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-lg border bg-white px-3 text-sm font-medium disabled:opacity-50" onClick={generate} disabled={subtasks.isPending || saving}>
          {subtasks.isPending ? t('loading') : t('generate')}
        </button>
        <button type="button" className="min-h-11 rounded-lg border bg-white px-3 text-sm font-medium disabled:opacity-50" onClick={() => summary.mutate()} disabled={summary.isPending || saving}>
          {summary.isPending ? t('loading') : t('summarize')}
        </button>
      </div>
      {(subtasks.isError || summary.isError) ? (
        <p role="alert" className="text-sm text-rose-700">{t('requestFailed')}</p>
      ) : null}
      {subtasks.data ? (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{t('suggestions')}</h4>
          <ul className="space-y-2">
            {subtasks.data.subtasks.map((item, index) => (
              <li key={`${index}:${item.title}`}>
                <label className="flex min-h-11 items-start gap-2 rounded-lg bg-white p-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={checked.includes(index) || createdIndexes.includes(index)} disabled={saving || createdIndexes.includes(index)} onChange={() => toggle(index)} />
                  <span>
                    <strong className="block">{item.title}</strong>
                    <span className="text-stone-600">{item.description}</span>
                    {createdIndexes.includes(index) ? <span className="block text-emerald-700">{t('created')}</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {saveError ? <p role="alert" className="text-sm text-rose-700">{t('saveFailed')}</p> : null}
          <button type="button" className="min-h-11 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white disabled:opacity-50" disabled={saving || checked.every((index) => createdIndexes.includes(index))} onClick={() => void accept(subtasks.data.subtasks)}>
            {saving ? t('saving') : t('accept')}
          </button>
        </div>
      ) : null}
      {summary.data ? (
        <div className="space-y-2 rounded-lg bg-white p-3 text-sm">
          <h4 className="font-semibold">{t('summaryTitle')}</h4>
          <p className="whitespace-pre-wrap">{summary.data.summary}</p>
          <h5 className="font-medium">{t('keyPoints')}</h5>
          <ul className="list-disc space-y-1 pl-5">{summary.data.keyPoints.map((item, index) => <li key={index}>{item}</li>)}</ul>
          {summary.data.decisions.length > 0 ? <><h5 className="font-medium">{t('decisions')}</h5><ul className="list-disc space-y-1 pl-5">{summary.data.decisions.map((item, index) => <li key={index}>{item}</li>)}</ul></> : null}
          {summary.data.actionItems.length > 0 ? <><h5 className="font-medium">{t('actionItems')}</h5><ul className="list-disc space-y-1 pl-5">{summary.data.actionItems.map((item, index) => <li key={index}>{item}</li>)}</ul></> : null}
        </div>
      ) : null}
    </section>
  );
}

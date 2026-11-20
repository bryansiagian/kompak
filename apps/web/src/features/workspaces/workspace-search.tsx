'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/collection-state';
import { FormAlert } from '@/components/ui/form-alert';
import { TextField } from '@/components/ui/text-field';
import { searchCards } from '@/lib/api/search';

export function WorkspaceSearch({ workspaceId }: { workspaceId: string }) {
  const t = useTranslations('search');
  const [value, setValue] = useState('');
  const [queryText, setQueryText] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setQueryText(value.trim()), 300);
    return () => clearTimeout(timeout);
  }, [value]);

  const query = useQuery({
    queryKey: ['workspace', workspaceId, 'search', queryText],
    queryFn: () => searchCards(workspaceId, queryText),
    enabled: queryText.length >= 2,
  });
  const ready = queryText.length >= 2 && queryText === value.trim();

  return (
    <div className="space-y-3">
      <TextField
        type="search"
        label={t('title')}
        maxLength={100}
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        placeholder={t('placeholder')}
        hint={t('hint')}
      />
      {ready && query.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t('loading')}
        </p>
      ) : null}
      {ready && query.isError ? <FormAlert>{t('error')}</FormAlert> : null}
      {ready && query.data?.length === 0 ? (
        <EmptyState>{t('empty')}</EmptyState>
      ) : null}
      {ready && query.data?.length ? (
        <>
          <p role="status" className="sr-only">
            {t('results', { count: query.data.length })}
          </p>
          <ul className="grid gap-2">
            {query.data.map((item) => (
              <li key={item.cardId}>
                <Link
                  className="control-focus block min-h-11 rounded-xl border border-divider p-3 hover:bg-brand-tint"
                  href={`/groups/${workspaceId}/projects/${item.boardId}?card=${encodeURIComponent(item.cardId)}`}
                >
                  <span className="block wrap-anywhere font-semibold">
                    {item.title}
                  </span>
                  <span className="block wrap-anywhere text-sm text-muted-foreground">
                    {item.boardName} / {item.listName}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

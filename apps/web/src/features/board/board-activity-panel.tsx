'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { workspaceErrorKey } from '@/features/workspaces/errors';
import { flattenActivityPages } from './activity-cache';
import { useBoardActivity } from './activity-hooks';
import { ActivityList } from './activity-list';

export function BoardActivityButton({ boardId }: { boardId: string }) {
  const t = useTranslations('board.activity');
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {t('open')}
      </Button>
      {open ? (
        <BoardActivityPanel boardId={boardId} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function BoardActivityPanel({
  boardId,
  onClose,
}: {
  boardId: string;
  onClose: () => void;
}) {
  const t = useTranslations('board.activity');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('groups.errors');
  const headingId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const feed = useBoardActivity(boardId);

  // <dialog> native memberi focus trap, tombol Esc, dan latar belakang gratis.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const activities = feed.data ? flattenActivityPages(feed.data) : [];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={headingId}
      className="fixed inset-x-0 bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-surface p-0 text-foreground shadow-xl backdrop:bg-brand-ink/55 sm:inset-0 sm:m-auto sm:h-fit sm:max-w-lg sm:rounded-3xl"
    >
      <div className="space-y-4 p-5">
        <header className="flex items-center justify-between gap-3 border-b border-divider pb-3">
          <h2 id={headingId} className="text-lg font-bold">
            {t('boardTitle')}
          </h2>
          <Button
            variant="secondary"
            onClick={() => dialogRef.current?.close()}
          >
            {t('close')}
          </Button>
        </header>

        {feed.isPending ? (
          <p role="status" className="text-sm text-stone-600">
            {tCommon('loading')}
          </p>
        ) : feed.isError ? (
          <FormAlert>{tErrors(workspaceErrorKey(feed.error))}</FormAlert>
        ) : activities.length === 0 ? (
          <p className="text-sm text-stone-600">{t('empty')}</p>
        ) : (
          <ActivityList activities={activities} />
        )}

        {feed.hasNextPage ? (
          <Button
            variant="secondary"
            fullWidth
            disabled={feed.isFetchingNextPage}
            onClick={() => void feed.fetchNextPage()}
          >
            {feed.isFetchingNextPage ? t('loadingMore') : t('loadMore')}
          </Button>
        ) : null}
      </div>
    </dialog>
  );
}

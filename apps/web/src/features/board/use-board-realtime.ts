'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type {
  Activity,
  BoardDetail,
  Comment,
  PresenceUser,
} from '@kompak/shared';
import { workspacesKey } from '@/features/workspaces/hooks';
import { getRealtimeClient } from '@/lib/realtime/browser';
import type { BoardWatcher, ConnectionStatus } from '@/lib/realtime/client';
import type { RealtimeLoss } from './access-lost';
import { prependActivity, upsertActivity } from './activity-cache';
import type { ActivityPages } from './activity-cache';
import {
  CARD_ACTIVITY_LIMIT,
  boardActivityKey,
  cardActivityKey,
  cardActivityRootKey,
} from './activity-hooks';
import { applyBoardEvent } from './board-events';
import { commentEventCardId, applyCommentEvent } from './comments-cache';
import { commentsKey, commentsRootKey } from './comment-hooks';
import { boardKey } from './hooks';

// Menerapkan peristiwa real-time papan ke cache, melacak presence dan status koneksi.
export function useBoardRealtime(boardId: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [loss, setLoss] = useState<RealtimeLoss | null>(null);

  useEffect(() => {
    const key = boardKey(boardId);
    let lost = false;

    function lose(reason: RealtimeLoss): void {
      lost = true;
      setLoss(reason);
      // Daftar kelompok dan jumlah proyek ikut berubah.
      void queryClient.invalidateQueries({ queryKey: workspacesKey });
    }

    const watcher: BoardWatcher = {
      onEvent: (event) => {
        if (lost) {
          return;
        }

        switch (event.type) {
          case 'board.deleted':
            lose('deleted');
            return;

          // Komentar dan riwayat hanya diterapkan ke cache yang sedang ada;
          // yang belum pernah dibuka akan diambil segar saat dibuka.
          case 'comment.created':
          case 'comment.updated':
          case 'comment.deleted':
            queryClient.setQueryData<Comment[]>(
              commentsKey(commentEventCardId(event)),
              (current) =>
                current ? applyCommentEvent(current, event) : current,
            );
            return;

          case 'activity.created': {
            const { activity } = event;
            queryClient.setQueryData<ActivityPages>(
              boardActivityKey(boardId),
              (current) => (current ? prependActivity(current, activity) : current),
            );
            if (activity.cardId) {
              queryClient.setQueryData<Activity[]>(
                cardActivityKey(activity.cardId),
                (current) =>
                  current
                    ? upsertActivity(current, activity, CARD_ACTIVITY_LIMIT)
                    : current,
              );
            }
            return;
          }

          default:
            break;
        }

        const current = queryClient.getQueryData<BoardDetail>(key);
        if (!current) {
          return;
        }
        const next = applyBoardEvent(current, event);
        if (next === null) {
          // Tidak konsisten dengan cache: ambil ulang, jangan menebak.
          void queryClient.invalidateQueries({ queryKey: key });
        } else if (next !== current) {
          queryClient.setQueryData(key, next);
        }
      },
      onPresence: setPresence,
      onStatus: setStatus,
      // Menutup celah antara pengambilan data dan bergabung ke ruang, dan
      // menyegarkan data setelah koneksi putus lalu tersambung lagi.
      onSynced: () => {
        if (lost) {
          return;
        }
        void queryClient.invalidateQueries({ queryKey: key });
        void queryClient.invalidateQueries({ queryKey: commentsRootKey });
        void queryClient.invalidateQueries({ queryKey: cardActivityRootKey });
        void queryClient.invalidateQueries({
          queryKey: boardActivityKey(boardId),
        });
      },
      onRevoked: () => {
        if (!lost) {
          lose('revoked');
        }
      },
    };

    return getRealtimeClient().watchBoard(boardId, workspaceId, watcher);
  }, [boardId, workspaceId, queryClient]);

  return { status, presence, loss };
}
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { BoardDetail, PresenceUser } from '@kompak/shared';
import { workspacesKey } from '@/features/workspaces/hooks';
import { getRealtimeClient } from '@/lib/realtime/browser';
import type { BoardWatcher, ConnectionStatus } from '@/lib/realtime/client';
import type { RealtimeLoss } from './access-lost';
import { applyBoardEvent } from './board-events';
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
        if (event.type === 'board.deleted') {
          lose('deleted');
          return;
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
        if (!lost) {
          void queryClient.invalidateQueries({ queryKey: key });
        }
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
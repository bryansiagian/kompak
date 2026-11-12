'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  Announcements,
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import type { AuthUser, BoardDetail } from '@kompak/shared';
import { FormAlert } from '@/components/ui/form-alert';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { TextLink } from '@/components/ui/text-link';
import { RequireAuth } from '@/features/auth/require-auth';
import { useMembers, useWorkspace } from '@/features/workspaces/hooks';
import { canManage } from '@/features/workspaces/permissions';
import { AddListForm } from './add-list-form';
import {
  placementOf,
  samePlacement,
  stepListPlacement,
} from './board-cache';
import type { Placement } from './board-cache';
import { CardDetail } from './card-detail';
import { CardView } from './card-item';
import {
  applyDragOver,
  dropPlacement,
  parseListDroppableId,
  targetListName,
} from './dnd-helpers';
import { boardKey, useBoard, useMoveCard, useMoveList } from './hooks';
import { ListColumn } from './list-column';

// Kartu diutamakan daripada kolom pembungkusnya; papan ketik jatuh ke closestCorners.
const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    const cardHit = pointerHits.find(
      (hit) => parseListDroppableId(String(hit.id)) === null,
    );
    return cardHit ? [cardHit] : pointerHits;
  }
  return closestCorners(args);
};

export function BoardScreen({ boardId }: { boardId: string }) {
  return (
    <RequireAuth>
      {(user) => <BoardContent boardId={boardId} user={user} />}
    </RequireAuth>
  );
}

function BoardContent({ boardId, user }: { boardId: string; user: AuthUser }) {
  const t = useTranslations('board');
  const board = useBoard(boardId);

  if (board.isPending) {
    return <LoadingScreen />;
  }

  if (board.isError) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md space-y-3 px-4 py-8">
        <h1 className="text-xl font-bold">{t('notFoundTitle')}</h1>
        <p className="text-sm text-stone-600">{t('notFoundBody')}</p>
        <TextLink href="/">{t('backHome')}</TextLink>
      </main>
    );
  }

  return <BoardView board={board.data} user={user} />;
}

function BoardView({ board, user }: { board: BoardDetail; user: AuthUser }) {
  const t = useTranslations('board');
  const queryClient = useQueryClient();
  const workspace = useWorkspace(board.workspaceId);
  const members = useMembers(board.workspaceId);
  const moveCard = useMoveCard(board.id);
  const moveList = useMoveList(board.id);

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  // Keadaan papan sebelum drag, untuk rollback dan pembatalan.
  const snapshotRef = useRef<BoardDetail | null>(null);

  // Selama peran belum dimuat, anggap Anggota biasa (paling terbatas).
  const role = workspace.data?.role ?? 'MEMBER';
  const manager = canManage(role);

  const memberNames = useMemo(
    () => new Map((members.data ?? []).map((m) => [m.userId, m.name])),
    [members.data],
  );
  function assigneeNameOf(assigneeId: string | null): string | undefined {
    if (assigneeId === null || members.data === undefined) return undefined;
    return memberNames.get(assigneeId) ?? t('card.formerMember');
  }

  const allCards = board.lists.flatMap((list) => list.cards);
  const activeCard = allCards.find((card) => card.id === activeCardId) ?? null;
  const selectedCard = allCards.find((card) => card.id === selectedCardId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const key = boardKey(board.id);
  function readBoard(): BoardDetail | undefined {
    return queryClient.getQueryData<BoardDetail>(key);
  }
  function restoreSnapshot() {
    if (snapshotRef.current) {
      queryClient.setQueryData(key, snapshotRef.current);
    }
    snapshotRef.current = null;
  }

  function handleDragStart(event: DragStartEvent) {
    snapshotRef.current = readBoard() ?? null;
    setActiveCardId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    const current = readBoard();
    if (!over || !current) return;

    const translated = active.rect.current.translated;
    const placeAfter = translated
      ? translated.top + translated.height / 2 > over.rect.top + over.rect.height / 2
      : false;
    const next = applyDragOver(current, String(active.id), String(over.id), placeAfter);
    if (next !== current) {
      queryClient.setQueryData(key, next);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const original = snapshotRef.current;
    const current = readBoard();
    const { active, over } = event;
    setActiveCardId(null);

    if (!original || !current || !over) {
      restoreSnapshot();
      return;
    }

    const cardId = String(active.id);
    const target = dropPlacement(current, cardId, String(over.id));
    const before = placementOf(original, cardId);
    snapshotRef.current = null;

    if (!target || (before && samePlacement(before, target))) {
      queryClient.setQueryData(key, original);
      return;
    }
    // Cache sudah menampilkan hasilnya; original hanya dipakai bila server menolak.
    moveCard.mutate({ cardId, ...target, rollbackTo: original });
  }

  function handleDragCancel() {
    setActiveCardId(null);
    restoreSnapshot();
  }

  function handleMoveCard(cardId: string, placement: Placement) {
    moveCard.mutate({ cardId, ...placement });
  }

  function handleMoveList(listId: string, direction: 'left' | 'right') {
    const placement = stepListPlacement(board, listId, direction);
    if (placement) {
      moveList.mutate({ listId, beforeListId: placement.beforeListId });
    }
  }

  const titleOf = (id: string | number): string =>
    allCards.find((card) => card.id === String(id))?.title ?? '';
  const announcements: Announcements = {
    onDragStart: ({ active }) => t('dnd.picked', { title: titleOf(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t('dnd.over', {
            title: titleOf(active.id),
            target: targetListName(board, String(over.id)) ?? '',
          })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t('dnd.dropped', {
            title: titleOf(active.id),
            target: targetListName(board, String(over.id)) ?? '',
          })
        : t('dnd.cancelled', { title: titleOf(active.id) }),
    onDragCancel: ({ active }) =>
      t('dnd.cancelled', { title: titleOf(active.id) }),
  };

  const moveFailed = moveCard.isError || moveList.isError;

  return (
    <main className="min-h-dvh px-4 py-5">
      <TextLink href={`/groups/${board.workspaceId}`}>{t('backToGroup')}</TextLink>
      <h1 className="mt-1 break-words text-2xl font-extrabold tracking-tight">
        {board.name}
      </h1>

      {moveFailed ? (
        <div className="mt-3">
          <FormAlert>{t('moveFailed')}</FormAlert>
        </div>
      ) : null}

      {board.lists.length === 0 && !manager ? (
        <p className="mt-6 text-sm text-stone-600">{t('emptyBoard')}</p>
      ) : null}

      <DndContext
        id={`board-${board.id}`}
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={{
          announcements,
          screenReaderInstructions: { draggable: t('dnd.instructions') },
        }}
      >
        <div className="-mx-4 mt-4 flex items-start gap-3 overflow-x-auto px-4 pb-6">
          {board.lists.map((list, index) => (
            <ListColumn
              key={list.id}
              boardId={board.id}
              list={list}
              canManage={manager}
              canMoveLeft={index > 0}
              canMoveRight={index < board.lists.length - 1}
              assigneeNameOf={assigneeNameOf}
              onOpenCard={setSelectedCardId}
              onMoveList={(direction) => handleMoveList(list.id, direction)}
            />
          ))}
          {manager ? <AddListForm boardId={board.id} /> : null}
        </div>

        <DragOverlay>
          {activeCard ? (
            <CardView
              card={activeCard}
              assigneeName={assigneeNameOf(activeCard.assigneeId)}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedCard ? (
        <CardDetail
          key={selectedCard.id}
          boardId={board.id}
          board={board}
          card={selectedCard}
          members={members.data ?? []}
          viewer={{ userId: user.id, role }}
          onMove={(placement) => handleMoveCard(selectedCard.id, placement)}
          onClose={() => setSelectedCardId(null)}
        />
      ) : null}
    </main>
  );
}
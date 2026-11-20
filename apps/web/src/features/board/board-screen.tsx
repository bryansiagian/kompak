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
import { useSearchParams } from 'next/navigation';
import type { AuthUser, BoardDetail } from '@kompak/shared';
import { AppShell, PageHeader } from '@/components/ui/app-shell';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { RetryButton, useLoadError } from '@/components/ui/load-error';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { TextLink } from '@/components/ui/text-link';
import { RequireAuth } from '@/features/auth/require-auth';
import { useMembers, useWorkspace } from '@/features/workspaces/hooks';
import { canManage } from '@/features/workspaces/permissions';
import { AccessLost } from './access-lost';
import { AddListForm } from './add-list-form';
import { BoardActivityButton } from './board-activity-panel';
import { BoardFilterControls } from './board-filter-controls';
import { EMPTY_FILTERS, filteredBoard, hasFilters } from './board-filters';
import type { BoardFilters } from './board-filters';
import { placementOf, samePlacement, stepListPlacement } from './board-cache';
import type { Placement } from './board-cache';
import { CardDetail } from './card-detail';
import { CardView } from './card-item';
import { ConnectionBanner } from './connection-banner';
import {
  applyDragOver,
  dropPlacement,
  parseListDroppableId,
  targetListName,
} from './dnd-helpers';
import { boardKey, useBoard, useMoveCard, useMoveList } from './hooks';
import { ListColumn } from './list-column';
import { LabelManager } from './label-manager';
import { todayIso } from './due-date';
import { othersOf } from './presence';
import { PresenceBar } from './presence-bar';
import { useBoardRealtime } from './use-board-realtime';

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

  const loadError = useLoadError(board, {
    title: t('notFoundTitle'),
    subtitle: t('notFoundBody'),
  });

  if (board.isPending || board.isError) {
    if (!loadError) return <LoadingScreen />;

    return (
      <AppShell>
        <div className="mx-auto max-w-lg space-y-3 rounded-2xl border border-divider bg-surface p-5 shadow-panel">
          <h1 className="text-xl font-bold">{loadError.title}</h1>
          <p role="alert" className="text-sm text-muted-foreground">
            {loadError.subtitle}
          </p>
          {loadError.retry ? (
            <div>
              <RetryButton {...loadError.retry} />
            </div>
          ) : null}
          <TextLink href="/">{t('backHome')}</TextLink>
        </div>
      </AppShell>
    );
  }

  // key: berpindah papan mereset status real-time, presence, dan lembar tugas.
  return <BoardView key={board.data.id} board={board.data} user={user} />;
}

function BoardView({ board, user }: { board: BoardDetail; user: AuthUser }) {
  const t = useTranslations('board');
  const design = useTranslations('redesign');
  const tFilters = useTranslations('filters');
  const queryClient = useQueryClient();
  const workspace = useWorkspace(board.workspaceId);
  const members = useMembers(board.workspaceId);
  const moveCard = useMoveCard(board.id);
  const moveList = useMoveList(board.id);
  const realtime = useBoardRealtime(board.id, board.workspaceId);

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [dismissedLinkedCard, setDismissedLinkedCard] = useState(false);
  const [search, setSearch] = useState('');
  const [targetLane, setTargetLane] = useState('');
  const laneContainer = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);
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
  const linkedCardId = dismissedLinkedCard ? null : searchParams.get('card');
  const effectiveSelectedCardId = selectedCardId ?? linkedCardId;

  const selectedCard =
    allCards.find((card) => card.id === effectiveSelectedCardId) ?? null;
  const searchTerm = search.trim().toLocaleLowerCase('id');
  const filtersActive = hasFilters(filters) || searchTerm.length > 0;
  const visibleBoard = useMemo(
    () => filteredBoard(board, filters, todayIso(), searchTerm),
    [board, filters, searchTerm],
  );
  const visibleCount = visibleBoard.lists.reduce(
    (sum, list) => sum + list.cards.length,
    0,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
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
      ? translated.top + translated.height / 2 >
        over.rect.top + over.rect.height / 2
      : false;
    const next = applyDragOver(
      current,
      String(active.id),
      String(over.id),
      placeAfter,
    );
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

  // Proyek dihapus atau akses dicabut oleh orang lain.
  if (realtime.loss) {
    return <AccessLost loss={realtime.loss} />;
  }

  return (
    <AppShell wide>
      <TextLink href={`/groups/${board.workspaceId}`}>
        {t('backToGroup')}
      </TextLink>
      <PageHeader title={board.name}>
        <PresenceBar users={othersOf(realtime.presence, user.id)} />
        <BoardActivityButton boardId={board.id} />
      </PageHeader>

      <div className="mt-4 grid items-start gap-3 border-y border-divider py-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,.8fr)_minmax(15rem,.7fr)]">
        <TextField
          type="search"
          label={design('boardSearch')}
          placeholder={design('boardSearchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
        {board.lists.length ? (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <SelectField
              label={design('columnJump')}
              value={
                board.lists.some((list) => list.id === targetLane)
                  ? targetLane
                  : ''
              }
              onChange={(event) => setTargetLane(event.currentTarget.value)}
              options={[
                { value: '', label: design('columnSelect') },
                ...board.lists.map((list) => ({
                  value: list.id,
                  label: list.name,
                })),
              ]}
            />
            <Button
              variant="secondary"
              disabled={!board.lists.some((list) => list.id === targetLane)}
              onClick={() => {
                const lane = document.getElementById(`lane-${targetLane}`);
                if (!lane || !laneContainer.current?.contains(lane)) return;
                lane.scrollIntoView({ block: 'nearest', inline: 'start' });
                lane.focus({ preventScroll: true });
              }}
            >
              {design('columnGo')}
            </Button>
          </div>
        ) : null}
        <details className="rounded-lg bg-brand-tint sm:col-span-2 xl:col-span-1 xl:mt-6">
          <summary className="control-focus min-h-11 cursor-pointer rounded-xl px-3 py-3 text-sm font-semibold">
            {design('boardTools')}
          </summary>
          <div className="px-3 pb-3">
            <BoardFilterControls
              board={board}
              members={members.data ?? []}
              filters={filters}
              onChange={setFilters}
            />
            {manager ? <LabelManager board={board} /> : null}
          </div>
        </details>
        {filtersActive ? (
          <p
            role="status"
            className="text-sm text-muted-foreground lg:col-span-2"
          >
            {tFilters('showing', {
              count: visibleCount,
              total: allCards.length,
            })}
          </p>
        ) : null}
      </div>
      <ConnectionBanner status={realtime.status} />

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
        <div
          ref={laneContainer}
          role="region"
          aria-label={design('boardLayout')}
          tabIndex={0}
          className="control-focus mt-5 flex min-w-0 items-start gap-3 overflow-x-auto pb-5 pt-1 sm:gap-4"
        >
          {visibleBoard.lists.map((list, index) => (
            <ListColumn
              key={list.id}
              boardId={board.id}
              list={list}
              canManage={manager}
              dragDisabled={filtersActive}
              labels={board.labels}
              canMoveLeft={index > 0}
              canMoveRight={index < board.lists.length - 1}
              assigneeNameOf={assigneeNameOf}
              onOpenCard={(cardId) => {
                moveCard.reset();
                setSelectedCardId(cardId);
              }}
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
              labels={board.labels}
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
          movePending={moveCard.isPending}
          moveFailed={moveCard.isError}
          onMove={(placement) => handleMoveCard(selectedCard.id, placement)}
          onClose={() => {
            setSelectedCardId(null);
            setDismissedLinkedCard(true);
          }}
        />
      ) : null}
    </AppShell>
  );
}

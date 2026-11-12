import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { BoardScreen } from '@/features/board/board-screen';
import messages from '@/messages/id.json';

export const metadata: Metadata = { title: messages.board.pageTitle };

type BoardPageProps = { params: Promise<{ id: string; boardId: string }> };

// params dibaca di dalam <Suspense>: dengan Cache Components, membacanya di luar
// batas Suspense membuat build gagal.
async function BoardContent({ params }: BoardPageProps) {
  const { boardId } = await params;
  return <BoardScreen boardId={boardId} />;
}

export default function BoardPage({ params }: BoardPageProps) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <BoardContent params={params} />
    </Suspense>
  );
}
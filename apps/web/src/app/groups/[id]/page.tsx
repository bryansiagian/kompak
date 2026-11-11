import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { GroupScreen } from '@/features/workspaces/group-screen';
import messages from '@/messages/id.json';

export const metadata: Metadata = { title: messages.groups.pageTitle };

type GroupPageProps = { params: Promise<{ id: string }> };

// params dibaca di dalam <Suspense>: dengan Cache Components, membacanya di luar
// batas Suspense membuat build gagal.
async function GroupContent({ params }: GroupPageProps) {
  const { id } = await params;
  return <GroupScreen groupId={id} />;
}

export default function GroupPage({ params }: GroupPageProps) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <GroupContent params={params} />
    </Suspense>
  );
}
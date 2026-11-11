import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { JoinScreen } from '@/features/workspaces/join-screen';
import messages from '@/messages/id.json';

export const metadata: Metadata = { title: messages.join.pageTitle };

type JoinPageProps = { params: Promise<{ code: string }> };

async function JoinContent({ params }: JoinPageProps) {
  const { code } = await params;
  return <JoinScreen code={code} />;
}

export default function JoinPage({ params }: JoinPageProps) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <JoinContent params={params} />
    </Suspense>
  );
}
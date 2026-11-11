import type { Metadata } from 'next';
import { CreateGroupScreen } from '@/features/workspaces/create-group-screen';
import messages from '@/messages/id.json';

export const metadata: Metadata = { title: messages.groups.create.title };

export default function NewGroupPage() {
  return <CreateGroupScreen />;
}
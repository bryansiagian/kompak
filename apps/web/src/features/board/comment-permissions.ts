import type { WorkspaceRole } from '@kompak/shared';
import { canManage } from '@/features/workspaces/permissions';

interface Actor {
  userId: string;
  role: WorkspaceRole;
}

// Cermin aturan di API (CommentsService). Hanya untuk menentukan tombol yang
// tampil; API tetap penentu akhir.
export function canEditComment(
  actor: Actor,
  comment: { authorId: string },
): boolean {
  return comment.authorId === actor.userId;
}

export function canDeleteComment(
  actor: Actor,
  comment: { authorId: string },
): boolean {
  return comment.authorId === actor.userId || canManage(actor.role);
}
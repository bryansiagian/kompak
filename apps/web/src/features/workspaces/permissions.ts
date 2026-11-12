import type { WorkspaceRole } from '@kompak/shared';

interface Actor {
  userId: string;
  role: WorkspaceRole;
}

export function canManage(role: WorkspaceRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export function canChangeRoles(role: WorkspaceRole): boolean {
  return role === 'OWNER';
}

// Cermin aturan di API (WorkspacesService.removeMember). Hanya untuk
// menentukan tombol yang tampil; API tetap penentu akhir.
export function canRemoveMember(actor: Actor, target: Actor): boolean {
  if (target.role === 'OWNER') return false;
  if (actor.userId === target.userId) return true;
  if (actor.role === 'OWNER') return true;
  return actor.role === 'ADMIN' && target.role === 'MEMBER';
}

// Cermin aturan di API (CardsService.remove): pembuat tugas, Pengelola, atau Ketua.
export function canDeleteCard(
  actor: Actor,
  card: { createdById: string },
): boolean {
  return card.createdById === actor.userId || canManage(actor.role);
}
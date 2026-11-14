import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  InviteCodeResponse,
  InvitePreview,
  JoinResponse,
  Member,
  WorkspaceDetail,
  WorkspaceSummary,
} from '@kompak/shared';
import { Prisma } from '../../generated/prisma/client';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { generateInviteCode } from './invite-code';

const MAX_CODE_ATTEMPTS = 5;

const ROLE_ORDER: Record<WorkspaceRole, number> = {
  OWNER: 0,
  ADMIN: 1,
  MEMBER: 2,
};

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function toDetail(
  workspace: { id: string; name: string; inviteCode: string; createdAt: Date },
  role: WorkspaceRole,
): WorkspaceDetail {
  return {
    id: workspace.id,
    name: workspace.name,
    role,
    inviteCode: workspace.inviteCode,
    createdAt: workspace.createdAt.toISOString(),
  };
}

function toMember(row: {
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
  user: { name: string };
}): Member {
  return {
    userId: row.userId,
    name: row.user.name,
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
  };
}

// Metode yang menerima workspaceId dipanggil setelah WorkspaceMembershipGuard
// memastikan pemanggil adalah anggota dengan peran yang sesuai.
@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(userId: string): Promise<WorkspaceSummary[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                members: true,
                boards: { where: { archivedAt: null } },
              },
            },
          },
        },
      },
      orderBy: { workspace: { createdAt: 'desc' } },
    });
    return memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      role: membership.role,
      memberCount: membership.workspace._count.members,
      boardCount: membership.workspace._count.boards,
    }));
  }

  async create(userId: string, name: string): Promise<WorkspaceDetail> {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      try {
        const workspace = await this.prisma.workspace.create({
          data: {
            name,
            ownerId: userId,
            inviteCode: generateInviteCode(),
            members: { create: { userId, role: WorkspaceRole.OWNER } },
          },
        });
        return toDetail(workspace, WorkspaceRole.OWNER);
      } catch (error) {
        // Kode undangan bentrok (sangat jarang): coba kode lain.
        if (!isUniqueViolation(error)) {
          throw error;
        }
      }
    }
    throw new ConflictException('Could not allocate an invite code');
  }

  async get(workspaceId: string, role: WorkspaceRole): Promise<WorkspaceDetail> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return toDetail(workspace, role);
  }

  async rename(
    workspaceId: string,
    name: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceDetail> {
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { name },
    });
    return toDetail(workspace, role);
  }

  async remove(workspaceId: string): Promise<void> {
    // Anggota dan proyek ikut terhapus (onDelete: Cascade).
    await this.prisma.workspace.delete({ where: { id: workspaceId } });
    await this.realtime.revokeAccess(workspaceId);
  }

  async listMembers(workspaceId: string): Promise<Member[]> {
    const rows = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { name: true } } },
    });
    return rows
      .sort(
        (a, b) =>
          ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
          a.joinedAt.getTime() - b.joinedAt.getTime(),
      )
      .map(toMember);
  }

  async changeRole(
    workspaceId: string,
    targetUserId: string,
    role: 'ADMIN' | 'MEMBER',
  ): Promise<Member> {
    const key = { workspaceId_userId: { workspaceId, userId: targetUserId } };
    const target = await this.prisma.workspaceMember.findUnique({
      where: key,
    });
    if (!target) {
      throw new NotFoundException('Member not found');
    }
    if (target.role === WorkspaceRole.OWNER) {
      throw new BadRequestException('The owner role cannot be changed');
    }
    const updated = await this.prisma.workspaceMember.update({
      where: key,
      data: { role },
      include: { user: { select: { name: true } } },
    });
    return toMember(updated);
  }

  async removeMember(
    actorId: string,
    actorRole: WorkspaceRole,
    workspaceId: string,
    targetUserId: string,
  ): Promise<void> {
    const key = { workspaceId_userId: { workspaceId, userId: targetUserId } };
    const target = await this.prisma.workspaceMember.findUnique({
      where: key,
    });
    if (!target) {
      throw new NotFoundException('Member not found');
    }
    if (target.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException(
        'The owner cannot leave or be removed; delete the workspace instead',
      );
    }

    const isSelf = actorId === targetUserId;
    const allowed =
      isSelf ||
      actorRole === WorkspaceRole.OWNER ||
      (actorRole === WorkspaceRole.ADMIN &&
        target.role === WorkspaceRole.MEMBER);
    if (!allowed) {
      throw new ForbiddenException('Insufficient role');
    }

    await this.prisma.workspaceMember.delete({ where: key });
    // Soketnya dikeluarkan dari ruang papan kelompok ini agar tidak lagi
    // menerima peristiwa.
    await this.realtime.revokeAccess(workspaceId, targetUserId);
  }

  async regenerateInvite(workspaceId: string): Promise<InviteCodeResponse> {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      try {
        const workspace = await this.prisma.workspace.update({
          where: { id: workspaceId },
          data: { inviteCode: generateInviteCode() },
          select: { inviteCode: true },
        });
        return { inviteCode: workspace.inviteCode };
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
      }
    }
    throw new ConflictException('Could not allocate an invite code');
  }

  async previewInvite(code: string): Promise<InvitePreview> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { inviteCode: code },
      include: { _count: { select: { members: true } } },
    });
    if (!workspace) {
      throw new NotFoundException('Invite not found');
    }
    return {
      workspaceName: workspace.name,
      memberCount: workspace._count.members,
    };
  }

  async join(userId: string, code: string): Promise<JoinResponse> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { inviteCode: code },
      select: { id: true },
    });
    if (!workspace) {
      throw new NotFoundException('Invite not found');
    }
    // Sudah anggota: tidak diubah (peran lama dipertahankan).
    await this.prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
      create: {
        workspaceId: workspace.id,
        userId,
        role: WorkspaceRole.MEMBER,
      },
      update: {},
    });
    return { workspaceId: workspace.id };
  }
}
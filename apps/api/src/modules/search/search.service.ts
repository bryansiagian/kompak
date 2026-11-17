import { Injectable } from '@nestjs/common';
import type { SearchQuery, SearchResult } from '@kompak/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDate } from '../boards/board-mappers';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  // Dipanggil setelah WorkspaceMembershipGuard memastikan pemanggil anggota kelompok;
  // pencarian dibatasi pada proyek kelompok itu.
  async searchCards(
    workspaceId: string,
    query: SearchQuery,
  ): Promise<SearchResult[]> {
    const cards = await this.prisma.card.findMany({
      where: {
        archivedAt: null,
        list: { archivedAt: null },
        board: { workspaceId, archivedAt: null },
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
      select: {
        id: true,
        title: true,
        boardId: true,
        listId: true,
        assigneeId: true,
        dueDate: true,
        board: { select: { name: true } },
        list: { select: { name: true } },
      },
    });

    return cards.map((card) => ({
      cardId: card.id,
      title: card.title,
      boardId: card.boardId,
      boardName: card.board.name,
      listId: card.listId,
      listName: card.list.name,
      assigneeId: card.assigneeId,
      dueDate: formatDate(card.dueDate),
    }));
  }
}
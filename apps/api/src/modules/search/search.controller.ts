import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { searchQuerySchema } from '@kompak/shared';
import type { SearchQuery, SearchResult } from '@kompak/shared';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  Membership,
  WorkspaceAccess,
} from '../workspaces/workspace-access.decorator';
import type { WorkspaceMembership } from '../workspaces/workspace-request';
import { SearchService } from './search.service';

const ONE_MINUTE_MS = 60_000;

@Controller()
@UseGuards(RateLimitGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @WorkspaceAccess()
  @RateLimit({ limit: 30, windowMs: ONE_MINUTE_MS })
  @Get('workspaces/:workspaceId/search')
  searchCards(
    @Membership() membership: WorkspaceMembership,
    @Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQuery,
  ): Promise<SearchResult[]> {
    return this.search.searchCards(membership.workspaceId, query);
  }
}
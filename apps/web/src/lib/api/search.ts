import { searchResultListSchema } from '@kompak/shared';
import { apiRequest } from './client';
export function searchCards(workspaceId: string, q: string, limit = 20) {
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/search?q=${encodeURIComponent(q)}&limit=${limit}`, { schema: searchResultListSchema });
}
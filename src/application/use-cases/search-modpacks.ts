import type { ModrinthClient } from '@/infrastructure/net/api/modrinth-client';

/**
 * Search modpacks across Modrinth. Replaces v1's direct renderer fetch to
 * the Modrinth API.
 */
export class SearchModpacks {
  constructor(private readonly modrinth: ModrinthClient) {}

  async execute(query: string, limit = 20) {
    return this.modrinth.searchModpacks(query, limit);
  }
}

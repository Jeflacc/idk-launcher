import { describe, it, expect, vi } from 'vitest';
import { SearchModpacks } from '@/application/use-cases/search-modpacks';
import type { ModrinthClient } from '@/infrastructure/net/api/modrinth-client';

function mockModrinth(): ModrinthClient {
  return {
    searchModpacks: vi.fn().mockResolvedValue({
      hits: [
        { project_id: 'p1', title: 'Pack A' },
        { project_id: 'p2', title: 'Pack B' },
      ],
      total_hits: 2,
    }),
    searchMods: vi.fn(),
    getProject: vi.fn(),
    getVersions: vi.fn(),
  } as unknown as ModrinthClient;
}

describe('SearchModpacks', () => {
  it('delegates to the modrinth client', async () => {
    const modrinth = mockModrinth();
    const useCase = new SearchModpacks(modrinth);

    const result = await useCase.execute('skyblock', 10);

    expect(modrinth.searchModpacks).toHaveBeenCalledWith('skyblock', 10);
    expect(result.hits).toHaveLength(2);
  });

  it('passes through the limit', async () => {
    const modrinth = mockModrinth();
    const useCase = new SearchModpacks(modrinth);

    await useCase.execute('rpg', 5);

    expect(modrinth.searchModpacks).toHaveBeenCalledWith('rpg', 5);
  });

  it('returns empty results when the API returns none', async () => {
    const modrinth = mockModrinth();
    vi.mocked(modrinth.searchModpacks).mockResolvedValueOnce({ hits: [], total_hits: 0 });
    const useCase = new SearchModpacks(modrinth);

    const result = await useCase.execute('nonexistent');
    expect(result.hits).toHaveLength(0);
  });
});

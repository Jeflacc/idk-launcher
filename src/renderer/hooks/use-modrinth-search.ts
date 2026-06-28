import { useQuery } from '@tanstack/react-query';

interface ModrinthSearchResult {
  hits: Array<{
    project_id: string;
    slug: string;
    title: string;
    description: string;
    categories: string[];
    downloads: number;
    follows: number;
    icon_url: string | null;
    project_type: string;
  }>;
  total_hits: number;
}

/**
 * Search Modrinth modpacks. v1 called `fetch('https://api.modrinth.com/v2/search')`
 * directly from the renderer. v2 routes through the typed main-process
 * HttpClient (allowlisted, cached, retried) — but for read-only public search
 * we expose a thin server route. Since this sandbox has no Electron runtime,
 * the hook falls back to a direct (CORS-permitted) public call when the
 * preload bridge is unavailable.
 */
export function useModrinthSearch(query: string, limit = 24) {
  return useQuery({
    queryKey: ['modrinth', 'search', query, limit],
    queryFn: async (): Promise<ModrinthSearchResult> => {
      const facets = encodeURIComponent(JSON.stringify([['project_type:modpack']]));
      const url = `https://api.modrinth.com/v2/search?limit=${limit}&query=${encodeURIComponent(query)}&facets=${facets}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Modrinth search failed: ${res.status}`);
      return res.json();
    },
    enabled: query.trim().length > 0,
    staleTime: 60_000,
  });
}

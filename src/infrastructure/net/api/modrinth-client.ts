import { HttpClient } from '../http-client';

/**
 * Modrinth API client. Replaces v1's direct, unvalidated `fetch()` calls from
 * the renderer to `api.modrinth.com`.
 */
export interface ModrinthSearchHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  categories: string[];
  display_categories: string[];
  downloads: number;
  follows: number;
  icon_url: string | null;
  versions: string[];
  latest_version: string | null;
  project_type: 'mod' | 'modpack' | 'resourcepack' | 'shader';
  date_created: string;
  date_modified: string;
}

export interface ModrinthProject extends ModrinthSearchHit {
  client_side: 'required' | 'optional' | 'unsupported';
  server_side: 'required' | 'optional' | 'unsupported';
  license: { id: string; name: string; url?: string };
  source_url: string | null;
}

export interface ModrinthVersion {
  id: string;
  project_id: string;
  name: string;
  version_number: string;
  game_versions: string[];
  loaders: string[];
  files: {
    hashes: { sha1: string; sha512: string };
    url: string;
    filename: string;
    primary: boolean;
    size: number;
  }[];
  dependencies: { project_id: string; version_id?: string; dependency_type: string }[];
}

export class ModrinthClient {
  private readonly base = 'https://api.modrinth.com/v2';

  constructor(private readonly http: HttpClient) {}

  searchModpacks(query: string, loader: string | null = null, limit = 20, offset = 0, categories: string[] = [], gameVersion: string | null = null): Promise<{ hits: ModrinthSearchHit[]; total_hits: number }> {
    return this.searchProjects(query, 'modpack', loader, limit, offset, categories, gameVersion);
  }

  searchMods(query: string, loader: string | null, limit = 20, offset = 0, categories: string[] = [], gameVersion: string | null = null): Promise<{ hits: ModrinthSearchHit[]; total_hits: number }> {
    return this.searchProjects(query, 'mod', loader, limit, offset, categories, gameVersion);
  }

  searchShaders(query: string, limit = 20, offset = 0, categories: string[] = [], gameVersion: string | null = null): Promise<{ hits: ModrinthSearchHit[]; total_hits: number }> {
    return this.searchProjects(query, 'shader', null, limit, offset, categories, gameVersion);
  }

  searchResourcepacks(query: string, limit = 20, offset = 0, categories: string[] = [], gameVersion: string | null = null): Promise<{ hits: ModrinthSearchHit[]; total_hits: number }> {
    return this.searchProjects(query, 'resourcepack', null, limit, offset, categories, gameVersion);
  }

  searchProjects(query: string, projectType: string, loader: string | null, limit = 20, offset = 0, categories: string[] = [], gameVersion: string | null = null): Promise<{ hits: ModrinthSearchHit[]; total_hits: number }> {
    const facetsParts: string[][] = [[`project_type:${projectType}`]];
    if (loader) facetsParts.push([`categories:${loader}`]);
    for (const cat of categories) {
      facetsParts.push([`categories:${cat}`]);
    }
    if (gameVersion) facetsParts.push([`versions:${gameVersion}`]);
    const facets = JSON.stringify(facetsParts);
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    if (query) params.set('query', query);
    params.set('facets', facets);
    return this.http.getJson(`${this.base}/search?${params.toString()}`);
  }

  getProject(id: string): Promise<ModrinthProject> {
    return this.http.getJson(`${this.base}/project/${encodeURIComponent(id)}`);
  }

  getVersions(projectId: string, gameVersion?: string, loader?: string): Promise<ModrinthVersion[]> {
    const params = new URLSearchParams();
    if (gameVersion) params.set('game_versions', JSON.stringify([gameVersion]));
    if (loader) params.set('loaders', JSON.stringify([loader]));
    const qs = params.toString();
    return this.http.getJson(`${this.base}/project/${encodeURIComponent(projectId)}/version${qs ? `?${qs}` : ''}`);
  }
}

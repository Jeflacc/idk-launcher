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

  searchModpacks(query: string, limit = 20): Promise<{ hits: ModrinthSearchHit[]; total_hits: number }> {
    const facets = JSON.stringify([['project_type:modpack']]);
    const url = `${this.base}/search?limit=${limit}&query=${encodeURIComponent(query)}&facets=${encodeURIComponent(facets)}`;
    return this.http.getJson(url);
  }

  searchMods(query: string, loader: string | null, limit = 20): Promise<{ hits: ModrinthSearchHit[]; total_hits: number }> {
    const facetsParts: string[][] = [['project_type:mod']];
    if (loader) facetsParts.push([`categories:${loader}`]);
    const facets = JSON.stringify(facetsParts);
    const url = `${this.base}/search?limit=${limit}&query=${encodeURIComponent(query)}&facets=${encodeURIComponent(facets)}`;
    return this.http.getJson(url);
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

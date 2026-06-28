import { HttpClient } from '../http-client';

/**
 * CurseForge API client. CurseForge requires an API key; v1 leaked an
 * unauthenticated surface. The key is loaded from environment in the
 * infrastructure composition root and never reaches the renderer.
 */
export interface CurseforgeModpack {
  id: number;
  name: string;
  slug: string | null;
  summary: string;
  downloadCount: number;
  thumbnailUrl: string | null;
  latestFiles: CurseforgeFile[];
}

export interface CurseforgeFile {
  id: number;
  displayName: string;
  fileName: string;
  downloadUrl: string | null;
  fileDate: string;
  fileLength: number;
  gameVersions: string[];
}

export class CurseforgeClient {
  private readonly base = 'https://api.curseforge.com/v1';

  constructor(
    private readonly http: HttpClient,
    private readonly apiKey: string,
  ) {}

  private authedHeaders(): Record<string, string> {
    return { 'x-api-key': this.apiKey };
  }

  searchModpacks(query: string, pageSize = 20): Promise<{ data: CurseforgeModpack[] }> {
    const url = `${this.base}/mods/search?gameId=432&classId=4471&searchFilter=${encodeURIComponent(query)}&pageSize=${pageSize}`;
    return this.http.getJson(url, { headers: this.authedHeaders() });
  }

  getModpackFiles(modpackId: number): Promise<{ data: CurseforgeFile[] }> {
    return this.http.getJson(`${this.base}/mods/${modpackId}/files`, {
      headers: this.authedHeaders(),
    });
  }
}

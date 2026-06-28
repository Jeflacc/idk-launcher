import { HttpClient } from '../http-client';

/**
 * Mojang version manifest client. The manifest is a public, unauthenticated
 * JSON document. v1 fetched it directly from the renderer; here it goes
 * through the typed HttpClient (allowlisted + cached).
 */
import type { VersionManifest } from '@shared/types';

export class MojangClient {
  private readonly manifestUrl = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

  constructor(private readonly http: HttpClient) {}

  getManifest(): Promise<VersionManifest> {
    return this.http.getJson(this.manifestUrl);
  }
}

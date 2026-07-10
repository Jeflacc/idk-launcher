import { HttpClient } from '../http-client';

/**
 * Minotar API client. Provides Minecraft avatar/skin textures via minotar.net.
 * Used as a fallback when Ely.by skins are unavailable, and for offline-mode
 * accounts.
 *
 * Replaces v1's direct renderer-side fetches to https://minotar.net/skin/:name
 * which caused CORS issues and exposed skin URLs to the renderer.
 */
export class MinotarClient {
  private readonly base = 'https://minotar.net';

  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch a full skin PNG as a Buffer. The renderer converts this to base64
   * for canvas rendering of the Minecraft face.
   */
  fetchSkinBuffer(username: string): Promise<Buffer> {
    return this.http.getBuffer(`${this.base}/skin/${encodeURIComponent(username)}`);
  }

  /**
   * Fetch a helmet avatar (head + hat) as a Buffer.
   * Used for small avatar thumbnails in friend lists, chat headers, etc.
   */
  fetchAvatarBuffer(username: string, size = 64): Promise<Buffer> {
    return this.http.getBuffer(`${this.base}/helm/${encodeURIComponent(username)}/${size}`);
  }

  /** Fetch the Steve fallback avatar. */
  fetchSteveAvatar(size = 64): Promise<Buffer> {
    return this.http.getBuffer(`${this.base}/helm/MHF_Steve/${size}`);
  }
}

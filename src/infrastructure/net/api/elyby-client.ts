import { HttpClient } from '../http-client';

/**
 * Ely.by auth + skin API client. Replaces v1's inline auth flow inside the
 * 5,402-line electron-main.cjs.
 *
 * SECURITY: Ely.by auth endpoints are HTTPS-only. v1 also talked to a
 * plaintext HTTP backend at `api.somniac.me:6040` for "IDK Connect" — that
 * backend is out of scope for v2 until it provides HTTPS.
 */
export interface ElybyAuthResponse {
  access_token: string;
  client_token?: string;
  uuid: string;
  username: string;
  expires_in: number;
}

export interface ElybyOAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

export interface ElybyOAuthUserInfo {
  id: number;
  uuid: string;
  username: string;
  registeredAt: number;
  profileLink: string;
  preferredLanguage: string;
  email?: string;
}

export interface ElybyProfile {
  id: string;
  name: string;
  skins: { id: string; url: string; state: string }[];
}

export class ElybyClient {
  private readonly authBase = 'https://authserver.ely.by';
  private readonly accountBase = 'https://account.ely.by';

  constructor(private readonly http: HttpClient) {}

  authenticate(username: string, password: string): Promise<ElybyAuthResponse> {
    return this.http.getJson(`${this.authBase}/auth/authenticate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        agent: { name: 'Minecraft', version: 1 },
      }),
    });
  }

  refresh(accessToken: string, clientToken?: string): Promise<ElybyAuthResponse> {
    return this.http.getJson(`${this.authBase}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, client_token: clientToken }),
    });
  }

    /**
   * Fetch an Ely.by player's profile (id, name, active skin URL).
   *
   * Uses the skins system's Mojang-style endpoint
   * `skinsystem.ely.by/profile/{name}` — the legacy `api.ely.by/users/{name}`
   * JSON API no longer exists (404 on every request). The signed `textures`
   * property (base64 JSON) is decoded so callers get the same `skins` array
   * shape the old API returned. The texture URL inside the payload may be
   * plain HTTP (ely.by storage) — prefer `fetchSkinTextureUrl()` for
   * downloads.
   */
  async fetchProfile(username: string): Promise<ElybyProfile> {
    const raw = await this.http.getJson<{
      id: string;
      name: string;
      properties?: { name: string; value: string }[];
    }>(
      `https://skinsystem.ely.by/profile/${encodeURIComponent(username)}?unsigned=false`,
    );
    const texturesProp = raw.properties?.find((p) => p.name === 'textures');
    const skins: { id: string; url: string; state: string }[] = [];
    if (texturesProp?.value) {
      try {
        const decoded = JSON.parse(
          Buffer.from(texturesProp.value, 'base64').toString('utf8'),
        ) as { textures?: { SKIN?: { url?: string; metadata?: { model?: string } } } };
        const skinUrl = decoded.textures?.SKIN?.url;
        if (skinUrl) skins.push({ id: raw.id, url: skinUrl, state: 'ACTIVE' });
      } catch {
        // Malformed texture payload — leave skins empty rather than failing.
      }
    }
    return { id: raw.id, name: raw.name, skins };
  }

  /**
   * Proxy a skin texture through the main process to avoid renderer CORS.
   *
   * NOTE: this points at `skinsystem.ely.by`, NOT `skins.ely.by`. The legacy
   * `skins.ely.by/skins/{name}.png` host returns 404 for every request and
   * `api.ely.by/users/{name}` no longer exists, so both of those endpoints
   * are dead. `skinsystem.ely.by/skins/{name}.png` is the supported skins
   * system endpoint (case-insensitive name, proxies Mojang when the name is
   * a premium user, 404/no content when the skin is missing).
   */
  fetchSkinTextureUrl(username: string): string {
    return `https://skinsystem.ely.by/skins/${encodeURIComponent(username)}.png`;
  }

  exchangeOAuthCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<ElybyOAuthTokenResponse> {
    return this.http.getJson(`${this.accountBase}/api/oauth2/v1/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code,
      }).toString(),
    });
  }

  fetchOAuthUserInfo(accessToken: string): Promise<ElybyOAuthUserInfo> {
    return this.http.getJson(`${this.accountBase}/api/account/v1/info`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  refreshOAuthToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
  ): Promise<ElybyOAuthTokenResponse> {
    return this.http.getJson(`${this.accountBase}/api/oauth2/v1/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });
  }
}

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

export interface ElybyProfile {
  id: string;
  name: string;
  skins: { id: string; url: string; state: string }[];
}

export class ElybyClient {
  private readonly authBase = 'https://authserver.ely.by';
  private readonly apiBase = 'https://api.ely.by';

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

  fetchProfile(username: string): Promise<ElybyProfile> {
    return this.http.getJson(`${this.apiBase}/users/${encodeURIComponent(username)}`);
  }

  /** Proxy a skin texture through the main process to avoid renderer CORS. */
  fetchSkinTextureUrl(username: string): string {
    return `https://skins.ely.by/skins/${encodeURIComponent(username)}.png`;
  }
}

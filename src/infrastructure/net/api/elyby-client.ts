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

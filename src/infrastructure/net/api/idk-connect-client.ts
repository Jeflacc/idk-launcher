import { HttpClient } from '../http-client';

/**
 * IDK Connect backend client.
 *
 * Wraps all calls to the IDK Connect social backend at https://api.somniac.me.
 * Replaces v1's direct fetch() calls from the renderer (which stored JWTs in
 * localStorage and sent them over plaintext HTTP).
 *
 * SECURITY:
 *   - HTTPS only. The v1 http://api.somniac.me:6040 endpoint is refused.
 *   - The token is NOT stored in this client. The caller (IPC handler) reads
 *     it from SecretStore and passes it to the method that needs it.
 *   - The renderer never sees the token.
 */

const DEFAULT_IDK_CONNECT_BASE = 'https://api.somniac.me';

// ── Types ──────────────────────────────────────────────────────────────────

export interface IdkUser {
  id: string;
  username: string;
  email?: string;
  status: 'online' | 'offline' | 'idle';
  bio: string;
  avatar?: string;
  oauthProvider?: 'discord' | 'google';
  linkedMinecraftAccount?: { username: string; authMode: string };
  twoFactorEnabled?: boolean;
  lastSeen?: number;
}

export interface IdkUserProfile {
  id: string;
  username: string;
  bio: string;
  avatar?: string;
  status: 'online' | 'offline' | 'idle';
  oauthProvider?: 'discord' | 'google';
  linkedMinecraftAccount?: { username: string; authMode: string };
}

export interface Friend extends IdkUser {
  unreadCount?: number;
  playingVersion?: string | null;
  cloudflaredUrl?: string | null;
}

export interface FriendRequest {
  requestId: string;
  senderId: string;
  username: string;
  avatar?: string;
}

export interface IdkMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface AuthResult {
  token: string;
  user: IdkUser;
}

export interface LoginResult {
  token?: string;
  user?: IdkUser;
  requires2fa?: boolean;
}

// ── Client ─────────────────────────────────────────────────────────────────

export class IdkConnectClient {
  private readonly base: string;

  constructor(
    private readonly http: HttpClient,
    baseUrl?: string,
  ) {
    this.base = baseUrl ?? DEFAULT_IDK_CONNECT_BASE;
  }

  // ── Auth ────────────────────────────────────────────────────────────────

  requestOtp(email: string, username: string): Promise<void> {
    return this.http.getJson(`${this.base}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, username }),
    });
  }

  register(username: string, email: string, password: string, otp: string): Promise<AuthResult> {
    return this.http.getJson(`${this.base}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, email, password, otp }),
    });
  }

  login(username: string, password: string): Promise<LoginResult> {
    return this.http.getJson(`${this.base}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  }

  verify2fa(username: string, password: string, otp: string): Promise<AuthResult> {
    return this.http.getJson(`${this.base}/api/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password, otp }),
    });
  }

  getMe(token: string): Promise<IdkUser> {
    return this.http.getJson(`${this.base}/api/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
  }

  loginWithMinecraft(minecraftUsername: string, authMode: string): Promise<AuthResult> {
    return this.http.getJson(`${this.base}/api/auth/login-minecraft`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ minecraftUsername, authMode }),
    });
  }

  // ── OAuth ───────────────────────────────────────────────────────────────

  getDiscordOAuthUrl(linkToken?: string): string {
    const url = `${this.base}/api/auth/discord`;
    return linkToken ? `${url}?link_token=${encodeURIComponent(linkToken)}` : url;
  }

  getGoogleOAuthUrl(linkToken?: string): string {
    const url = `${this.base}/api/auth/google`;
    return linkToken ? `${url}?link_token=${encodeURIComponent(linkToken)}` : url;
  }

  completeOAuth(session: string, username: string): Promise<{ token: string }> {
    return this.http.getJson(`${this.base}/api/auth/oauth-complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session, username }),
    });
  }

  // ── Settings ────────────────────────────────────────────────────────────

  updateProfile(token: string, bio: string): Promise<void> {
    return this.http.getJson(`${this.base}/api/auth/profile`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ bio }),
    });
  }

  changeUsername(token: string, newUsername: string): Promise<{ token: string; user: IdkUser }> {
    return this.http.getJson(`${this.base}/api/auth/settings/username`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ newUsername }),
    });
  }

  changePassword(token: string, oldPassword: string, newPassword: string): Promise<void> {
    return this.http.getJson(`${this.base}/api/auth/settings/password`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  deleteAccount(token: string): Promise<void> {
    return this.http.getJson(`${this.base}/api/auth/settings/account`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });
  }

  requestSecurityOtp(token: string): Promise<void> {
    return this.http.getJson(`${this.base}/api/auth/request-otp-security`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });
  }

  updateSecurity(token: string, newPassword: string, twoFactorEnabled: boolean, otp: string): Promise<void> {
    return this.http.getJson(`${this.base}/api/auth/security`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ newPassword, twoFactorEnabled, otp }),
    });
  }

  linkMinecraft(token: string, minecraftUsername: string, authMode: string): Promise<void> {
    return this.http.getJson(`${this.base}/api/auth/link-minecraft`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ minecraftUsername, authMode }),
    });
  }

  // ── Users ───────────────────────────────────────────────────────────────

  searchUsers(token: string, query: string): Promise<IdkUser[]> {
    const url = `${this.base}/api/users/search?q=${encodeURIComponent(query)}`;
    return this.http.getJson(url, {
      headers: { authorization: `Bearer ${token}` },
    });
  }

  getUserProfile(token: string, username: string): Promise<{ profile: IdkUserProfile }> {
    return this.http.getJson(`${this.base}/api/users/${encodeURIComponent(username)}/profile`, {
      headers: { authorization: `Bearer ${token}` },
    });
  }

  // ── Friends ─────────────────────────────────────────────────────────────

  getFriends(token: string): Promise<{ friends: Friend[] }> {
    return this.http.getJson(`${this.base}/api/friends`, {
      headers: { authorization: `Bearer ${token}` },
    });
  }

  getFriendRequests(token: string): Promise<{ requests: FriendRequest[] }> {
    return this.http.getJson(`${this.base}/api/friends/requests`, {
      headers: { authorization: `Bearer ${token}` },
    });
  }

  sendFriendRequest(token: string, username: string): Promise<void> {
    return this.http.getJson(`${this.base}/api/friends/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ username }),
    });
  }

  handleFriendRequest(token: string, requestId: string, accept: boolean): Promise<void> {
    return this.http.getJson(`${this.base}/api/friends/requests/handle`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ requestId, accept }),
    });
  }

  removeFriend(token: string, friendId: string): Promise<void> {
    return this.http.getJson(`${this.base}/api/friends/${encodeURIComponent(friendId)}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });
  }

  // ── Messages ────────────────────────────────────────────────────────────

  getMessages(token: string, friendId: string, limit = 50): Promise<{ messages: IdkMessage[] }> {
    return this.http.getJson(
      `${this.base}/api/messages/${encodeURIComponent(friendId)}?limit=${limit}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
  }

  sendMessage(token: string, friendId: string, text: string): Promise<{ message: IdkMessage }> {
    return this.http.getJson(`${this.base}/api/messages/${encodeURIComponent(friendId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ text }),
    });
  }

  // ── Presence ────────────────────────────────────────────────────────────

  sendPresence(
    token: string,
    status: string,
    playingVersion?: string,
    cloudflaredUrl?: string,
  ): Promise<void> {
    return this.http.getJson(`${this.base}/api/presence`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, playingVersion, cloudflaredUrl }),
    });
  }

  // ── Skins (CORS proxy) ──────────────────────────────────────────────────

  /**
   * Fetch an Ely.by skin texture through the backend to bypass CORS.
   * Returns a Buffer that the renderer can convert to base64 for canvas rendering.
   */
  fetchElybySkinBuffer(username: string): Promise<Buffer> {
    return this.http.getBuffer(`${this.base}/api/skins/elyby/${encodeURIComponent(username)}`);
  }
}

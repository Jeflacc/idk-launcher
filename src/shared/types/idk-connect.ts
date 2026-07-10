/**
 * IDK Connect shared types.
 *
 * These types mirror the responses from the IDK Connect backend at
 * https://api.somniac.me. The renderer imports these for type-safe IPC calls.
 */

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

export interface IdkAuthSession {
  token: string;
  user: IdkUser;
}

export interface IdkLoginResult {
  token?: string;
  user?: IdkUser;
  requires2fa?: boolean;
}

export type IdkPresenceStatus = 'online' | 'offline' | 'idle';

export interface IdkPresencePayload {
  status: IdkPresenceStatus;
  playingVersion?: string;
  cloudflaredUrl?: string;
}

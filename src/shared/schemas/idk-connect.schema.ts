import { z } from 'zod';

/**
 * Zod validation schemas for IDK Connect IPC channels.
 * Every IPC handler validates its arguments against these schemas.
 */

const zVoid = z.unknown().optional();

// ── Auth schemas ───────────────────────────────────────────────────────────

export const IdkConnectSchema = {
  requestOtp: z.object({
    email: z.string().email(),
    username: z.string().min(3).max(16),
  }),

  register: z.object({
    username: z.string().min(3).max(16),
    email: z.string().email(),
    password: z.string().min(4),
    otp: z.string().min(4),
  }),

  login: z.object({
    username: z.string(),
    password: z.string(),
  }),

  verify2fa: z.object({
    username: z.string(),
    password: z.string(),
    otp: z.string(),
  }),

  loginWithMinecraft: z.object({
    minecraftUsername: z.string(),
    authMode: z.string(),
  }),

  getMe: zVoid,

  // OAuth
  getDiscordOAuthUrl: z.object({ linkToken: z.string().optional() }).optional(),
  getGoogleOAuthUrl: z.object({ linkToken: z.string().optional() }).optional(),
  completeOAuth: z.object({
    session: z.string(),
    username: z.string().min(3).max(16),
  }),

  // Settings
  updateProfile: z.object({ bio: z.string().max(255) }),
  changeUsername: z.object({ newUsername: z.string().min(3).max(16) }),
  changePassword: z.object({
    oldPassword: z.string(),
    newPassword: z.string().min(4),
  }),
  deleteAccount: zVoid,
  requestSecurityOtp: zVoid,
  updateSecurity: z.object({
    newPassword: z.string(),
    twoFactorEnabled: z.boolean(),
    otp: z.string(),
  }),
  linkMinecraft: z.object({
    minecraftUsername: z.string(),
    authMode: z.string(),
  }),

  // Users
  searchUsers: z.object({ query: z.string() }),
  getUserProfile: z.object({ username: z.string() }),

  // Friends
  getFriends: zVoid,
  getFriendRequests: zVoid,
  sendFriendRequest: z.object({ username: z.string() }),
  handleFriendRequest: z.object({
    requestId: z.string(),
    accept: z.boolean(),
  }),
  removeFriend: z.object({ friendId: z.string() }),

  // Messages
  getMessages: z.object({
    friendId: z.string(),
    limit: z.number().optional(),
  }),
  sendMessage: z.object({
    friendId: z.string(),
    text: z.string(),
  }),

  // Presence
  sendPresence: z.object({
    status: z.string(),
    playingVersion: z.string().optional(),
    cloudflaredUrl: z.string().optional(),
  }),

  // Token management
  getStoredSession: zVoid,
  storeToken: z.object({
    token: z.string(),
    username: z.string(),
  }),
  clearToken: zVoid,
} as const;

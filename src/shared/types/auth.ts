import type { z } from 'zod';
import type { AuthSchema } from '../schemas/auth.schema';

export type MicrosoftAccount = z.infer<typeof AuthSchema.microsoftAccount>;
export type ElybyAccount = z.infer<typeof AuthSchema.elybyAccount>;
export type AuthSession = z.infer<typeof AuthSchema.session>;
export type AuthProvider = 'microsoft' | 'elyby';

export interface AuthState {
  session: AuthSession | null;
  status: 'anonymous' | 'authenticating' | 'authenticated' | 'error';
  error: string | null;
}

/** Account providers supported by the launcher (offline = cracked). */
export type AccountProvider = 'microsoft' | 'elyby' | 'offline';

/**
 * Full account record as persisted in the encrypted SecretStore.
 * Contains tokens for premium providers — NEVER send this to the renderer.
 */
export interface StoredAccount {
  id: string;
  provider: AccountProvider;
  username: string;
  uuid: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  addedAt: number;
}

/** Sanitized account — safe to expose over IPC to the renderer. */
export interface AccountInfo {
  id: string;
  provider: AccountProvider;
  username: string;
  uuid: string;
  addedAt: number;
}

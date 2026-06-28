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

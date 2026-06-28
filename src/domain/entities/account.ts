import type { AuthProvider } from '@shared/types';

/**
 * Account aggregate. Tokens live ONLY in the infrastructure secret store
 * (safeStorage); the domain entity never carries secrets. This is the
 * correction for v1's plaintext-token-in-settings.json regression.
 */
export class AccountEntity {
  constructor(
    public readonly provider: AuthProvider,
    public readonly username: string,
    public readonly uuid: string,
    public readonly authenticatedAt: number = Date.now(),
  ) {}

  get isMicrosoft(): boolean {
    return this.provider === 'microsoft';
  }

  get isElyby(): boolean {
    return this.provider === 'elyby';
  }
}

import type { ElybyClient } from '@/infrastructure/net/api/elyby-client';
import type { SecretStore } from '@/infrastructure/crypto/secret-store';
import { AccountEntity } from '@/domain/entities/account';

/**
 * Authenticate against Ely.by. Replaces v1's inline auth flow inside the
 * 5,402-line electron-main.cjs. Tokens are persisted ONLY to the encrypted
 * SecretStore (never to settings.json).
 */
export class AuthenticateElyby {
  constructor(
    private readonly elyby: ElybyClient,
    private readonly secrets: SecretStore,
  ) {}

  async execute(username: string, password: string): Promise<AccountEntity> {
    const res = await this.elyby.authenticate(username, password);
    const account = new AccountEntity('elyby', res.username, res.uuid);
    const current = await this.secrets.load();
    await this.secrets.save({
      ...current,
      elyby: {
        accessToken: res.access_token,
        username: res.username,
        uuid: res.uuid,
        expiresAt: Date.now() + res.expires_in * 1000,
      },
    });
    return account;
  }
}

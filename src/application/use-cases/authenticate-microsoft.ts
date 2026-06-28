import * as msmc from 'msmc';
import type { SecretStore } from '@/infrastructure/crypto/secret-store';
import { AccountEntity } from '@/domain/entities/account';

/**
 * Authenticate against Microsoft via msmc. Replaces v1's inline flow.
 *
 * NOTE: Interactive popup / device-code auth requires the Electron shell to be
 * running (BrowserWindow for the popup). The exact msmc v5 method surface
 * (`MSA.getInteractive` / `Xbox.wrap`) must be verified against the installed
 * version in an Electron runtime.
 */
export class AuthenticateMicrosoft {
  constructor(private readonly secrets: SecretStore) {}

  async execute(interactive = true): Promise<AccountEntity> {
    const msa = (msmc as unknown as {
      MSA: {
        getInteractive: (id: string) => Promise<{ accessToken?: string; refreshToken?: string }>;
        getDeviceCode: (id: string) => Promise<{ accessToken?: string; refreshToken?: string }>;
      };
      Xbox: { wrap: (r: { accessToken?: string; refreshToken?: string }) => Promise<{ getMinecraft: () => Promise<{ mcToken: { accessToken: string; expires_in?: number; profile: { name: string; id: string } } }> }> };
    });
    const result = interactive
      ? await msa.MSA.getInteractive('idk-launcher')
      : await msa.MSA.getDeviceCode('idk-launcher');
    if (!result.accessToken) throw new Error('Microsoft auth returned no access token');
    const xbox = await msa.Xbox.wrap(result);
    const mc = await xbox.getMinecraft();
    const account = new AccountEntity('microsoft', mc.mcToken.profile.name, mc.mcToken.profile.id);

    const current = await this.secrets.load();
    await this.secrets.save({
      ...current,
      microsoft: {
        accessToken: mc.mcToken.accessToken,
        refreshToken: result.refreshToken ?? '',
        expiresAt: Date.now() + (mc.mcToken.expires_in ?? 86400) * 1000,
        username: mc.mcToken.profile.name,
        uuid: mc.mcToken.profile.id,
      },
    });
    return account;
  }
}

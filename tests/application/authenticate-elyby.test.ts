import { describe, it, expect, vi } from 'vitest';
import { AuthenticateElyby } from '@/application/use-cases/authenticate-elyby';
import type { ElybyClient } from '@/infrastructure/net/api/elyby-client';
import type { SecretStore } from '@/infrastructure/crypto/secret-store';

function mockElyby(): ElybyClient {
  return {
    authenticate: vi.fn().mockResolvedValue({
      access_token: 'elyby-tok',
      uuid: 'elyby-uuid',
      username: 'Steve',
      expires_in: 86400,
    }),
    refresh: vi.fn(),
    fetchProfile: vi.fn(),
    fetchSkinTextureUrl: vi.fn(),
  } as unknown as ElybyClient;
}

function mockSecretStore(initial: Record<string, unknown> = {}): SecretStore {
  let state = initial;
  return {
    load: vi.fn(async () => state),
    save: vi.fn(async (secrets: Record<string, unknown>) => {
      state = secrets;
    }),
    clear: vi.fn(async () => {
      state = {};
    }),
  } as unknown as SecretStore;
}

describe('AuthenticateElyby', () => {
  it('authenticates and returns an AccountEntity', async () => {
    const elyby = mockElyby();
    const secrets = mockSecretStore();
    const useCase = new AuthenticateElyby(elyby, secrets);

    const account = await useCase.execute('Steve', 'password');

    expect(account.username).toBe('Steve');
    expect(account.uuid).toBe('elyby-uuid');
    expect(account.provider).toBe('elyby');
  });

  it('persists the access token to the secret store', async () => {
    const elyby = mockElyby();
    const secrets = mockSecretStore();
    const useCase = new AuthenticateElyby(elyby, secrets);

    await useCase.execute('Steve', 'password');

    expect(secrets.save).toHaveBeenCalled();
    const saved = vi.mocked(secrets.save).mock.calls[0]![0];
    expect(saved.elyby).toBeDefined();
    expect(saved.elyby.accessToken).toBe('elyby-tok');
  });

  it('merges with existing secrets (does not overwrite microsoft)', async () => {
    const elyby = mockElyby();
    const secrets = mockSecretStore({ microsoft: { accessToken: 'ms-tok' } });
    const useCase = new AuthenticateElyby(elyby, secrets);

    await useCase.execute('Steve', 'password');

    const saved = vi.mocked(secrets.save).mock.calls[0]![0];
    expect(saved.microsoft).toBeDefined();
    expect(saved.microsoft.accessToken).toBe('ms-tok');
    expect(saved.elyby).toBeDefined();
  });

  it('propagates authentication errors', async () => {
    const elyby = mockElyby();
    vi.mocked(elyby.authenticate).mockRejectedValue(new Error('Invalid credentials'));
    const secrets = mockSecretStore();
    const useCase = new AuthenticateElyby(elyby, secrets);

    await expect(useCase.execute('Steve', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});

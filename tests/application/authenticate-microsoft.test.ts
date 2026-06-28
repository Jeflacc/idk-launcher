import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted. Use vi.hoisted so the factory can reference the mock.
const { msmcMock } = vi.hoisted(() => ({
  msmcMock: {
    MSA: {
      getInteractive: vi.fn(),
      getDeviceCode: vi.fn(),
    },
    Xbox: { wrap: vi.fn() },
  },
}));

vi.mock('msmc', () => ({
  MSA: msmcMock.MSA,
  Xbox: msmcMock.Xbox,
}));

const { AuthenticateMicrosoft } = await import('@/application/use-cases/authenticate-microsoft');
const { SecretStore } = await import('@/infrastructure/crypto/secret-store');

// We can't use the real SecretStore (needs electron safeStorage), so mock it.
vi.mock('@/infrastructure/crypto/secret-store', () => ({
  SecretStore: vi.fn().mockImplementation((filePath: string) => ({
    filePath,
    load: vi.fn().mockResolvedValue({}),
    save: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  })),
}));

function makeSecretStore() {
  const state: Record<string, unknown> = {};
  return {
    load: vi.fn(async () => state),
    save: vi.fn(async (s: Record<string, unknown>) => Object.assign(state, s)),
  } as unknown as InstanceType<typeof SecretStore>;
}

describe('AuthenticateMicrosoft', () => {
  let secrets: InstanceType<typeof SecretStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    secrets = makeSecretStore();

    msmcMock.MSA.getInteractive.mockResolvedValue({
      accessToken: 'ms-tok',
      refreshToken: 'ms-ref',
    });
    msmcMock.Xbox.wrap.mockResolvedValue({
      getMinecraft: vi.fn().mockResolvedValue({
        mcToken: {
          accessToken: 'mc-tok',
          expires_in: 86400,
          profile: { name: 'Steve', id: 'uuid-1' },
        },
      }),
    });
  });

  it('authenticates and returns an AccountEntity', async () => {
    const useCase = new AuthenticateMicrosoft(secrets);
    const account = await useCase.execute(true);

    expect(account.username).toBe('Steve');
    expect(account.uuid).toBe('uuid-1');
    expect(account.provider).toBe('microsoft');
  });

  it('persists tokens to the secret store', async () => {
    const useCase = new AuthenticateMicrosoft(secrets);
    await useCase.execute(true);

    expect(secrets.save).toHaveBeenCalled();
    const saved = vi.mocked(secrets.save).mock.calls[0]![0];
    expect(saved.microsoft).toBeDefined();
    expect(saved.microsoft.accessToken).toBe('mc-tok');
    expect(saved.microsoft.refreshToken).toBe('ms-ref');
  });

  it('throws when msmc returns no access token', async () => {
    msmcMock.MSA.getInteractive.mockResolvedValue({});
    const useCase = new AuthenticateMicrosoft(secrets);
    await expect(useCase.execute(true)).rejects.toThrow(/no access token/);
  });
});

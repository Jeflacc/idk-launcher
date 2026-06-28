import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron's safeStorage for the SecretStore.
const mockEncrypt = vi.fn((s: string) => Buffer.from(Buffer.from(s).toString('base64')));
const mockDecrypt = vi.fn((b: Buffer) => Buffer.from(b.toString('utf8'), 'base64').toString('utf8'));
const mockIsEncryptionAvailable = vi.fn(() => true);

vi.mock('electron', () => ({
  safeStorage: {
    encryptString: mockEncrypt,
    decryptString: mockDecrypt,
    isEncryptionAvailable: mockIsEncryptionAvailable,
  },
}));

const { SecretStore } = await import('@/infrastructure/crypto/secret-store');
const { readFile, writeFile, mkdir, rm } = await import('node:fs/promises');
const { join } = await import('node:path');
const os = await import('node:os');
const path = await import('node:path');

function tmpFile(): string {
  return join(os.tmpdir(), `idk-test-secrets-${Date.now()}-${Math.random().toString(36).slice(2)}.enc`);
}

describe('SecretStore', () => {
  let store: InstanceType<typeof SecretStore>;
  let filePath: string;

  beforeEach(() => {
    filePath = tmpFile();
    store = new SecretStore(filePath);
    mockEncrypt.mockClear();
    mockDecrypt.mockClear();
    mockIsEncryptionAvailable.mockReturnValue(true);
  });

  afterEach(async () => {
    await rm(filePath, { force: true });
  });

  it('load returns empty object when file does not exist', async () => {
    const r = await store.load();
    expect(r).toEqual({});
  });

  it('save encrypts and writes to disk, load decrypts', async () => {
    const secrets = {
      microsoft: {
        accessToken: 'ms-tok',
        refreshToken: 'ms-ref',
        expiresAt: 999,
        username: 'Steve',
        uuid: 'uuid-1',
      },
    };
    await store.save(secrets);
    expect(mockEncrypt).toHaveBeenCalledWith(JSON.stringify(secrets));

    // The file on disk should contain encrypted bytes, not plaintext.
    const raw = await readFile(filePath);
    expect(raw.toString('utf8')).not.toContain('ms-tok');
    expect(raw.toString('utf8')).not.toContain('accessToken');

    const loaded = await store.load();
    expect(loaded.microsoft?.accessToken).toBe('ms-tok');
  });

  it('clear saves an empty object', async () => {
    await store.save({ elyby: { accessToken: 't', username: 'u', uuid: 'v', expiresAt: 1 } });
    await store.clear();
    const loaded = await store.load();
    expect(loaded).toEqual({});
  });

  it('throws when safeStorage is unavailable', async () => {
    mockIsEncryptionAvailable.mockReturnValue(false);
    await expect(store.load()).rejects.toThrow(/safeStorage encryption is unavailable/);
    await expect(store.save({})).rejects.toThrow(/safeStorage encryption is unavailable/);
  });

  it('a later save overwrites an earlier save (merge is the use-case layer\'s job)', async () => {
    await store.save({ microsoft: { accessToken: 'a', refreshToken: 'r', expiresAt: 1, username: 'u', uuid: 'v' } });
    await store.save({ elyby: { accessToken: 'e', username: 'eu', uuid: 'ev', expiresAt: 2 } });
    const loaded = await store.load();
    // The store itself does NOT merge — the use-case layer reads, spreads, then saves.
    expect(loaded.microsoft).toBeUndefined();
    expect(loaded.elyby?.accessToken).toBe('e');
  });
});

// Need to import afterEach
import { afterEach } from 'vitest';

import { safeStorage } from 'electron';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Encrypted secret store. This is the CORRECTION for v1's most critical
 * security regression: Microsoft and Ely.by auth tokens were persisted in
 * plaintext inside `settings.json`. Electron's `safeStorage` uses the OS
 * keychain (DPAPI on Windows, Keychain on macOS, libsecret on Linux) to
 * encrypt at rest.
 *
 * The renderer NEVER sees tokens. It only receives a boolean "is authenticated".
 */
export interface PersistedSecrets {
  microsoft?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    username: string;
    uuid: string;
  };
  elyby?: {
    accessToken: string;
    username: string;
    uuid: string;
    expiresAt: number;
  };
  connectTunnelToken?: string;
}

export class SecretStore {
  constructor(private readonly secretsFilePath: string) {}

  async load(): Promise<PersistedSecrets> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage encryption is unavailable on this platform');
    }
    let encrypted: Buffer;
    try {
      encrypted = await readFile(this.secretsFilePath);
    } catch {
      return {};
    }
    if (encrypted.length === 0) return {};
    const decrypted = safeStorage.decryptString(encrypted);
    return JSON.parse(decrypted) as PersistedSecrets;
  }

  async save(secrets: PersistedSecrets): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage encryption is unavailable on this platform');
    }
    const plaintext = JSON.stringify(secrets);
    const encrypted = safeStorage.encryptString(plaintext);
    await mkdir(dirname(this.secretsFilePath), { recursive: true });
    await writeFile(this.secretsFilePath, encrypted);
  }

  async clear(): Promise<void> {
    await this.save({});
  }
}

import { safeStorage } from 'electron';
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
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
    refreshToken?: string;
    username: string;
    uuid: string;
    expiresAt: number;
  };
  /** IDK Connect JWT token (for the social backend at api.somniac.me). */
  idkConnect?: {
    token: string;
    username: string;
    expiresAt?: number;
  };
  connectTunnelToken?: string;
}

export class SecretStore {
  constructor(private readonly secretsFilePath: string) {}

  async load(): Promise<PersistedSecrets> {
    if (!safeStorage.isEncryptionAvailable()) {
      // Encryption unavailable (e.g. headless Linux) — return empty secrets
      // rather than crashing. The app will function without persisted tokens.
      console.warn('[SecretStore] safeStorage encryption is unavailable — running without persisted secrets');
      return {};
    }
    let encrypted: Buffer;
    try {
      encrypted = await readFile(this.secretsFilePath);
    } catch {
      return {};
    }
    if (encrypted.length === 0) return {};

    try {
      const decrypted = safeStorage.decryptString(encrypted);
      return JSON.parse(decrypted) as PersistedSecrets;
    } catch (err) {
      // Decryption failed — the file was encrypted with a different
      // safeStorage key (different Electron build, OS keychain reset,
      // or corrupted file). Delete the stale file so the app can
      // start fresh instead of crashing every time.
      console.warn('[SecretStore] Failed to decrypt secrets file — clearing stale data:', (err as Error).message);
      try {
        await unlink(this.secretsFilePath);
      } catch {
        // File may already be gone — ignore
      }
      return {};
    }
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

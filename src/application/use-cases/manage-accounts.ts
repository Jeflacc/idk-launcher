import { randomUUID } from 'node:crypto';
import type { SecretStore, PersistedSecrets } from '@/infrastructure/crypto/secret-store';
import type { AccountInfo, StoredAccount } from '@shared/types';
import { offlineUuid } from '@/domain/services/offline-uuid';

const sanitize = (a: StoredAccount): AccountInfo => ({
  id: a.id,
  provider: a.provider,
  username: a.username,
  uuid: a.uuid,
  addedAt: a.addedAt,
});

/**
 * Multi-account management. Accounts of every provider (Microsoft, Ely.by,
 * offline) are stored encrypted in the SecretStore; the renderer only ever
 * receives sanitized `AccountInfo` records (no tokens).
 *
 * Legacy single-session keys (`microsoft` / `elyby`) are mirrored from the
 * active account so older consumers (skin upload, profile fetch) keep working.
 */
export class ManageAccounts {
  constructor(private readonly secrets: SecretStore) {}

  /** Load secrets, migrating legacy single-session keys into the accounts list. */
  private async loadMigrated(): Promise<PersistedSecrets> {
    const s = await this.secrets.load();
    if (!Array.isArray(s.accounts)) {
      const accounts: StoredAccount[] = [];
      if (s.microsoft) {
        accounts.push({
          id: randomUUID(),
          provider: 'microsoft',
          username: s.microsoft.username,
          uuid: s.microsoft.uuid,
          accessToken: s.microsoft.accessToken,
          refreshToken: s.microsoft.refreshToken,
          expiresAt: s.microsoft.expiresAt,
          addedAt: Date.now(),
        });
      }
      if (s.elyby) {
        accounts.push({
          id: randomUUID(),
          provider: 'elyby',
          username: s.elyby.username,
          uuid: s.elyby.uuid,
          accessToken: s.elyby.accessToken,
          refreshToken: s.elyby.refreshToken,
          expiresAt: s.elyby.expiresAt,
          addedAt: Date.now(),
        });
      }
      s.accounts = accounts;
      s.activeAccountId = accounts[0]?.id ?? null;
      await this.secrets.save(s);
    }
    return s;
  }

  /** All accounts (sanitized — no tokens) plus the active account id. */
  async list(): Promise<{ accounts: AccountInfo[]; activeAccountId: string | null }> {
    const s = await this.loadMigrated();
    return {
      accounts: (s.accounts ?? []).map(sanitize),
      activeAccountId: s.activeAccountId ?? null,
    };
  }

  /** The active account (sanitized) or null. */
  async getActive(): Promise<AccountInfo | null> {
    const s = await this.loadMigrated();
    const active = (s.accounts ?? []).find((a) => a.id === s.activeAccountId) ?? null;
    return active ? sanitize(active) : null;
  }

  /** Full account record including tokens — internal use only, never IPC. */
  async getAccount(accountId: string): Promise<StoredAccount | null> {
    const s = await this.loadMigrated();
    return (s.accounts ?? []).find((a) => a.id === accountId) ?? null;
  }

  /** Add an offline account (or re-activate an existing one) and make it active. */
  async addOffline(username: string): Promise<AccountInfo> {
    const s = await this.loadMigrated();
    const name = username.trim();
    const existing = (s.accounts ?? []).find(
      (a) => a.provider === 'offline' && a.username.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      s.activeAccountId = existing.id;
      await this.secrets.save(s);
      return sanitize(existing);
    }
    const account: StoredAccount = {
      id: randomUUID(),
      provider: 'offline',
      username: name,
      uuid: offlineUuid(name),
      addedAt: Date.now(),
    };
    s.accounts = [...(s.accounts ?? []), account];
    s.activeAccountId = account.id;
    this.syncLegacyKeys(s);
    await this.secrets.save(s);
    return sanitize(account);
  }

  /** Add/update a premium account from a fresh session and make it active. */
  async addSession(
    provider: 'microsoft' | 'elyby',
    session: { accessToken: string; refreshToken?: string; expiresAt?: number; username: string; uuid: string },
  ): Promise<AccountInfo> {
    const s = await this.loadMigrated();
    const existing = (s.accounts ?? []).find(
      (a) =>
        a.provider === provider &&
        (a.uuid === session.uuid || a.username.toLowerCase() === session.username.toLowerCase()),
    );
    let account: StoredAccount;
    if (existing) {
      account = {
        ...existing,
        username: session.username,
        uuid: session.uuid,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
      };
      s.accounts = (s.accounts ?? []).map((a) => (a.id === existing.id ? account : a));
    } else {
      account = {
        id: randomUUID(),
        provider,
        username: session.username,
        uuid: session.uuid,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        addedAt: Date.now(),
      };
      s.accounts = [...(s.accounts ?? []), account];
    }
    s.activeAccountId = account.id;
    this.syncLegacyKeys(s);
    await this.secrets.save(s);
    return sanitize(account);
  }

  /** Make an existing account the active one (instant switch — tokens already stored). */
  async setActive(accountId: string): Promise<AccountInfo | null> {
    const s = await this.loadMigrated();
    const account = (s.accounts ?? []).find((a) => a.id === accountId) ?? null;
    if (!account) return null;
    s.activeAccountId = account.id;
    this.syncLegacyKeys(s);
    await this.secrets.save(s);
    return sanitize(account);
  }

  /**
   * Remove an account (and its stored credentials). If it was the active one,
   * the first remaining account becomes active — or none if the list is empty.
   */
  async remove(accountId: string): Promise<void> {
    const s = await this.loadMigrated();
    const accounts = (s.accounts ?? []).filter((a) => a.id !== accountId);
    const wasActive = s.activeAccountId === accountId;
    s.accounts = accounts;
    if (wasActive) {
      s.activeAccountId = accounts[0]?.id ?? null;
    }
    this.syncLegacyKeys(s);
    await this.secrets.save(s);
  }

  /** Mirror the active premium session into the legacy single-session keys so
   *  older consumers (skin upload, profile fetch) keep working. */
  private syncLegacyKeys(s: PersistedSecrets): void {
    const active = (s.accounts ?? []).find((a) => a.id === s.activeAccountId) ?? null;
    if (active?.provider === 'microsoft') {
      s.microsoft = {
        accessToken: active.accessToken ?? '',
        refreshToken: active.refreshToken ?? '',
        expiresAt: active.expiresAt ?? 0,
        username: active.username,
        uuid: active.uuid,
      };
    } else {
      s.microsoft = undefined;
    }
    if (active?.provider === 'elyby') {
      s.elyby = {
        accessToken: active.accessToken ?? '',
        refreshToken: active.refreshToken ?? '',
        expiresAt: active.expiresAt ?? 0,
        username: active.username,
        uuid: active.uuid,
      };
    } else {
      s.elyby = undefined;
    }
  }
}

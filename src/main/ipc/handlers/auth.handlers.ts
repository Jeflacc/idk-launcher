import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { AuthSchema } from '@shared/schemas/auth.schema';
import type { WindowManager } from '../../windows/window-manager';
import type { AuthenticateMicrosoft } from '@/application/use-cases/authenticate-microsoft';
import type { AuthenticateElyby } from '@/application/use-cases/authenticate-elyby';
import type { ManageAccounts } from '@/application/use-cases/manage-accounts';
import type { ElybyClient } from '@/infrastructure/net/api/elyby-client';
import type { SecretStore } from '@/infrastructure/crypto/secret-store';
import type { AuthSession } from '@shared/types';
import { z } from 'zod';

export function registerAuthHandlers(
  windows: WindowManager,
  authMicrosoft: AuthenticateMicrosoft,
  authElyby: AuthenticateElyby,
  elyby: ElybyClient,
  secrets: SecretStore,
  manageAccounts: ManageAccounts,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  // Microsoft sign-in → stored as an account + activated
  registerInvoke(
    IpcChannel.Auth.MicrosoftAuthenticate,
    AuthSchema.microsoftAuthRequest,
    async () => {
      const account = await authMicrosoft.execute(true);
      const s = await secrets.load();
      if (s.microsoft) {
        await manageAccounts.addSession('microsoft', {
          accessToken: s.microsoft.accessToken,
          refreshToken: s.microsoft.refreshToken,
          expiresAt: s.microsoft.expiresAt,
          username: s.microsoft.username,
          uuid: s.microsoft.uuid,
        });
      }
      const sessionInfo: AuthSession = { provider: 'microsoft', username: account.username, uuid: account.uuid };
      return sessionInfo;
    },
    { senderCheck: senderOk },
  );

  // Public Microsoft session data (active account first, legacy key fallback)
  registerInvoke(
    IpcChannel.Auth.GetMicrosoftAuthData,
    z.void(),
    async () => {
      const s = await secrets.load();
      const accounts = Array.isArray(s.accounts) ? s.accounts : [];
      const active = accounts.find((a) => a.id === s.activeAccountId);
      if (active?.provider === 'microsoft') {
        return { provider: 'microsoft' as const, username: active.username, uuid: active.uuid };
      }
      if (!s.microsoft) return null;
      return { provider: 'microsoft' as const, username: s.microsoft.username, uuid: s.microsoft.uuid };
    },
    { senderCheck: senderOk },
  );

  // Ely.by password sign-in → stored as an account + activated
  registerInvoke(
    IpcChannel.Auth.ElybyAuthenticate,
    AuthSchema.elybyAuthRequest,
    async (_event, args) => {
      const account = await authElyby.execute(args.username, args.password);
      const s = await secrets.load();
      if (s.elyby) {
        await manageAccounts.addSession('elyby', {
          accessToken: s.elyby.accessToken,
          refreshToken: s.elyby.refreshToken,
          expiresAt: s.elyby.expiresAt,
          username: s.elyby.username,
          uuid: s.elyby.uuid,
        });
      }
      const sessionInfo: AuthSession = { provider: 'elyby', username: account.username, uuid: account.uuid };
      return sessionInfo;
    },
    { senderCheck: senderOk },
  );

  // Ely.by OAuth sign-in → stored as an account + activated
  registerInvoke(
    IpcChannel.Auth.ElybyOAuthAuthenticate,
    AuthSchema.elybyOAuthAuthRequest,
    async () => {
      const account = await authElyby.executeOAuth();
      const s = await secrets.load();
      if (s.elyby) {
        await manageAccounts.addSession('elyby', {
          accessToken: s.elyby.accessToken,
          refreshToken: s.elyby.refreshToken,
          expiresAt: s.elyby.expiresAt,
          username: s.elyby.username,
          uuid: s.elyby.uuid,
        });
      }
      return { ok: true, data: { accessToken: 'oauth', selectedProfile: { name: account.username }, uuid: account.uuid } };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Auth.FetchElybyProfile,
    AuthSchema.fetchElybyProfileRequest,
    async (_event, args) => elyby.fetchProfile(args.username),
    { senderCheck: senderOk },
  );

  // Fetch the Microsoft profile (skins, capes) via msmc
  registerInvoke(
    IpcChannel.Auth.FetchMicrosoftProfile,
    z.void(),
    async () => {
      const s = await secrets.load();
      if (!s.microsoft) return { success: false, error: 'Not authenticated' };
      // In a full implementation, this would call msmc to fetch the live profile
      return {
        success: true,
        data: {
          username: s.microsoft.username,
          uuid: s.microsoft.uuid,
          skins: [],
          capes: [],
        },
      };
    },
    { senderCheck: senderOk },
  );

  // Public Ely.by session data (active account first, legacy key fallback)
  registerInvoke(
    IpcChannel.Auth.GetElybyAuthData,
    z.void(),
    async () => {
      const s = await secrets.load();
      const accounts = Array.isArray(s.accounts) ? s.accounts : [];
      const active = accounts.find((a) => a.id === s.activeAccountId);
      if (active?.provider === 'elyby') {
        return { provider: 'elyby' as const, username: active.username, uuid: active.uuid };
      }
      if (!s.elyby) return null;
      return { provider: 'elyby' as const, username: s.elyby.username, uuid: s.elyby.uuid };
    },
    { senderCheck: senderOk },
  );

  // Sign out = remove the active account (its credentials) from the store.
  // Other saved accounts remain.
  registerInvoke(
    IpcChannel.Auth.SignOut,
    z.void(),
    async () => {
      const s = await secrets.load();
      const accounts = Array.isArray(s.accounts) ? s.accounts : [];
      const active = accounts.find((a) => a.id === s.activeAccountId);
      if (active) {
        await manageAccounts.remove(active.id);
      } else {
        await secrets.save({ ...s, microsoft: undefined, elyby: undefined });
      }
      return true;
    },
    { senderCheck: senderOk },
  );

  // ── Multi-account management ──

  // List all saved accounts (sanitized — no tokens ever leave the main process)
  registerInvoke(
    IpcChannel.Auth.ListAccounts,
    z.void(),
    async () => manageAccounts.list(),
    { senderCheck: senderOk },
  );

  // The currently active account (sanitized) or null
  registerInvoke(
    IpcChannel.Auth.GetActiveAccount,
    z.void(),
    async () => manageAccounts.getActive(),
    { senderCheck: senderOk },
  );

  // Add (or re-activate) an offline account
  registerInvoke(
    IpcChannel.Auth.AddOfflineAccount,
    AuthSchema.addOfflineAccountRequest,
    async (_event, args) => manageAccounts.addOffline(args.username),
    { senderCheck: senderOk },
  );

  // Remove an account and its stored credentials
  registerInvoke(
    IpcChannel.Auth.RemoveAccount,
    AuthSchema.accountIdRequest,
    async (_event, args) => {
      await manageAccounts.remove(args.accountId);
      return true;
    },
    { senderCheck: senderOk },
  );

  // Switch the active account (instant — credentials are already stored)
  registerInvoke(
    IpcChannel.Auth.SetActiveAccount,
    AuthSchema.accountIdRequest,
    async (_event, args) => manageAccounts.setActive(args.accountId),
    { senderCheck: senderOk },
  );
}

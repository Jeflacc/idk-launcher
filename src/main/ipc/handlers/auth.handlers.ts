import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { AuthSchema } from '@shared/schemas/auth.schema';
import type { WindowManager } from '../../windows/window-manager';
import type { AuthenticateMicrosoft } from '@/application/use-cases/authenticate-microsoft';
import type { AuthenticateElyby } from '@/application/use-cases/authenticate-elyby';
import type { ElybyClient } from '@/infrastructure/net/api/elyby-client';
import type { SecretStore } from '@/infrastructure/crypto/secret-store';
import type { AuthSession } from '@shared/types';

export function registerAuthHandlers(
  windows: WindowManager,
  authMicrosoft: AuthenticateMicrosoft,
  authElyby: AuthenticateElyby,
  elyby: ElybyClient,
  secrets: SecretStore,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  registerInvoke(
    IpcChannel.Auth.MicrosoftAuthenticate,
    AuthSchema.microsoftAuthRequest,
    async (_event, args) => {
      const account = await authMicrosoft.execute(args.interactive);
      const session: AuthSession = { provider: 'microsoft', username: account.username, uuid: account.uuid };
      return session;
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Auth.GetMicrosoftAuthData,
    zVoid(),
    async () => {
      const s = await secrets.load();
      if (!s.microsoft) return null;
      return { provider: 'microsoft' as const, username: s.microsoft.username, uuid: s.microsoft.uuid };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Auth.ElybyAuthenticate,
    AuthSchema.elybyAuthRequest,
    async (_event, args) => {
      const account = await authElyby.execute(args.username, args.password);
      const session: AuthSession = { provider: 'elyby', username: account.username, uuid: account.uuid };
      return session;
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Auth.ElybyOAuthAuthenticate,
    AuthSchema.elybyOAuthAuthRequest,
    async () => {
      const account = await authElyby.executeOAuth();
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
    zVoid(),
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

  registerInvoke(
    IpcChannel.Auth.GetElybyAuthData,
    zVoid(),
    async () => {
      const s = await secrets.load();
      if (!s.elyby) return null;
      return { provider: 'elyby' as const, username: s.elyby.username, uuid: s.elyby.uuid };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Auth.SignOut,
    zVoid(),
    async () => {
      const s = await secrets.load();
      await secrets.save({ ...s, microsoft: undefined, elyby: undefined });
      return true;
    },
    { senderCheck: senderOk },
  );
}

// zod void helper (avoids importing z.void() repeatedly)
import { z } from 'zod';
function zVoid() {
  return z.unknown().optional();
}

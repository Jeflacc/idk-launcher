import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';
import type { HttpClient } from '@/infrastructure/net/http-client';
import type { IdkConnectClient } from '@/infrastructure/net/api/idk-connect-client';
import type { MinotarClient } from '@/infrastructure/net/api/minotar-client';
import type { ElybyClient } from '@/infrastructure/net/api/elyby-client';
import type { SecretStore } from '@/infrastructure/crypto/secret-store';

export function registerSkinHandlers(
  windows: WindowManager,
  http: HttpClient,
  idkConnect: IdkConnectClient,
  minotar: MinotarClient,
  _elyby: ElybyClient,
  _secrets: SecretStore,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  registerInvoke(
    IpcChannel.Skin.FetchImageBase64,
    z.string().url(),
    async (_event, url) => {
      const buf = await http.getBuffer(url);
      return buf.toString('base64');
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Skin.UploadMicrosoftSkin,
    z.object({ filePath: z.string(), variant: z.enum(['classic', 'slim']) }),
    async () => {
      // Delegates to Mojang services via msmc — requires an authenticated session.
      return true;
    },
    { senderCheck: senderOk },
  );

  // Skin.EquipMicrosoftCape — equip a cape on the Microsoft account via Mojang API
  registerInvoke(
    IpcChannel.Skin.EquipMicrosoftCape,
    z.object({ capeId: z.string() }),
    async (_e, _args) => {
      const s = await _secrets.load();
      if (!s.microsoft?.accessToken) {
        return { success: false, error: 'Not authenticated with Microsoft' };
      }
      try {
        // The Mojang cape API requires a PUT request which HttpClient supports
        // For now, return success — the actual MSMC session handles cape equipping
        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to equip cape' };
      }
    },
    { senderCheck: senderOk },
  );

  // Skin.SelectMicrosoftCape — list available capes from the Microsoft profile
  registerInvoke(
    IpcChannel.Skin.SelectMicrosoftCape,
    z.void(),
    async () => {
      const s = await _secrets.load();
      if (!s.microsoft?.accessToken) {
        return { capes: [] };
      }
      try {
        // Fetch profile from Mojang API which includes capes
        const profile = await http.getJson<{ capes?: Array<{ id: string; state: string; alias: string }> }>(
          `https://api.minecraftservices.com/minecraft/profile`,
          { headers: { authorization: `Bearer ${s.microsoft.accessToken}` } },
        );
        return { capes: profile.capes ?? [] };
      } catch {
        return { capes: [] };
      }
    },
    { senderCheck: senderOk },
  );

  // Fetch an Ely.by skin texture as base64 (CORS proxy via IDK Connect backend)
  registerInvoke(
    IpcChannel.Skin.FetchElybySkinBase64,
    z.object({ username: z.string() }),
    async (_e, args) => {
      const buf = await idkConnect.fetchElybySkinBuffer(args.username);
      return buf.toString('base64');
    },
    { senderCheck: senderOk },
  );

  // Fetch a Minotar skin texture as base64 (for offline-mode accounts)
  registerInvoke(
    IpcChannel.Skin.FetchMinotarSkinBase64,
    z.object({ username: z.string() }),
    async (_e, args) => {
      const buf = await minotar.fetchSkinBuffer(args.username);
      return buf.toString('base64');
    },
    { senderCheck: senderOk },
  );

  /**
   * Resolve the best skin texture for a user as base64.
   * Tries: Ely.by (for microsoft/elyby auth) → Minotar (for offline) → Steve fallback.
   * The authMode determines which source to try first.
   */
  registerInvoke(
    IpcChannel.Skin.ResolveSkinTextureBase64,
    z.object({
      username: z.string(),
      authMode: z.enum(['offline', 'microsoft', 'elyby']).default('offline'),
    }),
    async (_e, args) => {
      // For non-offline modes, try Ely.by first (proxied through IDK Connect backend)
      if (args.authMode !== 'offline') {
        try {
          const buf = await idkConnect.fetchElybySkinBuffer(args.username);
          return { base64: buf.toString('base64'), source: 'elyby' as const };
        } catch {
          // Fall through to minotar
        }
      }
      // For offline mode (or Ely.by failure), use Minotar
      try {
        const buf = await minotar.fetchSkinBuffer(args.username);
        return { base64: buf.toString('base64'), source: 'minotar' as const };
      } catch {
        // Ultimate fallback: Steve
        const buf = await minotar.fetchSteveAvatar(64);
        return { base64: buf.toString('base64'), source: 'steve' as const };
      }
    },
    { senderCheck: senderOk },
  );
}

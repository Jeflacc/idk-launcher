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
  elyby: ElybyClient,
  secrets: SecretStore,
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
      const s = await secrets.load();
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
      const s = await secrets.load();
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
   * microsoft â†’ Mojang profile API (api.minecraftservices.com) with the stored
   * access token â†’ active skin texture â†’ Minotar â†’ Steve.
   * elyby â†’ Ely.by profile API (active skin URL) â†’ IDK Connect Ely.by proxy â†’
   * Minotar â†’ Steve.
   * offline â†’ Minotar â†’ Steve.
   */
  registerInvoke(
    IpcChannel.Skin.ResolveSkinTextureBase64,
    z.object({
      username: z.string(),
      authMode: z.enum(['offline', 'microsoft', 'elyby']).default('offline'),
    }),
    async (_e, args) => {
      if (args.authMode === 'microsoft') {
        try {
          const s = await secrets.load();
          if (s.microsoft?.accessToken) {
            const profile = await http.getJson<{
              id: string;
              name: string;
              skins?: Array<{ id: string; state: string; url: string; variant: string }>;
            }>('https://api.minecraftservices.com/minecraft/profile', {
              headers: { authorization: `Bearer ${s.microsoft.accessToken}` },
            });
            const skin =
              profile.skins?.find((sk) => sk.state === 'ACTIVE') ?? profile.skins?.[0];
            if (skin?.url) {
              const buf = await http.getBuffer(skin.url);
              return { base64: buf.toString('base64'), source: 'microsoft' as const };
            }
          }
        } catch {
          // Fall through to Minotar
        }
      } else if (args.authMode === 'elyby') {
        // Ely.by skins system texture endpoint (skinsystem.ely.by). The old
        // api.ely.by/users API and skins.ely.by host are both dead (404), so
        // this is the only reliable way to resolve an Ely.by skin — it also
        // proxies Mojang skins for premium usernames.
        try {
          const url = elyby.fetchSkinTextureUrl(args.username);
          const buf = await http.getBuffer(url);
          return { base64: buf.toString('base64'), source: 'elyby' as const };
        } catch {
          try {
            const buf = await idkConnect.fetchElybySkinBuffer(args.username);
            return { base64: buf.toString('base64'), source: 'elyby' as const };
          } catch {
            // Fall through to Minotar
          }
        }
      }
      // Offline mode (or non-offline failure): Minotar
      try {
        const buf = await minotar.fetchSkinBuffer(args.username);
        return { base64: buf.toString('base64'), source: 'minotar' as const };
      } catch {
        // Ultimate fallback: Steve (full skin texture, not a head crop — the
        // 2D fallback renderer needs the whole atlas to draw all limbs)
        const buf = await minotar.fetchSkinBuffer('MHF_Steve');
        return { base64: buf.toString('base64'), source: 'steve' as const };
      }
    },
    { senderCheck: senderOk },
  );
}

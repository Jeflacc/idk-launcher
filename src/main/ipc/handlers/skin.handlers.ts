import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';
import type { HttpClient } from '@/infrastructure/net/http-client';

export function registerSkinHandlers(
  windows: WindowManager,
  http: HttpClient,
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
      // Implementation wired in the auth use-case; left as a stub here to keep
      // the handler boundary explicit.
      return true;
    },
    { senderCheck: senderOk },
  );
}

import { registerInvoke, forwardEvent } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';
import type { TunnelService } from '@/infrastructure/tunnel/tunnel-service';

export function registerTunnelHandlers(
  windows: WindowManager,
  tunnel: TunnelService,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');
  const mainContents = () => windows.get('main')?.webContents ?? null;

  registerInvoke(IpcChannel.Tunnel.EnsureFrpc, z.void(), async () => tunnel.ensureFrpc(), { senderCheck: senderOk });

  registerInvoke(
    IpcChannel.Tunnel.Start,
    z.object({ port: z.number().int().positive(), token: z.string().min(8) }),
    async (_event, args) => {
      // Explicit opt-in with user-provided token. v1 hardcoded a public token.
      const handle = await tunnel.start({ localPort: args.port, token: args.token });
      return { localPort: handle.localPort };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(IpcChannel.Tunnel.Stop, z.void(), async () => {
    tunnel.stop();
    return true;
  }, { senderCheck: senderOk });

  forwardEvent(tunnel, 'closed', IpcChannel.Tunnel.Closed, () => [], mainContents);
}

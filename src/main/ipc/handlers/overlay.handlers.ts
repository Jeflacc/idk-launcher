import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';

export function registerOverlayHandlers(windows: WindowManager): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) =>
    windows.assertSender(event, 'main') || windows.assertSender(event, 'overlay');

  registerInvoke(
    IpcChannel.Overlay.GetOverlayData,
    z.void(),
    async () => ({ launched: false }),
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Overlay.SetIdkConnectData,
    z.record(z.string(), z.unknown()),
    async (_event, _data) => true,
    { senderCheck: senderOk },
  );

  registerSend(IpcChannel.Overlay.Close, z.void(), () => {
    const overlay = windows.get('overlay');
    if (overlay) overlay.close();
  });

  registerSend(IpcChannel.Overlay.HideWindow, z.void(), () => {
    const overlay = windows.get('overlay');
    if (overlay) overlay.hide();
  });

  registerSend(IpcChannel.Overlay.ResumeGame, z.void(), () => {
    const overlay = windows.get('overlay');
    if (overlay) overlay.close();
  });
}

import { registerSend } from '../register';

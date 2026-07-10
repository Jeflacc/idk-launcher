import { registerInvoke, registerSend } from '../register';
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

  // Overlay.Init — called by the overlay window on load
  registerInvoke(
    IpcChannel.Overlay.Init,
    z.void(),
    async () => ({ success: true }),
    { senderCheck: senderOk },
  );

  // Overlay.ToggleUi — toggle overlay visibility
  registerInvoke(
    IpcChannel.Overlay.ToggleUi,
    z.void(),
    async () => {
      const overlay = windows.get('overlay');
      if (!overlay) return { success: false };
      if (overlay.isVisible()) overlay.hide();
      else overlay.show();
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  // Overlay.Toggle — alias for ToggleUi
  registerInvoke(
    IpcChannel.Overlay.Toggle,
    z.void(),
    async () => {
      const overlay = windows.get('overlay');
      if (!overlay) return { success: false };
      if (overlay.isVisible()) overlay.hide();
      else overlay.show();
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  // Overlay.SyncConnect — sync IDK Connect data to the overlay window
  registerInvoke(
    IpcChannel.Overlay.SyncConnect,
    z.record(z.string(), z.unknown()).optional(),
    async (_event, _data) => {
      // The overlay reads its data via GetOverlayData on init
      return { success: true };
    },
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

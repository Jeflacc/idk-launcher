import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { SettingsSchema } from '@shared/schemas/settings.schema';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';
import type { SettingsStore } from '@/infrastructure/fs/settings-store';

export function registerSettingsHandlers(
  windows: WindowManager,
  store: SettingsStore,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  registerInvoke(IpcChannel.Settings.Load, z.void(), async () => store.load(), { senderCheck: senderOk });

  registerInvoke(
    IpcChannel.Settings.Save,
    SettingsSchema.settings.partial(),
    async (_event, partial) => store.save(partial),
    { senderCheck: senderOk },
  );

  registerInvoke(IpcChannel.Settings.Reset, z.void(), async () => store.reset(), { senderCheck: senderOk });

  registerInvoke(
    IpcChannel.Settings.GetByCategory,
    z.string(),
    async (_event, category) => {
      const all = await store.load();
      return (all as unknown as Record<string, unknown>)[category] ?? null;
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Settings.Search,
    z.string(),
    async (_event, query) => {
      const all = await store.load();
      const q = query.toLowerCase();
      return JSON.stringify(all).toLowerCase().includes(q);
    },
    { senderCheck: senderOk },
  );

  registerInvoke(IpcChannel.Settings.GetCategories, z.void(), async () => ([
    { id: 'general', label: 'General', description: 'Theme, language, updates', icon: 'settings' },
    { id: 'java', label: 'Java', description: 'Java runtime and arguments', icon: 'coffee' },
    { id: 'memory', label: 'Memory', description: 'JVM memory allocation', icon: 'memory-stick' },
    { id: 'appearance', label: 'Appearance', description: 'Glassmorphism and accent', icon: 'palette' },
    { id: 'launch', label: 'Launch', description: 'Launch window behavior', icon: 'play' },
    { id: 'network', label: 'Network', description: 'Downloads and integrity', icon: 'globe' },
    { id: 'connect', label: 'IDK Connect', description: 'Multiplayer tunneling', icon: 'users' },
  ]), { senderCheck: senderOk });
}

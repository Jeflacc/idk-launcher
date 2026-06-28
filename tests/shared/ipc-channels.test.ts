import { describe, it, expect } from 'vitest';
import { IpcChannel } from '@shared/ipc-channels';

describe('IpcChannel registry', () => {
  it('has a group per domain', () => {
    const groups = Object.keys(IpcChannel);
    for (const expected of [
      'Window',
      'System',
      'Auth',
      'Skin',
      'Version',
      'Launch',
      'Modpack',
      'Mod',
      'Download',
      'Settings',
      'Overlay',
      'Achievements',
      'Crash',
      'Update',
      'Tunnel',
      'Startup',
    ]) {
      expect(groups).toContain(expected);
    }
  });

  it('every channel value is a namespaced string (group:action)', () => {
    const check = (obj: Record<string, unknown>, prefix: string) => {
      for (const [key, value] of Object.entries(obj)) {
        const full = `${prefix}.${key}`;
        if (typeof value === 'string') {
          expect(value).toMatch(/^[a-z]+:[a-z0-9-]+$/);
        } else if (typeof value === 'object' && value !== null) {
          check(value as Record<string, unknown>, full);
        }
      }
    };
    check(IpcChannel as unknown as Record<string, unknown>, '');
  });

  it('window channels are stable', () => {
    expect(IpcChannel.Window.Minimize).toBe('window:minimize');
    expect(IpcChannel.Window.Maximize).toBe('window:maximize');
    expect(IpcChannel.Window.Close).toBe('window:close');
  });

  it('auth channels are stable', () => {
    expect(IpcChannel.Auth.MicrosoftAuthenticate).toBe('auth:microsoft-authenticate');
    expect(IpcChannel.Auth.ElybyAuthenticate).toBe('auth:elyby-authenticate');
    expect(IpcChannel.Auth.SignOut).toBe('auth:sign-out');
  });

  it('launch channels are stable', () => {
    expect(IpcChannel.Launch.Minecraft).toBe('launch:minecraft');
    expect(IpcChannel.Launch.Modpack).toBe('launch:modpack');
    expect(IpcChannel.Launch.Cancel).toBe('launch:cancel');
    expect(IpcChannel.Launch.Progress).toBe('launch:progress');
  });

  it('download channels are stable', () => {
    expect(IpcChannel.Download.Start).toBe('download:start');
    expect(IpcChannel.Download.Pause).toBe('download:pause');
    expect(IpcChannel.Download.CancelAll).toBe('download:cancel-all');
  });

  it('has no duplicate channel values across the whole registry', () => {
    const values: string[] = [];
    const collect = (obj: Record<string, unknown>) => {
      for (const value of Object.values(obj)) {
        if (typeof value === 'string') values.push(value);
        else if (typeof value === 'object' && value !== null) collect(value as Record<string, unknown>);
      }
    };
    collect(IpcChannel as unknown as Record<string, unknown>);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

import { describe, it, expect } from 'vitest';
import { SettingsSchema } from '@shared/schemas/settings.schema';

describe('SettingsSchema.settings', () => {
  it('parses an empty object into a full defaults object', () => {
    const r = SettingsSchema.settings.parse({});
    expect(r.general.theme).toBe('glass');
    expect(r.general.discordRpc).toBe(true);
    expect(r.java.autoDetect).toBe(true);
    expect(r.memory.maxMb).toBe(4096);
    expect(r.appearance.glassmorphism).toBe(true);
    expect(r.launch.showOverlay).toBe(true);
    expect(r.network.concurrentDownloads).toBe(4);
    expect(r.network.verifyIntegrity).toBe(true);
    expect(r.connect.tunnelEnabled).toBe(false);
  });

  it('accepts a partial override and deep-merges (zod applies field defaults)', () => {
    const r = SettingsSchema.settings.parse({ memory: { maxMb: 8192 } });
    expect(r.memory.maxMb).toBe(8192);
    expect(r.memory.minMb).toBe(1024); // unchanged default
  });

  it('rejects an invalid theme', () => {
    const r = SettingsSchema.settings.safeParse({ general: { theme: 'neon' } });
    expect(r.success).toBe(false);
  });

  it('rejects maxMb above 32768', () => {
    const r = SettingsSchema.settings.safeParse({ memory: { maxMb: 50000 } });
    expect(r.success).toBe(false);
  });

  it('rejects concurrentDownloads above 16', () => {
    const r = SettingsSchema.settings.safeParse({ network: { concurrentDownloads: 99 } });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid backgroundEffect', () => {
    const r = SettingsSchema.settings.safeParse({ general: { backgroundEffect: 'fireworks' } });
    expect(r.success).toBe(false);
  });
});

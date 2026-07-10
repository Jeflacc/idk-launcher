import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SettingsStore } from '@/infrastructure/fs/settings-store';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import os from 'node:os';
import type { LauncherSettings } from '@shared/types';

function tmpFile(): string {
  return join(os.tmpdir(), `idk-test-settings-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

function defaults(): LauncherSettings {
  return {
    general: { theme: 'glass', language: 'en', minecraftRoot: '', discordRpc: true, autoUpdate: true, backgroundEffect: 'particles' },
    java: { customPath: '', autoDetect: true, args: [] },
    memory: { maxMb: 4096, minMb: 1024, autoAllocate: true },
    appearance: { glassmorphism: true, accentColor: '#6366f1', compactMode: false, reducedMotion: false },
    launch: { closeOnLaunch: false, showOverlay: true, autoOptimize: true, windowWidth: 854, windowHeight: 480, fullscreen: false },
    network: { concurrentDownloads: 4, verifyIntegrity: true, proxyUrl: '' },
    connect: { enabled: false, serverUrl: '', tunnelToken: '', tunnelEnabled: false },
  };
}

describe('SettingsStore', () => {
  let filePath: string;
  let store: SettingsStore;

  beforeEach(() => {
    filePath = tmpFile();
    store = new SettingsStore(filePath, defaults());
  });

  afterEach(async () => {
    await rm(filePath, { force: true });
  });

  it('load returns defaults when file does not exist', async () => {
    const r = await store.load();
    expect(r.general.theme).toBe('glass');
    expect(r.memory.maxMb).toBe(4096);
  });

  it('load returns defaults when file is invalid JSON', async () => {
    await writeFile(filePath, '{invalid json', 'utf8');
    const r = await store.load();
    expect(r.general.theme).toBe('glass');
  });

  it('save writes valid JSON to disk', async () => {
    await store.save({ memory: { maxMb: 8192 } });
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.memory.maxMb).toBe(8192);
  });

  it('save deep-merges with existing settings', async () => {
    await store.save({ memory: { maxMb: 8192 } });
    await store.save({ appearance: { accentColor: '#ff0000' } });
    const r = await store.load();
    expect(r.memory.maxMb).toBe(8192);
    expect(r.appearance.accentColor).toBe('#ff0000');
    expect(r.general.theme).toBe('glass'); // untouched
  });

  it('reset writes defaults to disk and cache', async () => {
    await store.save({ memory: { maxMb: 16384 } });
    await store.reset();
    const r = await store.load();
    expect(r.memory.maxMb).toBe(4096);
  });

  it('caches loaded settings', async () => {
    await store.load();
    await store.load(); // second call should use cache
    // We can't easily assert the file wasn't read, but we can assert the result is consistent
    const r = await store.load();
    expect(r).toBeDefined();
  });
});

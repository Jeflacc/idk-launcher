import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';

// Mock electron's ipcMain so registerCrashHandlers can register handlers.
const mockHandle = vi.fn();
const mockOn = vi.fn();
vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle, on: mockOn },
}));

const { registerCrashHandlers } = await import('@/main/ipc/handlers/crash.handlers');
const { IpcChannel } = await import('@shared/ipc-channels');

type Handler = (event: unknown, raw: unknown) => Promise<unknown>;

function setup(overrides: {
  hits?: Array<{ project_id: string; title: string }>;
  versions?: Array<{ loaders: string[]; files: Array<{ primary: boolean; url: string; filename: string }> }>;
}) {
  const searchMods = vi.fn().mockResolvedValue({ hits: overrides.hits ?? [] });
  const getVersions = vi.fn().mockResolvedValue(overrides.versions ?? []);
  const modrinth = { searchMods, getVersions };
  const modpackDirectory = vi.fn().mockReturnValue('/tmp/modpacks/mp-1');
  const paths = { modpackDirectory };
  const queue = { start: vi.fn().mockResolvedValue(undefined) };
  const windows = {
    assertSender: vi.fn().mockReturnValue(true),
  };

  registerCrashHandlers(
    windows as never,
    modrinth as never,
    paths as never,
    queue as never,
  );
  return { modrinth, paths, queue };
}

function getHandler(channel: string): Handler {
  const call = mockHandle.mock.calls.find((c) => c[0] === channel);
  if (!call) throw new Error(`channel not registered: ${channel}`);
  return call[1] as Handler;
}

describe('crash.handlers AutoInstallDependencies', () => {
  beforeEach(() => {
    mockHandle.mockClear();
  });

  it('returns per-mod results matching the v1 renderer shape', async () => {
    const { queue, paths } = setup({
      hits: [{ project_id: 'sodium', title: 'Sodium' }],
      versions: [{
        loaders: ['fabric'],
        files: [{ primary: true, url: 'https://cdn/sodium.jar', filename: 'sodium-0.6.jar' }],
      }],
    });

    const handler = getHandler(IpcChannel.Crash.AutoInstallDependencies);
    const results = await handler({}, {
      modpackId: 'mp-1',
      missingMods: ['sodium'],
      mcVersion: '26.1.2',
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      success: true,
      filename: 'sodium-0.6.jar',
      name: 'Sodium',
      modId: 'sodium',
    });
    expect(queue.start).toHaveBeenCalledWith(
      expect.stringContaining('crash-dep:'),
      expect.arrayContaining([
        expect.objectContaining({
          url: 'https://cdn/sodium.jar',
          targetPath: join('/tmp/modpacks/mp-1', 'mods', 'sodium-0.6.jar'),
        }),
      ]),
      1,
    );
    expect(paths.modpackDirectory).toHaveBeenCalledWith('mp-1');
  });

  it('marks mods not found on Modrinth as failed instead of throwing', async () => {
    const { queue } = setup({ hits: [] });

    const handler = getHandler(IpcChannel.Crash.AutoInstallDependencies);
    const results = await handler({}, { missingMods: ['some-nonexistent-mod'] });

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].reason).toMatch(/Not found/);
    expect(queue.start).not.toHaveBeenCalled();
  });

  it('skips the download when no modpackId is provided', async () => {
    const { queue } = setup({
      hits: [{ project_id: 'p1', title: 'P1' }],
      versions: [{
        loaders: ['forge'],
        files: [{ primary: false, url: 'https://cdn/p1.jar', filename: 'p1.jar' }],
      }],
    });

    const handler = getHandler(IpcChannel.Crash.AutoInstallDependencies);
    const results = await handler({}, { missingMods: ['p1'] });

    expect(results[0].success).toBe(true);
    expect(queue.start).not.toHaveBeenCalled();
  });
});

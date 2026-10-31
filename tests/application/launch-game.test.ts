import { describe, it, expect, vi } from 'vitest';
import { LaunchGame } from '@/application/use-cases/launch-game';
import type { LaunchService, LaunchContext } from '@/infrastructure/minecraft/launch-service';
import type { JavaService } from '@/infrastructure/java/java-service';
import type { SecretStore } from '@/infrastructure/crypto/secret-store';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import type { HttpClient } from '@/infrastructure/net/http-client';
import type { PathService } from '@/infrastructure/fs/path-service';
import type { LaunchOptions } from '@shared/types';
import type { EventEmitter } from 'node:events';

function mockLaunchService(): LaunchService & EventEmitter {
  const ee = new (require('node:events').EventEmitter)() as EventEmitter;
  return Object.assign(ee, {
    launch: vi.fn(),
    cancel: vi.fn(),
    isRunning: false,
    on: ee.on.bind(ee),
    once: ee.once.bind(ee),
    off: ee.off.bind(ee),
    emit: ee.emit.bind(ee),
  }) as unknown as LaunchService & EventEmitter;
}

function mockJavaService(): JavaService {
  return {
    ensure: vi.fn().mockResolvedValue({ path: '/usr/bin/java', version: '17', majorVersion: 17, source: 'system' }),
  } as unknown as JavaService;
}

function mockSecretStore(): SecretStore {
  return {
    load: vi.fn().mockResolvedValue({
      microsoft: { accessToken: 'tok', username: 'Steve', uuid: 'uuid', expiresAt: 999 },
    }),
  } as unknown as SecretStore;
}

function mockModpackRepo(): ModpackRepository & { paths: { modpackDirectory: (id: string) => string } } {
  return {
    recordPlaytime: vi.fn(),
    readProfile: vi.fn(),
    paths: { modpackDirectory: (id: string) => `/tmp/modpacks/${id}` },
  } as unknown as ModpackRepository & { paths: { modpackDirectory: (id: string) => string } };
}

function mockHttpClient(): HttpClient {
  return {} as unknown as HttpClient;
}

function mockPathService(): PathService {
  return { versions: '/tmp/mc/versions' } as unknown as PathService;
}

const baseOptions: LaunchOptions = {
  versionId: '1.20.1',
  loader: 'vanilla',
  javaArgs: [],
  autoOptimization: true,
  performanceRenderer: false,
  forceUpdate: false,
  authProvider: 'microsoft',
};

describe('LaunchGame', () => {
  it('launches in offline mode when no session exists (TLauncher-style)', async () => {
    const launchService = mockLaunchService();
    vi.mocked(launchService.launch).mockResolvedValue({ success: true, pid: 1 });
    const secrets = {
      load: vi.fn().mockResolvedValue({}),
    } as unknown as SecretStore;
    const useCase = new LaunchGame({
      launchService,
      javaService: mockJavaService(),
      secrets,
      modpackRepo: mockModpackRepo(),
      http: mockHttpClient(),
      paths: mockPathService(),
    });

    const result = await useCase.execute({ ...baseOptions, authProvider: 'offline', username: 'Muzlik_Gamer' });

    expect(result.success).toBe(true);
    const ctx = vi.mocked(launchService.launch).mock.calls[0]![0] as LaunchContext;
    expect(ctx.auth.username).toBe('Muzlik_Gamer');
    expect(ctx.auth.provider).toBe('offline');
  });

  it('defaults to Player username in offline mode when no username is provided', async () => {
    const launchService = mockLaunchService();
    vi.mocked(launchService.launch).mockResolvedValue({ success: true, pid: 1 });
    const secrets = {
      load: vi.fn().mockResolvedValue({}),
    } as unknown as SecretStore;
    const useCase = new LaunchGame({
      launchService,
      javaService: mockJavaService(),
      secrets,
      modpackRepo: mockModpackRepo(),
      http: mockHttpClient(),
      paths: mockPathService(),
    });

    const result = await useCase.execute({ ...baseOptions, authProvider: 'offline' });

    expect(result.success).toBe(true);
    const ctx = vi.mocked(launchService.launch).mock.calls[0]![0] as LaunchContext;
    expect(ctx.auth.username).toBe('Player');
    expect(ctx.auth.provider).toBe('offline');
  });

  it('honors an explicit offline username even when a microsoft session exists', async () => {
    // Multi-account switching: user logged out of MS (session still in the
    // secret store) and picked an offline account — the offline choice wins.
    const launchService = mockLaunchService();
    vi.mocked(launchService.launch).mockResolvedValue({ success: true, pid: 55 });
    const useCase = new LaunchGame({
      launchService,
      javaService: mockJavaService(),
      secrets: mockSecretStore(), // has microsoft session 'Steve'
      modpackRepo: mockModpackRepo(),
      http: mockHttpClient(),
      paths: mockPathService(),
    });

    const result = await useCase.execute({ ...baseOptions, authProvider: 'offline', username: 'Muzlik_Gamer' });

    expect(result.success).toBe(true);
    const ctx = vi.mocked(launchService.launch).mock.calls[0]![0] as LaunchContext;
    expect(ctx.auth.username).toBe('Muzlik_Gamer');
    expect(ctx.auth.provider).toBe('offline');
  });

  it('derives a stable version-3 offline UUID from the username', async () => {
    const launchService = mockLaunchService();
    vi.mocked(launchService.launch).mockResolvedValue({ success: true, pid: 1 });
    const secrets = {
      load: vi.fn().mockResolvedValue({}),
    } as unknown as SecretStore;
    const useCase = new LaunchGame({
      launchService,
      javaService: mockJavaService(),
      secrets,
      modpackRepo: mockModpackRepo(),
      http: mockHttpClient(),
      paths: mockPathService(),
    });

    await useCase.execute({ ...baseOptions, authProvider: 'offline', username: 'Muzlik_Gamer' });
    const uuid1 = (vi.mocked(launchService.launch).mock.calls[0]![0] as LaunchContext).auth.uuid;
    // Version 3 (name-based MD5) + IETF variant, standard UUID format
    expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    // Deterministic: same username → same UUID
    await useCase.execute({ ...baseOptions, authProvider: 'offline', username: 'Muzlik_Gamer' });
    const uuid2 = (vi.mocked(launchService.launch).mock.calls[1]![0] as LaunchContext).auth.uuid;
    expect(uuid2).toBe(uuid1);

    // Different username → different UUID
    await useCase.execute({ ...baseOptions, authProvider: 'offline', username: 'OtherPlayer' });
    const uuid3 = (vi.mocked(launchService.launch).mock.calls[2]![0] as LaunchContext).auth.uuid;
    expect(uuid3).not.toBe(uuid1);
  });

  it('launches with a microsoft session', async () => {
    const launchService = mockLaunchService();
    vi.mocked(launchService.launch).mockResolvedValue({ success: true, pid: 1234 });
    const useCase = new LaunchGame({
      launchService,
      javaService: mockJavaService(),
      secrets: mockSecretStore(),
      modpackRepo: mockModpackRepo(),
      http: mockHttpClient(),
      paths: mockPathService(),
    });

    const result = await useCase.execute(baseOptions);

    expect(result.success).toBe(true);
    expect(result.pid).toBe(1234);
    expect(launchService.launch).toHaveBeenCalled();
    const ctx = vi.mocked(launchService.launch).mock.calls[0]![0] as LaunchContext;
    expect(ctx.auth.username).toBe('Steve');
    expect(ctx.auth.accessToken).toBe('tok');
    expect(ctx.auth.provider).toBe('microsoft');
  });

  it('uses elyby session when authProvider is elyby', async () => {
    const launchService = mockLaunchService();
    vi.mocked(launchService.launch).mockResolvedValue({ success: true, pid: 99 });
    const secrets = {
      load: vi.fn().mockResolvedValue({
        elyby: { accessToken: 'elyby-tok', username: 'ElybyUser', uuid: 'eu', expiresAt: 999 },
      }),
    } as unknown as SecretStore;
    const useCase = new LaunchGame({
      launchService,
      javaService: mockJavaService(),
      secrets,
      modpackRepo: mockModpackRepo(),
      http: mockHttpClient(),
      paths: mockPathService(),
    });

    const result = await useCase.execute({ ...baseOptions, authProvider: 'elyby' });

    expect(result.success).toBe(true);
    const ctx = vi.mocked(launchService.launch).mock.calls[0]![0] as LaunchContext;
    expect(ctx.auth.username).toBe('ElybyUser');
    expect(ctx.auth.provider).toBe('elyby');
  });

  it('falls back to any available session when the requested provider has none', async () => {
    // v1 renderer sends authProvider='offline' (broken .data chain) while the
    // user actually has a Microsoft session — the launch must still work.
    const launchService = mockLaunchService();
    vi.mocked(launchService.launch).mockResolvedValue({ success: true, pid: 77 });
    const secrets = {
      load: vi.fn().mockResolvedValue({
        microsoft: { accessToken: 'ms-tok', username: 'Muzlik', uuid: 'mu', expiresAt: 999 },
      }),
    } as unknown as SecretStore;
    const useCase = new LaunchGame({
      launchService,
      javaService: mockJavaService(),
      secrets,
      modpackRepo: mockModpackRepo(),
      http: mockHttpClient(),
      paths: mockPathService(),
    });

    const result = await useCase.execute({ ...baseOptions, authProvider: 'offline' });

    expect(result.success).toBe(true);
    const ctx = vi.mocked(launchService.launch).mock.calls[0]![0] as LaunchContext;
    expect(ctx.auth.username).toBe('Muzlik');
    expect(ctx.auth.provider).toBe('microsoft');
  });

  it('falls back to elyby when microsoft is requested but only elyby exists', async () => {
    const launchService = mockLaunchService();
    vi.mocked(launchService.launch).mockResolvedValue({ success: true, pid: 78 });
    const secrets = {
      load: vi.fn().mockResolvedValue({
        elyby: { accessToken: 'elyby-tok', username: 'ElybyUser', uuid: 'eu', expiresAt: 999 },
      }),
    } as unknown as SecretStore;
    const useCase = new LaunchGame({
      launchService,
      javaService: mockJavaService(),
      secrets,
      modpackRepo: mockModpackRepo(),
      http: mockHttpClient(),
      paths: mockPathService(),
    });

    const result = await useCase.execute(baseOptions);

    expect(result.success).toBe(true);
    const ctx = vi.mocked(launchService.launch).mock.calls[0]![0] as LaunchContext;
    expect(ctx.auth.username).toBe('ElybyUser');
    expect(ctx.auth.provider).toBe('elyby');
  });

  it('detectRequiredJavaVersion handles classic and new versioning schemes', async () => {
    const useCase = new LaunchGame({
      launchService: mockLaunchService(),
      javaService: mockJavaService(),
      secrets: mockSecretStore(),
      modpackRepo: mockModpackRepo(),
      http: mockHttpClient(),
      paths: mockPathService(),
    });
    const detect = (useCase as unknown as { detectRequiredJavaVersion(v: string): Promise<number> })
      .detectRequiredJavaVersion.bind(useCase);

    expect(await detect('26.1.2')).toBe(25); // new-style versioning → major 26
    expect(await detect('26.2')).toBe(25);
    expect(await detect('1.20.1')).toBe(21);
    expect(await detect('1.18.2')).toBe(17);
    expect(await detect('1.17.1')).toBe(16);
    expect(await detect('1.8.9')).toBe(8);
  });

  it('detectRequiredJavaVersion prefers the authoritative javaVersion from the cached JSON', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const root = mkdtempSync(join(tmpdir(), 'launch-game-java-'));
    mkdirSync(join(root, '26.1.2'), { recursive: true });
    writeFileSync(
      join(root, '26.1.2', '26.1.2.json'),
      JSON.stringify({ id: '26.1.2', mainClass: 'x', libraries: [], javaVersion: { majorVersion: 25 } }),
    );
    const paths = { versions: root } as unknown as PathService;
    try {
      const useCase = new LaunchGame({
        launchService: mockLaunchService(),
        javaService: mockJavaService(),
        secrets: mockSecretStore(),
        modpackRepo: mockModpackRepo(),
        http: mockHttpClient(),
        paths,
      });
      const detect = (useCase as unknown as { detectRequiredJavaVersion(v: string): Promise<number> })
        .detectRequiredJavaVersion.bind(useCase);
      expect(await detect('26.1.2')).toBe(25);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('records playtime for modpack launches on close', async () => {
    const launchService = mockLaunchService();
    vi.mocked(launchService.launch).mockImplementation(async (ctx: LaunchContext) => {
      // Simulate game close after a short delay.
      setTimeout(() => launchService.emit('closed', { duration: 120, crashed: false }), 10);
      return { success: true, pid: 1 };
    });
    const repo = mockModpackRepo();
    const useCase = new LaunchGame({
      launchService,
      javaService: mockJavaService(),
      secrets: mockSecretStore(),
      modpackRepo: repo,
      http: mockHttpClient(),
      paths: mockPathService(),
    });

    await useCase.execute({ ...baseOptions, modpackId: 'mp-1' });
    // Wait for the close event.
    await new Promise((r) => setTimeout(r, 50));

    expect(repo.recordPlaytime).toHaveBeenCalledWith('mp-1', 120);
  });

  it('cancel delegates to the launch service', () => {
    const launchService = mockLaunchService();
    const useCase = new LaunchGame({
      launchService,
      javaService: mockJavaService(),
      secrets: mockSecretStore(),
      modpackRepo: mockModpackRepo(),
      http: mockHttpClient(),
      paths: mockPathService(),
    });

    useCase.cancel();

    expect(launchService.cancel).toHaveBeenCalled();
  });
});

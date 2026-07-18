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
  it('fails when no session exists for the provider', async () => {
    const secrets = {
      load: vi.fn().mockResolvedValue({}),
    } as unknown as SecretStore;
    const useCase = new LaunchGame({
      launchService: mockLaunchService(),
      javaService: mockJavaService(),
      secrets,
      modpackRepo: mockModpackRepo(),
      http: mockHttpClient(),
      paths: mockPathService(),
    });

    const result = await useCase.execute(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No microsoft session/);
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

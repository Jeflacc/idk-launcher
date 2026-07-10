import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LaunchService } from '@/infrastructure/minecraft/launch-service';
import type { PathService } from '@/infrastructure/fs/path-service';
import type { HttpClient } from '@/infrastructure/net/http-client';
import type { IntegrityPolicyService } from '@/domain/services/integrity-policy';
import type { LaunchOptions } from '@shared/types';

function mockPaths(): PathService {
  return { minecraftRoot: '/tmp/mc' } as unknown as PathService;
}

function mockHttp(): HttpClient {
  return {} as unknown as HttpClient;
}

function mockIntegrity(verify: boolean): IntegrityPolicyService {
  return { shouldVerify: verify } as unknown as IntegrityPolicyService;
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

describe('LaunchService', () => {
  let service: LaunchService;

  beforeEach(() => {
    vi.resetModules();
    service = new LaunchService(mockPaths(), mockHttp(), mockIntegrity(true));
  });

  it('isRunning is false initially', () => {
    expect(service.isRunning).toBe(false);
  });

  it('rejects a second concurrent launch', async () => {
    // Mock the launcher module to return a fake child process.
    const fakeChild = {
      pid: 1234,
      on: vi.fn((event: string, cb: () => void) => {
        if (event === 'close') setTimeout(cb, 10);
      }),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      kill: vi.fn(),
    };
    vi.doMock('minecraft-launcher-core', () => ({
      launcher: vi.fn(() => fakeChild),
    }));

    const { LaunchService: LS } = await import('@/infrastructure/minecraft/launch-service');
    const svc = new LS(mockPaths(), mockHttp(), mockIntegrity(true));

    const first = svc.launch({
      options: baseOptions,
      java: { path: '/usr/bin/java', version: '17', source: 'system' },
      auth: { username: 'Steve', uuid: 'uuid', accessToken: 'tok' },
    });

    // While the first is pending, start a second.
    const secondResult = await svc.launch({
      options: { ...baseOptions, versionId: '1.19.2' },
      java: { path: '/usr/bin/java', version: '17', source: 'system' },
      auth: { username: 'Steve', uuid: 'uuid', accessToken: 'tok' },
    });

    expect(secondResult.success).toBe(false);
    expect(secondResult.error).toMatch(/already running/);

    await first; // let the first finish
  });

  it('emits progress, launched, and closed events on a successful launch', async () => {
    const fakeChild = {
      pid: 4321,
      on: vi.fn((event: string, cb: (code?: number) => void) => {
        if (event === 'close') setTimeout(() => cb(0), 10);
      }),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      kill: vi.fn(),
    };
    vi.doMock('minecraft-launcher-core', () => ({
      launcher: vi.fn(() => fakeChild),
    }));

    const { LaunchService: LS } = await import('@/infrastructure/minecraft/launch-service');
    const svc = new LS(mockPaths(), mockHttp(), mockIntegrity(true));

    const progressEvents: unknown[] = [];
    const launchedEvents: number[] = [];
    const closedEvents: unknown[] = [];
    svc.on('progress', (p) => progressEvents.push(p));
    svc.on('launched', (pid) => launchedEvents.push(pid));
    svc.on('closed', (info) => closedEvents.push(info));

    const result = await svc.launch({
      options: baseOptions,
      java: { path: '/usr/bin/java', version: '17', source: 'system' },
      auth: { username: 'Steve', uuid: 'uuid', accessToken: 'tok' },
    });

    expect(result.success).toBe(true);
    expect(result.pid).toBe(4321);
    expect(launchedEvents).toContain(4321);
    expect(closedEvents).toHaveLength(1);
    expect(progressEvents.length).toBeGreaterThan(0);
    expect(svc.isRunning).toBe(false);
  });

  it('cancel kills the active child process', async () => {
    const killSpy = vi.fn();
    const fakeChild = {
      pid: 9999,
      on: vi.fn(), // never calls close — we cancel manually
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      kill: killSpy,
    };
    vi.doMock('minecraft-launcher-core', () => ({
      launcher: vi.fn(() => fakeChild),
    }));

    const { LaunchService: LS } = await import('@/infrastructure/minecraft/launch-service');
    const svc = new LS(mockPaths(), mockHttp(), mockIntegrity(true));

    const launchPromise = svc.launch({
      options: baseOptions,
      java: { path: '/usr/bin/java', version: '17', source: 'system' },
      auth: { username: 'Steve', uuid: 'uuid', accessToken: 'tok' },
    });

    svc.cancel();
    expect(killSpy).toHaveBeenCalledWith('SIGTERM');
  });
});

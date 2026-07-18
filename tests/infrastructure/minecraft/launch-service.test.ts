import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PathService } from '@/infrastructure/fs/path-service';
import type { HttpClient } from '@/infrastructure/net/http-client';
import type { IntegrityPolicyService } from '@/domain/services/integrity-policy';
import type { LaunchOptions } from '@shared/types';

function mockPaths(): PathService {
  return { minecraftRoot: '/tmp/mc', versions: '/tmp/mc/versions' } as unknown as PathService;
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

// Use vi.hoisted so these are available inside vi.mock factory
const { mockLaunchFn } = vi.hoisted(() => ({
  mockLaunchFn: vi.fn(),
}));

vi.mock('@/infrastructure/minecraft/mc-launcher', () => ({
  McLauncher: class {
    launch = mockLaunchFn;
    on = vi.fn();
    emit = vi.fn();
  },
}));

function createFakeChild(overrides: Partial<{ pid: number; kill: ReturnType<typeof vi.fn> }> = {}) {
  const closeCallbacks: Array<(code: number) => void> = [];
  const child = {
    pid: overrides.pid ?? 1234,
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (event === 'close') closeCallbacks.push(cb as (code: number) => void);
    }),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    kill: overrides.kill ?? vi.fn(),
    closeCallbacks,
  };
  return child;
}

import { LaunchService } from '@/infrastructure/minecraft/launch-service';

describe('LaunchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isRunning is false initially', () => {
    const svc = new LaunchService(mockPaths(), mockHttp(), mockIntegrity(true));
    expect(svc.isRunning).toBe(false);
  });

  it('rejects a second concurrent launch', async () => {
    const fakeChild = createFakeChild();
    mockLaunchFn.mockReturnValue(Promise.resolve(fakeChild));

    const svc = new LaunchService(mockPaths(), mockHttp(), mockIntegrity(true));

    const first = svc.launch({
      options: baseOptions,
      java: { path: '/usr/bin/java', version: '17', majorVersion: 17, source: 'system' },
      auth: { username: 'Steve', uuid: 'uuid', accessToken: 'tok' },
    });

    const secondResult = await svc.launch({
      options: { ...baseOptions, versionId: '1.19.2' },
      java: { path: '/usr/bin/java', version: '17', majorVersion: 17, source: 'system' },
      auth: { username: 'Steve', uuid: 'uuid', accessToken: 'tok' },
    });

    expect(secondResult.success).toBe(false);
    expect(secondResult.error).toMatch(/already running/);

    fakeChild.closeCallbacks.forEach((cb) => cb(0));
    await first;
  });

  it('emits progress, launched, and closed events on a successful launch', async () => {
    const fakeChild = createFakeChild({ pid: 4321 });
    setTimeout(() => fakeChild.closeCallbacks.forEach((cb) => cb(0)), 10);
    mockLaunchFn.mockReturnValue(Promise.resolve(fakeChild));

    const svc = new LaunchService(mockPaths(), mockHttp(), mockIntegrity(true));

    const progressEvents: unknown[] = [];
    const launchedEvents: number[] = [];
    const closedEvents: unknown[] = [];
    svc.on('progress', (p) => progressEvents.push(p));
    svc.on('launched', (pid) => launchedEvents.push(pid));
    svc.on('closed', (info) => closedEvents.push(info));

    const result = await svc.launch({
      options: baseOptions,
      java: { path: '/usr/bin/java', version: '17', majorVersion: 17, source: 'system' },
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
    const fakeChild = createFakeChild({ pid: 9999, kill: killSpy });
    mockLaunchFn.mockReturnValue(Promise.resolve(fakeChild));

    const svc = new LaunchService(mockPaths(), mockHttp(), mockIntegrity(true));

    const launchPromise = svc.launch({
      options: baseOptions,
      java: { path: '/usr/bin/java', version: '17', majorVersion: 17, source: 'system' },
      auth: { username: 'Steve', uuid: 'uuid', accessToken: 'tok' },
    });

    await new Promise((r) => setTimeout(r, 0));

    svc.cancel();
    expect(killSpy).toHaveBeenCalledWith('SIGTERM');

    fakeChild.closeCallbacks.forEach((cb) => cb(0));
    await launchPromise;
  });
});

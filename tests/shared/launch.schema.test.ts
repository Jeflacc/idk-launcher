import { describe, it, expect } from 'vitest';
import { LaunchSchema } from '@shared/schemas/launch.schema';

describe('LaunchSchema.options', () => {
  it('accepts a minimal valid options object with defaults applied', () => {
    const r = LaunchSchema.options.parse({
      versionId: '1.20.1',
    });
    expect(r.loader).toBe('vanilla');
    expect(r.autoOptimization).toBe(true);
    expect(r.performanceRenderer).toBe(false);
    expect(r.forceUpdate).toBe(false);
    expect(r.authProvider).toBe('microsoft');
    expect(r.javaArgs).toEqual([]);
  });

  it('accepts all fields', () => {
    const r = LaunchSchema.options.parse({
      versionId: '1.20.1',
      modpackId: 'mp-1',
      loader: 'fabric',
      loaderVersion: '0.15',
      javaPath: '/usr/bin/java',
      maxMemoryMb: 8192,
      minMemoryMb: 2048,
      javaArgs: ['-Xmx8G'],
      windowSize: { width: 1920, height: 1080 },
      autoOptimization: false,
      performanceRenderer: true,
      quickConnect: 'localhost:25565',
      forceUpdate: true,
      authProvider: 'elyby',
    });
    expect(r.maxMemoryMb).toBe(8192);
    expect(r.windowSize?.width).toBe(1920);
  });

  it('rejects an invalid loader', () => {
    const r = LaunchSchema.options.safeParse({ versionId: '1.20.1', loader: 'liteloader' });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid authProvider', () => {
    const r = LaunchSchema.options.safeParse({ versionId: '1.20.1', authProvider: 'google' });
    expect(r.success).toBe(false);
  });

  it('rejects negative maxMemoryMb', () => {
    const r = LaunchSchema.options.safeParse({ versionId: '1.20.1', maxMemoryMb: -1 });
    expect(r.success).toBe(false);
  });

  it('rejects maxMemoryMb above 32768', () => {
    const r = LaunchSchema.options.safeParse({ versionId: '1.20.1', maxMemoryMb: 40000 });
    expect(r.success).toBe(false);
  });

  it('rejects non-positive window dimensions', () => {
    const r = LaunchSchema.options.safeParse({ versionId: '1.20.1', windowSize: { width: 0, height: 480 } });
    expect(r.success).toBe(false);
  });
});

describe('LaunchSchema.progress', () => {
  it('accepts a valid progress event', () => {
    const r = LaunchSchema.progress.safeParse({
      type: 'assets',
      phase: 'downloading',
      completed: 5,
      total: 10,
    });
    expect(r.success).toBe(true);
  });

  it('rejects an invalid type', () => {
    const r = LaunchSchema.progress.safeParse({
      type: 'invalid',
      phase: 'downloading',
      completed: 5,
      total: 10,
    });
    expect(r.success).toBe(false);
  });
});

describe('LaunchSchema.result', () => {
  it('accepts a success result', () => {
    const r = LaunchSchema.result.safeParse({ success: true, pid: 1234 });
    expect(r.success).toBe(true);
  });

  it('accepts a failure result', () => {
    const r = LaunchSchema.result.safeParse({ success: false, error: 'boom' });
    expect(r.success).toBe(true);
  });
});

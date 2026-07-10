import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TunnelService } from '@/infrastructure/tunnel/tunnel-service';
import type { PathService } from '@/infrastructure/fs/path-service';
import type { HttpClient } from '@/infrastructure/net/http-client';

// vi.mock is hoisted above all declarations. Use vi.hoisted to create the
// mock function in the hoisted phase so the factory can reference it.
const { mockSpawn } = vi.hoisted(() => ({
  mockSpawn: vi.fn(() => ({
    on: vi.fn(),
    kill: vi.fn(),
    pid: 12345,
  })),
}));

vi.mock('node:child_process', () => ({ spawn: mockSpawn }));

function mockPaths(): PathService {
  return { frpcBinary: '/tmp/frpc' } as unknown as PathService;
}

function mockHttp(): HttpClient {
  return {} as unknown as HttpClient;
}

describe('TunnelService', () => {
  let service: TunnelService;

  beforeEach(() => {
    mockSpawn.mockClear();
    service = new TunnelService(mockPaths(), mockHttp());
    vi.spyOn(service, 'ensureFrpc').mockResolvedValue('/tmp/frpc');
  });

  it('isRunning is false initially', () => {
    expect(service.isRunning).toBe(false);
  });

  it('start rejects an empty token', async () => {
    await expect(service.start({ localPort: 25565, token: '' })).rejects.toThrow(/token is required/);
  });

  it('start rejects a short token (< 8 chars)', async () => {
    await expect(service.start({ localPort: 25565, token: 'short' })).rejects.toThrow(/token is required/);
  });

  it('start spawns frpc with the correct arguments', async () => {
    await service.start({ localPort: 25565, token: 'valid-token-123' });
    expect(mockSpawn).toHaveBeenCalledTimes(1);
    const args = mockSpawn.mock.calls[0]!;
    expect(args[0]).toBe('/tmp/frpc');
    expect(args[1]).toContain('http');
    expect(args[1]).toContain('--local_port=25565');
    expect(args[1]).toContain('--token=valid-token-123');
    expect(service.isRunning).toBe(true);
  });

  it('start rejects when a tunnel is already running', async () => {
    await service.start({ localPort: 25565, token: 'valid-token-123' });
    await expect(service.start({ localPort: 25566, token: 'valid-token-456' })).rejects.toThrow(/already running/);
  });

  it('stop clears the active tunnel', async () => {
    await service.start({ localPort: 25565, token: 'valid-token-123' });
    service.stop();
    expect(service.isRunning).toBe(false);
  });

  it('emits closed when the child process closes', async () => {
    const onClosed = vi.fn();
    service.on('closed', onClosed);

    let closeCallback: (() => void) | null = null;
    mockSpawn.mockImplementationOnce(() => ({
      on: vi.fn((event: string, cb: () => void) => {
        if (event === 'close') closeCallback = cb;
      }),
      kill: vi.fn(),
      pid: 12345,
    }));

    await service.start({ localPort: 25565, token: 'valid-token-123' });
    closeCallback?.();
    expect(onClosed).toHaveBeenCalled();
  });
});

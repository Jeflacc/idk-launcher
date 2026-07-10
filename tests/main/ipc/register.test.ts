import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron's ipcMain.
const mockHandle = vi.fn();
const mockOn = vi.fn();
vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle, on: mockOn },
}));

const { registerInvoke, registerSend } = await import('@/main/ipc/register');
const { z } = await import('zod');

describe('registerInvoke', () => {
  beforeEach(() => {
    mockHandle.mockClear();
    mockOn.mockClear();
  });

  it('registers an ipcMain.handle listener', () => {
    registerInvoke('test:channel', z.string(), () => 'ok');
    expect(mockHandle).toHaveBeenCalledWith('test:channel', expect.any(Function));
  });

  it('calls the handler with parsed args on success', async () => {
    const handler = vi.fn(() => 'result');
    registerInvoke('test:channel', z.object({ x: z.number() }), handler);

    const registered = mockHandle.mock.calls[0]![1] as (e: unknown, raw: unknown) => Promise<unknown>;
    const result = await registered({}, { x: 42 });

    expect(handler).toHaveBeenCalledWith({}, { x: 42 });
    expect(result).toBe('result');
  });

  it('throws on invalid args', async () => {
    registerInvoke('test:channel', z.object({ x: z.number() }), () => 'ok');
    const registered = mockHandle.mock.calls[0]![1] as (e: unknown, raw: unknown) => Promise<unknown>;

    await expect(registered({}, { x: 'not-a-number' })).rejects.toThrow(/Invalid IPC arguments/);
  });

  it('runs the senderCheck and throws when it returns false', async () => {
    const senderCheck = vi.fn(() => false);
    registerInvoke('test:channel', z.void(), () => 'ok', { senderCheck });

    const registered = mockHandle.mock.calls[0]![1] as (e: unknown, raw: unknown) => Promise<unknown>;
    await expect(registered({}, undefined)).rejects.toThrow(/Unauthorized IPC sender/);
    expect(senderCheck).toHaveBeenCalled();
  });
});

describe('registerSend', () => {
  beforeEach(() => {
    mockHandle.mockClear();
    mockOn.mockClear();
  });

  it('registers an ipcMain.on listener', () => {
    registerSend('test:channel', z.string(), () => {});
    expect(mockOn).toHaveBeenCalledWith('test:channel', expect.any(Function));
  });

  it('calls the handler with parsed args on success', () => {
    const handler = vi.fn();
    registerSend('test:channel', z.string(), handler);

    const registered = mockOn.mock.calls[0]![1] as (e: unknown, raw: unknown) => void;
    registered({}, 'hello');

    expect(handler).toHaveBeenCalledWith({}, 'hello');
  });

  it('does NOT call the handler on invalid args (silently ignores)', () => {
    const handler = vi.fn();
    registerSend('test:channel', z.number(), handler);

    const registered = mockOn.mock.calls[0]![1] as (e: unknown, raw: unknown) => void;
    registered({}, 'not-a-number');

    expect(handler).not.toHaveBeenCalled();
  });

  it('skips the handler when senderCheck returns false', () => {
    const senderCheck = vi.fn(() => false);
    const handler = vi.fn();
    registerSend('test:channel', z.string(), handler, { senderCheck });

    const registered = mockOn.mock.calls[0]![1] as (e: unknown, raw: unknown) => void;
    registered({}, 'hello');

    expect(senderCheck).toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });
});

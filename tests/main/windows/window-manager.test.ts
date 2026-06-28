import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron's BrowserWindow + shell.
const mockWebContents = {
  setWindowOpenHandler: vi.fn(),
  send: vi.fn(),
  mainFrame: {},
  isDestroyed: vi.fn(() => false),
  toggleDevTools: vi.fn(),
};
const mockWindow = {
  on: vi.fn(),
  once: vi.fn(),
  show: vi.fn(),
  minimize: vi.fn(),
  maximize: vi.fn(),
  unmaximize: vi.fn(),
  isMaximized: vi.fn(() => false),
  close: vi.fn(),
  isDestroyed: vi.fn(() => false),
  hide: vi.fn(),
  setIgnoreMouseEvents: vi.fn(),
  loadURL: vi.fn().mockResolvedValue(undefined),
  loadFile: vi.fn().mockResolvedValue(undefined),
  webContents: mockWebContents,
};
const BrowserWindowCtor = vi.fn(function () {
  return mockWindow;
});

vi.mock('electron', () => ({
  BrowserWindow: BrowserWindowCtor,
  shell: { openExternal: vi.fn() },
}));

const { WindowManager } = await import('@/main/windows/window-manager');

describe('WindowManager', () => {
  let wm: InstanceType<typeof WindowManager>;

  beforeEach(() => {
    BrowserWindowCtor.mockClear();
    (mockWindow.on as ReturnType<typeof vi.fn>).mockClear();
    (mockWindow.once as ReturnType<typeof vi.fn>).mockClear();
    wm = new WindowManager('/fake/preload.cjs', '/fake/dist');
  });

  it('create returns a BrowserWindow', () => {
    const win = wm.create({ id: 'main', width: 1280, height: 800 });
    expect(win).toBeDefined();
    expect(BrowserWindowCtor).toHaveBeenCalledTimes(1);
  });

  it('create uses sandbox:true, contextIsolation:true, nodeIntegration:false', () => {
    wm.create({ id: 'main', width: 800, height: 600 });
    const opts = BrowserWindowCtor.mock.calls[0]![0];
    expect(opts.webPreferences.sandbox).toBe(true);
    expect(opts.webPreferences.contextIsolation).toBe(true);
    expect(opts.webPreferences.nodeIntegration).toBe(false);
    expect(opts.webPreferences.webSecurity).toBe(true);
  });

  it('create returns the existing window if called twice with the same id', () => {
    wm.create({ id: 'main', width: 800, height: 600 });
    wm.create({ id: 'main', width: 800, height: 600 });
    expect(BrowserWindowCtor).toHaveBeenCalledTimes(1);
  });

  it('get returns null for unknown window ids', () => {
    expect(wm.get('overlay')).toBeNull();
  });

  it('get returns the window after creation', () => {
    wm.create({ id: 'main', width: 800, height: 600 });
    expect(wm.get('main')).toBeDefined();
  });

  it('send is a no-op when the window does not exist', () => {
    expect(() => wm.send('overlay', 'channel', 'data')).not.toThrow();
  });

  it('send calls webContents.send when the window exists', () => {
    wm.create({ id: 'main', width: 800, height: 600 });
    mockWebContents.send.mockClear();
    wm.send('main', 'test:event', { data: 1 });
    expect(mockWebContents.send).toHaveBeenCalledWith('test:event', { data: 1 });
  });

  it('assertSender returns true when the sender matches the expected window', () => {
    wm.create({ id: 'main', width: 800, height: 600 });
    const event = { senderFrame: mockWebContents.mainFrame } as unknown as Electron.IpcMainInvokeEvent;
    expect(wm.assertSender(event, 'main')).toBe(true);
  });

  it('assertSender returns false when the sender does not match', () => {
    wm.create({ id: 'main', width: 800, height: 600 });
    const event = { senderFrame: {} } as unknown as Electron.IpcMainInvokeEvent;
    expect(wm.assertSender(event, 'main')).toBe(false);
  });

  it('frameless option sets frame:false', () => {
    wm.create({ id: 'main', width: 800, height: 600, frameless: true });
    const opts = BrowserWindowCtor.mock.calls[0]![0];
    expect(opts.frame).toBe(false);
  });

  it('transparent option sets transparent:true', () => {
    wm.create({ id: 'main', width: 800, height: 600, transparent: true });
    const opts = BrowserWindowCtor.mock.calls[0]![0];
    expect(opts.transparent).toBe(true);
  });

  it('clickThrough option calls setIgnoreMouseEvents', () => {
    wm.create({ id: 'overlay', width: 400, height: 300, clickThrough: true });
    expect(mockWindow.setIgnoreMouseEvents).toHaveBeenCalledWith(true, { forward: true });
  });
});

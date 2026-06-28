import { BrowserWindow, shell, IpcMainInvokeEvent } from 'electron';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';

export interface WindowOptions {
  id: 'main' | 'overlay' | 'splash';
  width: number;
  height: number;
  frameless?: boolean;
  transparent?: boolean;
  alwaysOnTop?: boolean;
  skipTaskbar?: boolean;
  clickThrough?: boolean;
  devUrl?: string;
  productionFile?: string;
}

interface ManagedWindow {
  window: BrowserWindow;
  options: WindowOptions;
}

/**
 * Centralized window manager. Replaces v1's three ad-hoc BrowserWindow
 * creation sites in electron-main.cjs (one of which embedded a 60-line
 * PowerShell heredoc for bounds tracking).
 *
 * Every window is created with:
 *   - contextIsolation: true
 *   - nodeIntegration: false
 *   - sandbox: true                 (v1 had NO sandboxed windows)
 *   - preload pointing at our typed preload script
 */
export class WindowManager extends EventEmitter {
  private readonly windows = new Map<string, ManagedWindow>();
  private isDev: boolean;

  constructor(private readonly preloadPath: string, private readonly rendererDistDir: string) {
    super();
    this.isDev = Boolean(process.env['VITE_DEV_SERVER_URL']);
  }

  create(opts: WindowOptions): BrowserWindow {
    const existing = this.windows.get(opts.id);
    if (existing) return existing.window;

    const window = new BrowserWindow({
      width: opts.width,
      height: opts.height,
      frame: !opts.frameless,
      transparent: opts.transparent ?? false,
      alwaysOnTop: opts.alwaysOnTop ?? false,
      skipTaskbar: opts.skipTaskbar ?? false,
      resizable: opts.id === 'main',
      show: false,
      backgroundColor: opts.transparent ? '#00000000' : '#0b0f1a',
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        devTools: this.isDev,
      },
    });

    if (opts.clickThrough) {
      window.setIgnoreMouseEvents(true, { forward: true });
    }

    window.once('ready-to-show', () => window.show());
    window.on('closed', () => this.windows.delete(opts.id));
    window.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url);
      return { action: 'deny' };
    });

    this.windows.set(opts.id, { window, options: opts });
    this.load(window, opts);
    return window;
  }

  get(id: 'main' | 'overlay' | 'splash'): BrowserWindow | null {
    return this.windows.get(id)?.window ?? null;
  }

  send(id: 'main' | 'overlay' | 'splash', channel: string, ...args: unknown[]): void {
    const win = this.get(id);
    if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
  }

  private async load(window: BrowserWindow, opts: WindowOptions): Promise<void> {
    if (this.isDev && opts.devUrl) {
      await window.loadURL(opts.devUrl);
    } else if (opts.productionFile) {
      await window.loadFile(join(this.rendererDistDir, opts.productionFile));
    }
  }

  /** Validate that an IPC event originates from a known, trusted window. */
  assertSender(event: IpcMainInvokeEvent, expected: 'main' | 'overlay' | 'splash' = 'main'): boolean {
    const sender = event.senderFrame;
    const expectedWindow = this.get(expected);
    if (!expectedWindow) return false;
    return sender === expectedWindow.webContents.mainFrame;
  }
}

import { ipcMain, IpcMainInvokeEvent, ipcRenderer } from 'electron';
import { z } from 'zod';

/**
 * Typed IPC registration helpers. Replaces v1's 75 untyped, unvalidated
 * `ipcMain.handle`/`ipcMain.on` calls.
 *
 * Every handler:
 *   1. Validates the sender frame against the expected window.
 *   2. Validates arguments with a zod schema.
 *   3. Returns a typed result or throws.
 */

type InvokeHandler<T> = (event: IpcMainInvokeEvent, args: T) => unknown | Promise<unknown>;

export function registerInvoke<T>(
  channel: string,
  schema: z.ZodType<T>,
  handler: InvokeHandler<T>,
  options: { senderCheck?: (event: IpcMainInvokeEvent) => boolean } = {},
): void {
  ipcMain.handle(channel, async (event, raw) => {
    if (options.senderCheck && !options.senderCheck(event)) {
      throw new Error(`Unauthorized IPC sender on channel: ${channel}`);
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid IPC arguments on ${channel}: ${parsed.error.message}`);
    }
    return handler(event, parsed.data);
  });
}

export function registerSend<T>(
  channel: string,
  schema: z.ZodType<T>,
  handler: (event: IpcMainInvokeEvent, args: T) => void,
  options: { senderCheck?: (event: IpcMainInvokeEvent) => boolean } = {},
): void {
  ipcMain.on(channel, (event, raw) => {
    if (options.senderCheck && !options.senderCheck(event)) {
      return;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      // Silent drops make the renderer appear "stuck" with no terminal output —
      // always surface the rejection so bugs are visible during dev.
      const msg = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
      console.error(`[IPC] Invalid payload on "${channel}": ${msg}`);
      return;
    }
    handler(event, parsed.data);
  });
}

/** Bridge an EventEmitter emission to a renderer `webContents.send`. */
export function forwardEvent(
  emitter: { on: (event: string, listener: (...args: unknown[]) => void) => unknown },
  eventName: string,
  channel: string,
  serialize: (...args: unknown[]) => unknown[],
  target: () => Electron.WebContents | null,
): void {
  emitter.on(eventName, (...args: unknown[]) => {
    const wc = target();
    if (wc && !wc.isDestroyed()) {
      wc.send(channel, ...serialize(...args));
    }
  });
}

export type IpcRendererLike = typeof ipcRenderer;

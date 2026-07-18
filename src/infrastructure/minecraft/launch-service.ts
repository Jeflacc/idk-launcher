import { type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { LaunchOptions, LaunchProgress, LaunchResult } from '@shared/types';
import type { PathService } from '../fs/path-service';
import type { JavaInstallation } from '../fs/java-detector';
import type { HttpClient } from '../net/http-client';
import type { IntegrityPolicyService } from '@/domain/services/integrity-policy';
import { McLauncher } from './mc-launcher';

export interface LaunchContext {
  options: LaunchOptions;
  java: JavaInstallation;
  auth: {
    username: string;
    uuid: string;
    accessToken: string;
  };
  modpackDirectory?: string;
}

/**
 * The single Minecraft launch pipeline. Replaces v1's TWO duplicated launch
 * handlers (`launch-minecraft` ~570 lines + `launch-modpack` ~520 lines in
 * electron-main.cjs) with ONE typed entry point.
 *
 * Uses McLauncher (custom async launcher) instead of minecraft-launcher-core.
 * mclc used the deprecated `request` library which blocked the Node.js event
 * loop on Windows, causing the Electron window to become unresponsive.
 */
export class LaunchService extends EventEmitter {
  private active: ChildProcess | null = null;
  private startedAt: number | null = null;
  private launching = false;

  constructor(
    private readonly paths: PathService,
    private readonly http: HttpClient,
    _integrity: IntegrityPolicyService,
  ) {
    super();
  }

  get isRunning(): boolean {
    return this.active !== null;
  }

  async launch(ctx: LaunchContext): Promise<LaunchResult> {
    if (this.active || this.launching) {
      return { success: false, error: 'A game is already running' };
    }

    this.launching = true;
    try {
      this.startedAt = Date.now();

      const root = ctx.modpackDirectory ?? this.paths.minecraftRoot;
      const mcLauncher = new McLauncher(this.http);

      // Forward launcher events to the renderer AND log to terminal
      mcLauncher.on('debug', (msg: unknown) => {
        if (typeof msg === 'string') {
          console.log(msg);
          this.emit('warning', { message: msg.slice(0, 500) });
        }
      });
      mcLauncher.on('progress', (p: { type: string; phase: string; completed: number; total: number }) => {
        if (p.total > 0) {
          this.emitProgress({
            type: p.type as 'assets' | 'libraries' | 'starting',
            phase: p.phase as 'downloading' | 'done',
            completed: p.completed,
            total: p.total,
          });
        }
      });
      mcLauncher.on('data', (msg: unknown) => {
        if (typeof msg === 'string') {
          const line = msg.trim();
          if (line) console.log('[MC]', line.slice(0, 500));
          this.emit('warning', { message: line.slice(0, 500) });
        }
      });

      this.emitProgress({ type: 'starting', phase: 'downloading', completed: 0, total: 1 });

      const child = await mcLauncher.launch({
        root,
        versionId: ctx.options.versionId,
        javaPath: ctx.java.path,
        memory: {
          max: ctx.options.maxMemoryMb ?? 4096,
          min: ctx.options.minMemoryMb ?? 1024,
        },
        auth: {
          access_token: ctx.auth.accessToken,
          client_token: 'idk-launcher',
          uuid: ctx.auth.uuid,
          name: ctx.auth.username,
          user_properties: '{}',
        },
        windowSize: ctx.options.windowSize,
        customArgs: ctx.options.javaArgs,
      });

      if (!child) {
        return { success: false, error: 'Failed to start Minecraft process — check Java path and try again' };
      }
      this.active = child;
      const pid = child.pid ?? 0;
      this.emitProgress({ type: 'starting', phase: 'done', completed: 1, total: 1 });
      this.emit('launched', pid);

      let lastOutput = '';
      await new Promise<void>((resolve, reject) => {
        this.active!.on('close', (code) => {
          const crashed = code !== null && code !== 0;
          this.onClosed(crashed, code ?? undefined, lastOutput);
          resolve();
        });
        this.active!.on('error', (err) => reject(err));
        this.active!.stdout?.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf8');
          lastOutput = (lastOutput + text).slice(-1000);
          if (/warning|deprecat/i.test(text)) {
            this.emit('warning', { message: text.trim().slice(0, 500) });
          }
        });
        this.active!.stderr?.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf8');
          lastOutput = (lastOutput + text).slice(-1000);
          this.emit('warning', { message: text.trim().slice(0, 500) });
        });
      });

      return { success: true, pid };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emit('error', message);
      this.onClosed(true);
      return { success: false, error: message };
    } finally {
      this.launching = false;
    }
  }

  cancel(): void {
    if (this.active) {
      try {
        this.active.kill('SIGTERM');
      } catch {
        // ignore — process may have already exited
      }
    }
  }

  private onClosed(crashed: boolean, code?: number, output?: string): void {
    const duration = this.startedAt ? Math.floor((Date.now() - this.startedAt) / 1000) : 0;
    this.active = null;
    this.startedAt = null;
    this.emit('closed', { duration, crashed, code, output });
  }

  private emitProgress(p: LaunchProgress): void {
    this.emit('progress', p);
  }
}

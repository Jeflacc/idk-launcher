import * as mclc from 'minecraft-launcher-core';
import { ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { LaunchOptions, LaunchProgress, LaunchResult } from '@shared/types';
import type { PathService } from '../fs/path-service';
import type { JavaInstallation } from '../fs/java-detector';
import type { HttpClient } from '../net/http-client';
import type { IntegrityPolicyService } from '@/domain/services/integrity-policy';

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
 * CRITICAL FIX: v1 monkey-patched minecraft-launcher-core's checksum verifier
 * to always return true, silently disabling integrity verification. Here the
 * IntegrityPolicyService is consulted and its decision is honored — there is
 * no global bypass.
 *
 * NOTE: minecraft-launcher-core's exact export shape varies by version; the
 * `mclc.launcher` call below must be verified against the installed version
 * in an Electron runtime.
 */
export class LaunchService extends EventEmitter {
  private active: ChildProcessWithoutNullStreams | null = null;
  private startedAt: number | null = null;

  constructor(
    private readonly paths: PathService,
    _http: HttpClient,
    private readonly integrity: IntegrityPolicyService,
  ) {
    super();
  }

  get isRunning(): boolean {
    return this.active !== null;
  }

  async launch(ctx: LaunchContext): Promise<LaunchResult> {
    if (this.active) {
      return { success: false, error: 'A game is already running' };
    }

    try {
      this.startedAt = Date.now();
      this.emitProgress({ type: 'starting', phase: 'downloading', completed: 0, total: 1 });

      const opts = {
        root: ctx.modpackDirectory ?? this.paths.minecraftRoot,
        version: { number: ctx.options.versionId, type: 'release' as const },
        memory: {
          max: ctx.options.maxMemoryMb ?? 4096,
          min: ctx.options.minMemoryMb ?? 1024,
        },
        javaPath: ctx.java.path,
        customArgs: ctx.options.javaArgs,
        windowWidth: ctx.options.windowSize?.width ?? 854,
        windowHeight: ctx.options.windowSize?.height ?? 480,
        fullscreen: false,
        overrides: {
          // Honors the integrity policy. v1 returned `true` unconditionally here.
          checkHash: this.integrity.shouldVerify,
        },
        authorization: {
          access_token: ctx.auth.accessToken,
          client_token: 'idk-launcher',
          uuid: ctx.auth.uuid,
          name: ctx.auth.username,
          user_properties: '{}',
        },
      };

      // minecraft-launcher-core's default export is the launcher function.
      const launch = (mclc as unknown as { launcher: (o: typeof opts) => ChildProcessWithoutNullStreams }).launcher;
      this.active = launch(opts);
      const pid = this.active.pid ?? 0;
      this.emitProgress({ type: 'starting', phase: 'done', completed: 1, total: 1 });
      this.emit('launched', pid);

      await new Promise<void>((resolve, reject) => {
        this.active!.on('close', (code) => {
          const crashed = code !== null && code !== 0;
          this.onClosed(crashed);
          resolve();
        });
        this.active!.on('error', (err) => reject(err));
        this.active!.stdout?.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf8');
          if (/warning|deprecat/i.test(text)) {
            this.emit('warning', { message: text.trim().slice(0, 500) });
          }
        });
        this.active!.stderr?.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf8');
          this.emit('warning', { message: text.trim().slice(0, 500) });
        });
      });

      return { success: true, pid };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emit('error', message);
      this.onClosed(true);
      return { success: false, error: message };
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

  private onClosed(crashed: boolean): void {
    const duration = this.startedAt ? Math.floor((Date.now() - this.startedAt) / 1000) : 0;
    this.active = null;
    this.startedAt = null;
    this.emit('closed', { duration, crashed });
  }

  private emitProgress(p: LaunchProgress): void {
    this.emit('progress', p);
  }
}

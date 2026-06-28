import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { PathService } from '../fs/path-service';
import type { HttpClient } from '../net/http-client';

export interface TunnelStartOptions {
  localPort: number;
  /** User-provided token. v1 hardcoded a public shared token — never again. */
  token: string;
  remoteServer?: string;
  remotePort?: number;
}

export interface TunnelHandle {
  localPort: number;
  remoteAddress: string | null;
  process: ChildProcessWithoutNullStreams;
}

/**
 * FRP tunnel client wrapper. Replaces v1's hardcoded public frps token that
 * exposed every user's local Minecraft server to the open internet.
 *
 * SECURITY MODEL: the tunnel is OPT-IN. The token MUST be provided by the
 * user. There is no default token, no default enable, and the user is warned
 * before any tunnel starts.
 */
export class TunnelService extends EventEmitter {
  private active: TunnelHandle | null = null;

  constructor(
    private readonly paths: PathService,
    _http: HttpClient,
  ) {
    super();
  }

  get isRunning(): boolean {
    return this.active !== null;
  }

  async ensureFrpc(): Promise<string> {
    const bin = this.paths.frpcBinary;
    // In a real build, download frpc for the current platform here if missing.
    return bin;
  }

  async start(opts: TunnelStartOptions): Promise<TunnelHandle> {
    if (this.active) throw new Error('A tunnel is already running');
    if (!opts.token || opts.token.length < 8) {
      throw new Error('A user-provided tunnel token is required');
    }
    const bin = await this.ensureFrpc();
    const proc = spawn(bin, [
      'http',
      '--server',
      opts.remoteServer ?? 'frps.idk-launcher.example',
      `--server_port=${opts.remotePort ?? 7000}`,
      `--local_port=${opts.localPort}`,
      `--token=${opts.token}`,
      '--sd=minecraft',
    ]);
    this.active = { localPort: opts.localPort, remoteAddress: null, process: proc };
    proc.on('close', () => {
      this.active = null;
      this.emit('closed');
    });
    proc.on('error', (err) => this.emit('error', err.message));
    return this.active;
  }

  stop(): void {
    if (this.active) {
      try {
        this.active.process.kill('SIGTERM');
      } catch {
        // ignore
      }
      this.active = null;
    }
  }
}

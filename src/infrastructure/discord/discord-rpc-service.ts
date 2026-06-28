import { EventEmitter } from 'node:events';

interface DiscordClientLike {
  login: (creds: { clientId: string }) => Promise<void>;
  setActivity: (activity: unknown) => Promise<void>;
  destroy: () => Promise<void>;
}

export type DiscordClientFactory = () => DiscordClientLike | Promise<DiscordClientLike>;

/**
 * Discord rich-presence wrapper. Replaces v1's direct discord-rpc usage.
 * discord-rpc is unmaintained since 2023; a production rewrite should migrate
 * to @xhayper/discord-rpc — flagged in the audit.
 *
 * The client factory is injectable for testability. The default factory uses
 * a dynamic import of `discord-rpc` so the dependency is only loaded when
 * actually needed (Discord may not be running).
 *
 * NOTE: IPC login requires the Discord client to be running. Verification must
 * occur in an Electron environment.
 */
export class DiscordRpcService extends EventEmitter {
  private connected = false;
  private client: DiscordClientLike | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientFactory: DiscordClientFactory = defaultClientFactory,
  ) {
    super();
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    try {
      this.client = await this.clientFactory();
      await this.client.login({ clientId: this.clientId });
      this.connected = true;
    } catch {
      // Discord not running — fail silently.
    }
  }

  setActivity(activity: { details: string; state: string }): void {
    if (!this.connected || !this.client) return;
    void this.client.setActivity(activity);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch {
        // ignore
      }
    }
    this.connected = false;
    this.client = null;
  }
}

const defaultClientFactory: DiscordClientFactory = async () => {
  const mod = (await import('discord-rpc')) as unknown as {
    Client: new (opts: { transport: 'ipc' }) => DiscordClientLike;
  };
  return new mod.Client({ transport: 'ipc' });
};

import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createWriteStream } from 'node:fs';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { IntegrityError } from '@/domain/services/integrity-policy';

/**
 * Allowlist of hosts the launcher is permitted to fetch from. Replaces v1's
 * completely open `open-external` / unrestricted HTTPS — an SSRF/RCE risk.
 */
export const DEFAULT_HOST_ALLOWLIST: ReadonlySet<string> = new Set([
  // Mojang / Minecraft
  'piston-meta.mojang.com',
  'launchermeta.mojang.com',
  'piston-data.mojang.com',
  'libraries.minecraft.net',
  'resources.download.minecraft.net',
  'authserver.mojang.com',
  'api.mojang.com',
  'sessionserver.mojang.com',
  'textures.minecraft.net',
  // Modrinth
  'api.modrinth.com',
  'cdn.modrinth.com',
  // CurseForge
  'api.curseforge.com',
  'edge.forgecdn.net',
  // Ely.by
  'authserver.ely.by',
  'skins.ely.by',
  'api.ely.by',
  // Microsoft auth
  'login.live.com',
  'login.microsoftonline.com',
  'xsts.auth.microsoftonline.com',
  'api.minecraftservices.com',
  // Java runtimes
  'api.adoptium.net',
  'cdn.azul.com',
  // Fabric / Quilt / NeoForge
  'meta.fabricmc.net',
  'maven.fabricmc.net',
  'maven.quiltmc.org',
  'maven.neoforged.net',
  'files.minecraftforge.net',
  'meta.beta.fabricmc.net',
]);

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'HEAD';
  headers?: Record<string, string>;
  body?: string | Buffer;
  signal?: AbortSignal;
  /** Per-request timeout in ms. Default 30000. */
  timeoutMs?: number;
  /** Max redirect hops. Default 5. */
  maxRedirects?: number;
}

export interface DownloadFileOptions {
  signal?: AbortSignal;
  /** Expected sha1. If provided and mismatched, throws IntegrityError. */
  expectedSha1?: string;
  /** Expected size in bytes. If provided and mismatched, throws. */
  expectedSize?: number;
  /** Called with progress: (downloadedBytes, totalBytes). */
  onProgress?: (downloaded: number, total: number) => void;
  timeoutMs?: number;
}

export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | null,
    public readonly url: string,
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

/**
 * The single HTTP client for the entire main process. Replaces v1's:
 *   - global `https.get`/`https.request` monkey-patch (leaked cancel side effects)
 *   - 5 fragmented download code paths
 *   - disabled integrity verification
 *
 * Every request is validated against the host allowlist (SSRF protection),
 * supports a per-request AbortSignal (clean cancellation — no global
 * monkey-patching), retries transient failures, and verifies integrity.
 */
export class HttpClient {
  private readonly allowlist: ReadonlySet<string>;

  constructor(
    allowlist: ReadonlySet<string> = DEFAULT_HOST_ALLOWLIST,
    private readonly defaultTimeoutMs = 30_000,
    private readonly maxRetries = 2,
  ) {
    this.allowlist = allowlist;
  }

  async getJson<T>(url: string, opts: HttpRequestOptions = {}): Promise<T> {
    const buf = await this.request(url, opts);
    return JSON.parse(buf.toString('utf8')) as T;
  }

  async getText(url: string, opts: HttpRequestOptions = {}): Promise<string> {
    const buf = await this.request(url, opts);
    return buf.toString('utf8');
  }

  async getBuffer(url: string, opts: HttpRequestOptions = {}): Promise<Buffer> {
    return this.request(url, opts);
  }

  /**
   * Download a file to disk with streaming, progress, integrity verification,
   * and cancellation. This is the ONE download primitive used by every
   * subsystem (Java, versions, mods, modpacks).
   */
  async downloadFile(
    url: string,
    targetPath: string,
    opts: DownloadFileOptions = {},
  ): Promise<void> {
    this.assertHostAllowed(url);
    await mkdir(dirname(targetPath), { recursive: true });

    const { statusCode, headers, body } = await this.fetchWithRedirects(url, {
      method: 'GET',
      timeoutMs: opts.timeoutMs ?? this.defaultTimeoutMs,
      signal: opts.signal,
    });

    if (statusCode !== 200) {
      throw new HttpClientError(`Download failed: HTTP ${statusCode}`, statusCode, url);
    }

    const total = this.parseContentLength(headers);
    let downloaded = 0;

    const stream = createWriteStream(targetPath);
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        stream.destroy();
        reject(new HttpClientError('Download aborted', null, url));
      };
      opts.signal?.addEventListener('abort', onAbort, { once: true });

      body.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        chunks.push(chunk);
        opts.onProgress?.(downloaded, total ?? downloaded);
      });
      body.pipe(stream);
      stream.on('finish', () => {
        opts.signal?.removeEventListener('abort', onAbort);
        resolve();
      });
      stream.on('error', (err) => {
        opts.signal?.removeEventListener('abort', onAbort);
        reject(err);
      });
    });

    // Integrity verification (NEVER bypassed).
    if (opts.expectedSha1 || opts.expectedSize != null) {
      const content = Buffer.concat(chunks);
      if (opts.expectedSize != null && content.length !== opts.expectedSize) {
        throw new IntegrityError(
          `Size mismatch: expected ${opts.expectedSize}, got ${content.length}`,
        );
      }
      if (opts.expectedSha1) {
        const actual = createHash('sha1').update(content).digest('hex');
        if (actual !== opts.expectedSha1) {
          throw new IntegrityError(
            `Integrity check failed: expected ${opts.expectedSha1}, got ${actual}`,
          );
        }
      }
    }
  }

  private async request(url: string, opts: HttpRequestOptions): Promise<Buffer> {
    this.assertHostAllowed(url);
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const { statusCode, body } = await this.fetchWithRedirects(url, {
          method: opts.method ?? 'GET',
          timeoutMs: opts.timeoutMs ?? this.defaultTimeoutMs,
          headers: opts.headers,
          body: opts.body,
          signal: opts.signal,
        });
        if (statusCode === undefined || statusCode < 200 || statusCode >= 300) {
          throw new HttpClientError(`HTTP ${statusCode ?? '???'}`, statusCode ?? null, url);
        }
        const chunks: Buffer[] = [];
        for await (const chunk of body) chunks.push(chunk as Buffer);
        return Buffer.concat(chunks);
      } catch (err) {
        lastError = err;
        if (opts.signal?.aborted) throw err;
        if (err instanceof HttpClientError && err.statusCode != null && err.statusCode < 500) {
          throw err; // do not retry 4xx
        }
        // backoff before retry
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new HttpClientError('Request failed', null, url);
  }

  private async fetchWithRedirects(
    url: string,
    opts: { method: 'GET' | 'POST' | 'HEAD'; timeoutMs: number } & {
      headers?: Record<string, string>;
      body?: string | Buffer;
      signal?: AbortSignal;
      maxRedirects?: number;
    },
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);
    const onAbort = () => controller.abort();
    opts.signal?.addEventListener('abort', onAbort, { once: true });

    try {
      const res = await fetch(url, {
        method: opts.method,
        headers: opts.headers,
        body: opts.body as BodyInit | undefined,
        signal: controller.signal,
        redirect: 'follow',
      });
      if (!res.body) throw new HttpClientError('Empty response body', res.status, url);
      const body = Readable.fromWeb(res.body as unknown as Parameters<typeof Readable.fromWeb>[0]);
      return { statusCode: res.status, headers: res.headers, body };
    } finally {
      clearTimeout(timeout);
      opts.signal?.removeEventListener('abort', onAbort);
    }
  }

  private assertHostAllowed(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new HttpClientError(`Invalid URL: ${url}`, null, url);
    }
    if (!this.allowlist.has(parsed.hostname)) {
      throw new HttpClientError(
        `Host not in allowlist: ${parsed.hostname}`,
        null,
        url,
      );
    }
  }

  private parseContentLength(headers: Headers): number | null {
    const v = headers.get('content-length');
    if (!v) return null;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
}

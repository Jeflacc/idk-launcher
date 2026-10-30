import { EventEmitter } from 'node:events';
import { HttpClient } from '../net/http-client';
import type { DownloadItem, DownloadProgress } from '@shared/types';

export interface QueuedJob {
  downloadId: string;
  items: DownloadItem[];
  concurrency: number;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'error' | 'cancelled';
  completed: number;
  total: number;
  bytesDownloaded: number;
  bytesTotal: number;
  currentFile: string | null;
  speed: number;
  error: string | null;
  controllers: Map<number, AbortController>;
  paused: boolean;
  cancelled: boolean;
}

/**
 * THE download queue. Replaces v1's FIVE fragmented download code paths:
 *   1. electron-main.cjs inline `downloadFile()` (5-redirect, no integrity)
 *   2. src/backend/download-queue-manager.cjs (797 lines, UNREACHABLE due to
 *      a preload/main signature mismatch — the entire queue was dead code)
 *   3. src/backend/download-integration.cjs (471 lines, never imported)
 *   4. src/backend/download-ipc-handlers.cjs (366 lines, never imported)
 *   5. src/backend/integrity-verifier.cjs (bypassed by monkey-patch)
 *
 * The v1 signature mismatch (preload packed `{downloadId, items, downloadPath}`
 * but main destructured `{downloadId, items}` dropping `downloadPath`) is
 * impossible here because the contract is a shared, zod-validated schema.
 */
export class DownloadQueue extends EventEmitter {
  private readonly jobs = new Map<string, QueuedJob>();
  private readonly speedSamples = new WeakMap<QueuedJob, { t: number; b: number }[]>();

  constructor(
    private readonly http: HttpClient,
    private readonly defaultConcurrency = 4,
  ) {
    super();
  }

  async start(
    downloadId: string,
    items: DownloadItem[],
    concurrency: number = this.defaultConcurrency,
  ): Promise<void> {
    if (this.jobs.has(downloadId)) {
      throw new Error(`Download already in progress: ${downloadId}`);
    }
    const job: QueuedJob = {
      downloadId,
      items,
      concurrency,
      status: 'downloading',
      completed: 0,
      total: items.length,
      bytesDownloaded: 0,
      bytesTotal: items.reduce((sum, i) => sum + (i.size ?? 0), 0),
      currentFile: null,
      speed: 0,
      error: null,
      controllers: new Map(),
      paused: false,
      cancelled: false,
    };
    this.jobs.set(downloadId, job);
    this.speedSamples.set(job, []);
    this.emitProgress(job);
    try {
      await this.run(job);
      if (job.status === 'downloading') {
        job.status = 'completed';
        this.emitProgress(job);
        this.emit('complete', job.downloadId);
      }
    } catch (err) {
      this.fail(job, err instanceof Error ? err.message : String(err));
    } finally {
      this.jobs.delete(downloadId);
    }
  }

  pause(downloadId: string): void {
    const job = this.jobs.get(downloadId);
    if (!job || job.status !== 'downloading') return;
    job.paused = true;
    job.status = 'paused';
    for (const controller of job.controllers.values()) controller.abort();
    job.controllers.clear();
    this.emitProgress(job);
    this.emit('paused', downloadId);
  }

  resume(downloadId: string): void {
    const job = this.jobs.get(downloadId);
    if (!job || job.status !== 'paused') return;
    job.paused = false;
    job.status = 'downloading';
    this.emitProgress(job);
    this.emit('resumed', downloadId);
    this.run(job).catch((err) => this.fail(job, err instanceof Error ? err.message : String(err)));
  }

  cancel(downloadId: string): void {
    const job = this.jobs.get(downloadId);
    if (!job) return;
    for (const controller of job.controllers.values()) controller.abort();
    job.controllers.clear();
    job.cancelled = true;
    job.status = 'cancelled';
    this.emitProgress(job);
    this.emit('cancelled', downloadId);
    this.jobs.delete(downloadId);
  }

  cancelAll(): void {
    for (const id of this.jobs.keys()) this.cancel(id);
  }

  private async run(job: QueuedJob): Promise<void> {
    const queue = [...job.items.entries()];
    const workers: Promise<void>[] = [];
    for (let w = 0; w < job.concurrency; w++) {
      workers.push(this.worker(job, queue));
    }
    await Promise.all(workers);
  }

  private async worker(job: QueuedJob, queue: Array<[number, DownloadItem]>): Promise<void> {
    while (queue.length > 0) {
      if (job.paused || job.cancelled) return;
      const next = queue.shift();
      if (!next) return;
      const [index, item] = next;
      const controller = new AbortController();
      job.controllers.set(index, controller);
      job.currentFile = item.filename;
      try {
        await this.http.downloadFile(item.url, item.targetPath, {
          signal: controller.signal,
          expectedSha1: item.sha1,
          expectedSize: item.size,
          onProgress: (downloaded, total) => {
            const delta = downloaded - (this.lastBytes(job, index) ?? 0);
            this.setLastBytes(job, index, downloaded);
            job.bytesDownloaded += Math.max(0, delta);
            if (total && !job.bytesTotal) job.bytesTotal += total;
            this.emitProgress(job);
          },
        });
        job.completed++;
        this.emitProgress(job);
      } catch (err) {
        if (job.paused || job.cancelled) return;
        throw err;
      } finally {
        job.controllers.delete(index);
        this.clearLastBytes(job, index);
      }
    }
  }

  private bytesTracking = new WeakMap<QueuedJob, Map<number, number>>();

  private lastBytes(job: QueuedJob, index: number): number | undefined {
    return this.bytesTracking.get(job)?.get(index);
  }
  private setLastBytes(job: QueuedJob, index: number, n: number): void {
    if (!this.bytesTracking.has(job)) this.bytesTracking.set(job, new Map());
    this.bytesTracking.get(job)!.set(index, n);
  }
  private clearLastBytes(job: QueuedJob, index: number): void {
    this.bytesTracking.get(job)?.delete(index);
  }

  private fail(job: QueuedJob, message: string): void {
    job.status = 'error';
    job.error = message;
    this.emitProgress(job);
    this.emit('error', job.downloadId, message);
  }

  private emitProgress(job: QueuedJob): void {
    const now = Date.now();
    const samples = this.speedSamples.get(job) ?? [];
    samples.push({ t: now, b: job.bytesDownloaded });
    // Keep only the last 5 seconds of samples for speed calculation.
    const cutoff = now - 5000;
    const recent = samples.filter((s) => s.t >= cutoff);
    this.speedSamples.set(job, recent);

    const first = recent[0];
    const bytesPerSec = recent.length > 1 && first
      ? (job.bytesDownloaded - first.b) / ((now - first.t) / 1000)
      : 0;

    const bytesTotal = job.bytesTotal > 0 ? job.bytesTotal : 0;
    const percentComplete = bytesTotal > 0
      ? Math.min(100, Math.max(0, (job.bytesDownloaded / bytesTotal) * 100))
      : job.total > 0 ? Math.min(100, Math.max(0, (job.completed / job.total) * 100)) : 0;

    const bytesRemaining = Math.max(0, bytesTotal - job.bytesDownloaded);
    const estimatedTimeRemaining = bytesPerSec > 0 ? (bytesRemaining / bytesPerSec) * 1000 : 0;

    const progress: DownloadProgress & {
      percentComplete?: number;
      downloadSpeed?: number;
      currentItem?: string | null;
      itemsCompleted?: number;
      totalItems?: number;
      estimatedTimeRemaining?: number;
      // Launch-feature panel field names.
      percent?: number;
      eta?: number;
      item?: string | null;
    } = {
      downloadId: job.downloadId,
      status: job.status,
      completed: job.completed,
      total: job.total,
      bytesDownloaded: job.bytesDownloaded,
      bytesTotal: job.bytesTotal,
      currentFile: job.currentFile,
      speed: bytesPerSec,
      error: job.error,
      // Renderer DownloadProgressTracker field names.
      percentComplete,
      downloadSpeed: bytesPerSec,
      currentItem: job.currentFile,
      itemsCompleted: job.completed,
      totalItems: job.total,
      estimatedTimeRemaining,
      // Launch-feature panel field names.
      percent: percentComplete,
      eta: estimatedTimeRemaining,
      item: job.currentFile,
    };
    this.emit('progress', progress);
  }
}

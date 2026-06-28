import { describe, it, expect } from 'vitest';
import { DownloadSchema } from '@shared/schemas/download.schema';

describe('DownloadSchema.item', () => {
  it('accepts a minimal valid item', () => {
    const r = DownloadSchema.item.safeParse({
      url: 'https://x/y.jar',
      targetPath: '/tmp/y.jar',
      filename: 'y.jar',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.skipIfPresent).toBe(true);
  });

  it('rejects a non-url url', () => {
    const r = DownloadSchema.item.safeParse({ url: 'bad', targetPath: '/tmp/y', filename: 'y' });
    expect(r.success).toBe(false);
  });

  it('rejects a negative size', () => {
    const r = DownloadSchema.item.safeParse({ url: 'https://x', targetPath: '/t', filename: 'f', size: -1 });
    expect(r.success).toBe(false);
  });
});

describe('DownloadSchema.startRequest', () => {
  it('defaults concurrency to 4 when omitted', () => {
    const r = DownloadSchema.startRequest.parse({
      downloadId: 'dl-1',
      items: [{ url: 'https://x', targetPath: '/t', filename: 'f' }],
    });
    expect(r.concurrency).toBe(4);
  });

  it('rejects concurrency above 16', () => {
    const r = DownloadSchema.startRequest.safeParse({
      downloadId: 'dl-1',
      items: [],
      concurrency: 32,
    });
    expect(r.success).toBe(false);
  });

  it('rejects concurrency below 1', () => {
    const r = DownloadSchema.startRequest.safeParse({
      downloadId: 'dl-1',
      items: [],
      concurrency: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe('DownloadSchema.pause/resume/cancel requests', () => {
  it('pause requires a downloadId', () => {
    expect(DownloadSchema.pauseRequest.safeParse({ downloadId: 'dl-1' }).success).toBe(true);
    expect(DownloadSchema.pauseRequest.safeParse({}).success).toBe(false);
  });

  it('resume requires a downloadId', () => {
    expect(DownloadSchema.resumeRequest.safeParse({ downloadId: 'dl-1' }).success).toBe(true);
  });

  it('cancel requires a downloadId', () => {
    expect(DownloadSchema.cancelRequest.safeParse({ downloadId: 'dl-1' }).success).toBe(true);
  });
});

describe('DownloadSchema.progress', () => {
  it('accepts a valid progress payload', () => {
    const r = DownloadSchema.progress.safeParse({
      downloadId: 'dl-1',
      status: 'downloading',
      completed: 1,
      total: 5,
      bytesDownloaded: 1024,
      bytesTotal: 5120,
      currentFile: 'x.jar',
      speed: 100,
      error: null,
    });
    expect(r.success).toBe(true);
  });

  it('rejects an invalid status', () => {
    const r = DownloadSchema.progress.safeParse({
      downloadId: 'dl-1',
      status: 'unknown',
      completed: 1,
      total: 5,
      bytesDownloaded: 1,
      bytesTotal: 5,
      currentFile: null,
      speed: 1,
      error: null,
    });
    expect(r.success).toBe(false);
  });
});

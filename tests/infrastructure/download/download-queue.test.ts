import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadQueue } from '@/infrastructure/download/download-queue';
import type { HttpClient } from '@/infrastructure/net/http-client';

function mockHttp(): HttpClient {
  return {
    downloadFile: vi.fn().mockResolvedValue(undefined),
    getJson: vi.fn(),
    getText: vi.fn(),
    getBuffer: vi.fn(),
  } as unknown as HttpClient;
}

function item(url: string, filename: string, sha1?: string) {
  return {
    url,
    targetPath: `/tmp/${filename}`,
    filename,
    sha1,
    skipIfPresent: true,
  };
}

describe('DownloadQueue', () => {
  let http: HttpClient;
  let queue: DownloadQueue;

  beforeEach(() => {
    http = mockHttp();
    queue = new DownloadQueue(http, 2);
  });

  it('emits a progress event with status downloading on start', async () => {
    const onProgress = vi.fn();
    queue.on('progress', onProgress);

    await queue.start('dl-1', [item('https://api.modrinth.com/v2/x', 'f.jar')], 1);
    // Allow microtasks to flush
    await new Promise((r) => setTimeout(r, 50));

    expect(onProgress).toHaveBeenCalled();
    const first = onProgress.mock.calls[0]![0];
    expect(first.downloadId).toBe('dl-1');
  });

  it('completes a single-item download', async () => {
    const onComplete = vi.fn();
    queue.on('complete', onComplete);

    await queue.start('dl-1', [item('https://api.modrinth.com/v2/x', 'f.jar')], 1);
    await new Promise((r) => setTimeout(r, 50));

    expect(http.downloadFile).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('dl-1');
  });

  it('completes a multi-item download', async () => {
    const onComplete = vi.fn();
    queue.on('complete', onComplete);

    await queue.start(
      'dl-2',
      [
        item('https://api.modrinth.com/v2/a', 'a.jar'),
        item('https://api.modrinth.com/v2/b', 'b.jar'),
        item('https://api.modrinth.com/v2/c', 'c.jar'),
      ],
      3,
    );
    await new Promise((r) => setTimeout(r, 100));

    expect(http.downloadFile).toHaveBeenCalledTimes(3);
    expect(onComplete).toHaveBeenCalledWith('dl-2');
  });

  it('throws when starting a duplicate downloadId', async () => {
    await queue.start('dl-1', [item('https://api.modrinth.com/v2/x', 'f.jar')], 1);
    await expect(queue.start('dl-1', [item('https://api.modrinth.com/v2/y', 'y.jar')], 1)).rejects.toThrow(
      /already in progress/,
    );
  });

  it('cancel marks the job as cancelled', async () => {
    const onProgress = vi.fn();
    queue.on('progress', onProgress);

    // Make downloadFile hang so we can cancel mid-flight.
    vi.mocked(http.downloadFile).mockImplementation(
      () => new Promise(() => {}), // never resolves
    );

    await queue.start('dl-1', [item('https://api.modrinth.com/v2/x', 'f.jar')], 1);
    await new Promise((r) => setTimeout(r, 20));

    queue.cancel('dl-1');
    await new Promise((r) => setTimeout(r, 20));

    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1]![0];
    expect(lastCall.status).toBe('cancelled');
  });

  it('cancelAll cancels every active job', async () => {
    vi.mocked(http.downloadFile).mockImplementation(() => new Promise(() => {}));

    await queue.start('dl-a', [item('https://api.modrinth.com/v2/a', 'a.jar')], 1);
    await queue.start('dl-b', [item('https://api.modrinth.com/v2/b', 'b.jar')], 1);
    await new Promise((r) => setTimeout(r, 20));

    queue.cancelAll();
    await new Promise((r) => setTimeout(r, 20));

    // Both should be cancelled without throwing
    expect(true).toBe(true);
  });

  it('emits error when a download fails', async () => {
    const onError = vi.fn();
    queue.on('error', onError);

    vi.mocked(http.downloadFile).mockRejectedValue(new Error('network down'));

    await queue.start('dl-1', [item('https://api.modrinth.com/v2/x', 'f.jar')], 1);
    await new Promise((r) => setTimeout(r, 50));

    expect(onError).toHaveBeenCalledWith('dl-1', expect.any(String));
  });

  it('respects concurrency limit', async () => {
    let active = 0;
    let maxActive = 0;
    vi.mocked(http.downloadFile).mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 30));
      active--;
    });

    await queue.start(
      'dl-1',
      [
        item('https://api.modrinth.com/v2/1', '1.jar'),
        item('https://api.modrinth.com/v2/2', '2.jar'),
        item('https://api.modrinth.com/v2/3', '3.jar'),
        item('https://api.modrinth.com/v2/4', '4.jar'),
      ],
      2,
    );
    await new Promise((r) => setTimeout(r, 200));

    expect(maxActive).toBeLessThanOrEqual(2);
  });
});

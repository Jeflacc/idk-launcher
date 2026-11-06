import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient, HttpClientError, DEFAULT_HOST_ALLOWLIST } from '@/infrastructure/net/http-client';
import { IntegrityError } from '@/domain/services/integrity-policy';

/**
 * HttpClient tests. We mock the global `fetch` (used internally) so no real
 * network calls are made.
 */

function mockResponse(body: string, status = 200, headers: Record<string, string> = {}) {
  const chunks = [body];
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
      controller.close();
    },
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    body: stream,
    json: () => Promise.resolve(JSON.parse(body)),
    text: () => Promise.resolve(body),
  } as Response;
}

describe('HttpClient', () => {
  let http: HttpClient;

  beforeEach(() => {
    http = new HttpClient(DEFAULT_HOST_ALLOWLIST, 1000, 1);
    vi.restoreAllMocks();
  });

  afterEach(() => vi.restoreAllMocks());

  describe('host allowlist (SSRF protection)', () => {
    it('allows requests to allowlisted hosts', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse('{}'));
      await http.getJson('https://api.modrinth.com/v2/search');
      expect(fetch).toHaveBeenCalled();
    });

    it('throws HttpClientError for non-allowlisted hosts', async () => {
      await expect(http.getJson('https://evil.example.com/data')).rejects.toThrow(HttpClientError);
      await expect(http.getJson('https://evil.example.com/data')).rejects.toThrow(/not in allowlist/);
    });

    it('throws for invalid URLs', async () => {
      await expect(http.getJson('not-a-url')).rejects.toThrow(HttpClientError);
    });
  });

  describe('getJson', () => {
    it('parses JSON response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse('{"id":"abc"}'));
      const r = await http.getJson<{ id: string }>('https://api.modrinth.com/v2/x');
      expect(r.id).toBe('abc');
    });

    it('throws on 4xx status', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse('not found', 404));
      await expect(http.getJson('https://api.modrinth.com/v2/x')).rejects.toThrow(HttpClientError);
    });
  });

  describe('getText', () => {
    it('returns the response body as string', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse('hello world'));
      const r = await http.getText('https://api.modrinth.com/v2/x');
      expect(r).toBe('hello world');
    });
  });

  describe('getBuffer', () => {
    it('returns a Buffer', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse('data'));
      const r = await http.getBuffer('https://api.modrinth.com/v2/x');
      expect(Buffer.isBuffer(r)).toBe(true);
      expect(r.toString('utf8')).toBe('data');
    });
  });

  describe('retry behavior', () => {
    it('retries on 5xx and succeeds on retry', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(mockResponse('server error', 500))
        .mockResolvedValueOnce(mockResponse('{"ok":true}'));

      const r = await http.getJson('https://api.modrinth.com/v2/x');
      expect(r).toEqual({ ok: true });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('does NOT retry on 4xx', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(mockResponse('bad request', 400));

      await expect(http.getJson('https://api.modrinth.com/v2/x')).rejects.toThrow(HttpClientError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('error context', () => {
    it('wraps native fetch failures with the failing URL', async () => {
      // Native fetch throws TypeError("fetch failed") — must surface as a
      // diagnosable HttpClientError with the URL attached (was: "fetch failed").
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
      await expect(http.getJson('https://meta.fabricmc.net/v2/versions/loader/26.1.2')).rejects.toThrow(
        HttpClientError,
      );
      await expect(http.getJson('https://meta.fabricmc.net/v2/versions/loader/26.1.2')).rejects.toThrow(
        /Network error: fetch failed \[https:\/\/meta\.fabricmc\.net\/v2\/versions\/loader\/26\.1\.2\]/,
      );
    });

    it('retries transient network failures before surfacing the URL error', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce(mockResponse('{"ok":true}'));

      const r = await http.getJson('https://api.modrinth.com/v2/x');
      expect(r).toEqual({ ok: true });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('reports invalid JSON responses with the URL', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse('<html>not json</html>'));
      await expect(http.getJson('https://api.modrinth.com/v2/x')).rejects.toThrow(
        /Invalid JSON response from https:\/\/api\.modrinth\.com\/v2\/x/,
      );
    });
  });

  describe('downloadFile', () => {
    it('throws when status is not 200', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse('error', 500));
      await expect(
        http.downloadFile('https://api.modrinth.com/v2/x', '/tmp/test-download-file'),
      ).rejects.toThrow(HttpClientError);
    });

    it('rejects non-allowlisted hosts', async () => {
      await expect(
        http.downloadFile('https://evil.example.com/file', '/tmp/test-download-file'),
      ).rejects.toThrow(HttpClientError);
    });

    it('retries a stalled download then succeeds', async () => {
      // A body that never emits any data triggers the stall watchdog.
      const stalledBody = new ReadableStream({ start() {} });
      const stalledResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        body: stalledBody,
      } as Response;
      const okResponse = mockResponse('downloaded content');
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(stalledResponse)
        .mockResolvedValueOnce(okResponse);

      await http.downloadFile(
        'https://resources.download.minecraft.net/cc/abcdef',
        '/tmp/test-download-file',
        { stallTimeoutMs: 100 },
      );

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});

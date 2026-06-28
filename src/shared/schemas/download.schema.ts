import { z } from 'zod';

export const DownloadSchema = {
  /**
   * A single downloadable file with optional integrity metadata.
   * Integrity is REQUIRED when the source is Mojang/Microsoft asset endpoints
   * (the v1 launcher bypassed this — a critical security regression).
   */
  item: z.object({
    url: z.string().url(),
    targetPath: z.string(),
    filename: z.string(),
    size: z.number().int().nonnegative().optional(),
    sha1: z.string().optional(),
    /** Skip download if the file already exists and matches size/sha1. */
    skipIfPresent: z.boolean().default(true),
  }),

  startRequest: z.object({
    downloadId: z.string(),
    items: z.array(
      z.object({
        url: z.string().url(),
        targetPath: z.string(),
        filename: z.string(),
        size: z.number().int().nonnegative().optional(),
        sha1: z.string().optional(),
        skipIfPresent: z.boolean().default(true),
      }),
    ),
    /** Maximum concurrent downloads. Default 4. */
    concurrency: z.number().int().positive().max(16).default(4),
  }),

  pauseRequest: z.object({ downloadId: z.string() }),
  resumeRequest: z.object({ downloadId: z.string() }),
  cancelRequest: z.object({ downloadId: z.string() }),

  progress: z.object({
    downloadId: z.string(),
    status: z.enum([
      'queued',
      'downloading',
      'paused',
      'completed',
      'error',
      'cancelled',
    ]),
    completed: z.number(),
    total: z.number(),
    bytesDownloaded: z.number(),
    bytesTotal: z.number(),
    currentFile: z.string().nullable(),
    speed: z.number(),
    error: z.string().nullable(),
  }),
} as const;

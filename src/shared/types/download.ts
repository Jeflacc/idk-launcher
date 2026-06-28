import type { z } from 'zod';
import type { DownloadSchema } from '../schemas/download.schema';

export type DownloadItem = z.infer<typeof DownloadSchema.item>;
export type DownloadId = string;
export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface DownloadProgress {
  downloadId: DownloadId;
  status: DownloadStatus;
  completed: number;
  total: number;
  bytesDownloaded: number;
  bytesTotal: number;
  currentFile: string | null;
  speed: number; // bytes/sec
  error: string | null;
}

export interface DownloadResult {
  downloadId: DownloadId;
  success: boolean;
  error: string | null;
}

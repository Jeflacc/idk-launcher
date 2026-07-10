import { z } from 'zod';

export const VersionSchema = {
  version: z.object({
    id: z.string(),
    type: z.enum(['release', 'snapshot', 'old_beta', 'old_alpha']),
    url: z.string().url(),
    time: z.string(),
    releaseTime: z.string(),
    sha1: z.string().optional(),
    complianceLevel: z.number().optional(),
  }),

  manifest: z.object({
    latest: z.object({
      release: z.string(),
      snapshot: z.string(),
    }),
    versions: z.array(
      z.object({
        id: z.string(),
        type: z.enum(['release', 'snapshot', 'old_beta', 'old_alpha']),
        url: z.string().url(),
        time: z.string(),
        releaseTime: z.string(),
      }),
    ),
  }),

  downloadRequest: z.object({
    versionId: z.string(),
    loader: z.enum(['vanilla', 'forge', 'fabric', 'quilt', 'neoforge']).default('vanilla'),
    loaderVersion: z.string().optional(),
  }),

  cancelDownloadRequest: z.object({
    versionId: z.string().optional(),
  }),
} as const;

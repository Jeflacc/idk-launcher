import { z } from 'zod';

export const ModpackSchema = {
  /** On-disk profile.json for a modpack. */
  profile: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().default(''),
    minecraftVersion: z.string(),
    loader: z.enum(['vanilla', 'forge', 'fabric', 'quilt', 'neoforge']),
    loaderVersion: z.string().optional(),
    iconPath: z.string().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    lastPlayedAt: z.number().optional(),
    playtimeSeconds: z.number().default(0),
    mods: z
      .array(
        z.object({
          id: z.string(),
          filename: z.string(),
          name: z.string().default(''),
          version: z.string().default(''),
          source: z.enum(['modrinth', 'curseforge', 'local']),
          enabled: z.boolean().default(true),
        }),
      )
      .default([]),
  }),

  /** The full modpack with disk path. */
  modpack: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    minecraftVersion: z.string(),
    loader: z.enum(['vanilla', 'forge', 'fabric', 'quilt', 'neoforge']),
    loaderVersion: z.string().optional(),
    iconPath: z.string().optional(),
    directory: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    lastPlayedAt: z.number().optional(),
    playtimeSeconds: z.number().default(0),
    modCount: z.number().default(0),
  }),

  /** Lightweight summary for lists. */
  summary: z.object({
    id: z.string(),
    name: z.string(),
    minecraftVersion: z.string(),
    loader: z.enum(['vanilla', 'forge', 'fabric', 'quilt', 'neoforge']),
    iconPath: z.string().optional(),
    modCount: z.number().default(0),
    lastPlayedAt: z.number().optional(),
  }),

  scanProfilesResult: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      directory: z.string(),
      minecraftVersion: z.string(),
      loader: z.enum(['vanilla', 'forge', 'fabric', 'quilt', 'neoforge']),
      iconPath: z.string().optional(),
      modCount: z.number().default(0),
      lastPlayedAt: z.number().optional(),
      playtimeSeconds: z.number().default(0),
    }),
  ),

  updateProfileRequest: z.object({
    modpackId: z.string(),
    changes: z.record(z.string(), z.unknown()),
  }),

  deleteFolderRequest: z.object({
    modpackId: z.string(),
  }),

  launchRequest: z.object({
    modpackId: z.string(),
    quickConnect: z.string().optional(),
  }),
} as const;

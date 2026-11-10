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
    favorite: z.boolean().optional(),
    javaArgs: z.string().default(''),
    windowWidth: z.number().default(1024),
    windowHeight: z.number().default(768),
    mods: z
      .array(
        z.object({
          id: z.string(),
          filename: z.string(),
          name: z.string().default(''),
          version: z.string().default(''),
          source: z.enum(['modrinth', 'curseforge', 'local']),
          enabled: z.boolean().default(true),
          modrinthId: z.string().optional(),
          iconUrl: z.string().optional(),
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
    favorite: z.boolean().optional(),
    javaArgs: z.string().default(''),
    windowWidth: z.number().default(1024),
    windowHeight: z.number().default(768),
    diskMods: z
      .array(z.object({ filename: z.string(), path: z.string() }))
      .optional(),
    diskResourcepacks: z
      .array(z.object({ filename: z.string(), path: z.string() }))
      .optional(),
    diskShaders: z
      .array(z.object({ filename: z.string(), path: z.string() }))
      .optional(),
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
      diskMods: z
        .array(z.object({ filename: z.string(), path: z.string() }))
        .optional(),
      diskResourcepacks: z
        .array(z.object({ filename: z.string(), path: z.string() }))
        .optional(),
      diskShaders: z
        .array(z.object({ filename: z.string(), path: z.string() }))
        .optional(),
    }),
  ),

  updateProfileRequest: z.object({
    modpackId: z.string(),
    changes: z.record(z.string(), z.unknown()),
  }),

  renameRequest: z.object({
    modpackId: z.string(),
    newName: z.string().min(1).max(120),
  }),

  deleteFolderRequest: z.object({
    modpackId: z.string(),
  }),

  launchRequest: z.object({
    modpackId: z.string(),
    // The v1 renderer sends `quickConnect: state.quickConnectTarget` which is
    // `null` when unset — accept null/undefined/absent.
    quickConnect: z.string().nullable().optional(),
    authProvider: z.enum(['microsoft', 'elyby', 'offline']).optional(),
    maxMemoryMb: z.number().int().positive().max(32768).optional(),
    windowSize: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).optional(),
    javaArgs: z.array(z.string()).optional(),
    username: z.string().optional(),
    accountId: z.string().optional(),
  }),
} as const;

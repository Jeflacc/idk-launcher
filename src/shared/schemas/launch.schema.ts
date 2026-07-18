import { z } from 'zod';

export const LaunchSchema = {
  /**
   * The single, typed launch options object. This replaces v1's
   * `launchMinecraft(username, version, javaPath, loader, autoOptimization,
   * performanceRenderer, maxMemory, authData, quickConnect, windowSize,
   * globalJavaArgs, forceUpdate)` — 12 positional args packed into one IPC
   * payload with no validation.
   */
  options: z.object({
    versionId: z.string(),
    modpackId: z.string().optional(),
    loader: z.enum(['vanilla', 'forge', 'fabric', 'quilt', 'neoforge']).default('vanilla'),
    loaderVersion: z.string().optional(),
    javaPath: z.string().optional(),
    maxMemoryMb: z.number().int().positive().max(32768).optional(),
    minMemoryMb: z.number().int().positive().max(32768).optional(),
    javaArgs: z.array(z.string()).default([]),
    windowSize: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .optional(),
    autoOptimization: z.boolean().default(true),
    performanceRenderer: z.boolean().default(false),
    quickConnect: z.string().optional(),
    forceUpdate: z.boolean().default(false),
    authProvider: z.enum(['microsoft', 'elyby', 'offline']).default('microsoft'),
  }),

  progress: z.object({
    type: z.enum([
      'java',
      'assets',
      'libraries',
      'version',
      'loader',
      'mods',
      'starting',
    ]),
    phase: z.enum(['downloading', 'extracting', 'verifying', 'done']),
    completed: z.number(),
    total: z.number(),
    currentFile: z.string().optional(),
    message: z.string().optional(),
  }),

  result: z.object({
    success: z.boolean(),
    pid: z.number().optional(),
    error: z.string().optional(),
    code: z.number().optional(),
    output: z.string().optional(),
  }),

  warning: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
} as const;

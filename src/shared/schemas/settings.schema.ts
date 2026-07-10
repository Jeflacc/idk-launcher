import { z } from 'zod';

/**
 * Helper: a sub-object that deep-defaults when absent or partial.
 *
 * In zod v4, `.default({})` on a `z.object(...)` short-circuits parse — the
 * inner field defaults do NOT apply. `z.preprocess(v => v ?? {}, schema)`
 * replaces `undefined`/`null` with `{}` BEFORE parsing, so the inner schema's
 * field defaults are honored for every absent field.
 */
function deepDefault<T extends z.ZodObject<z.ZodRawShape>>(schema: T) {
  return z.preprocess((v) => (v == null ? {} : v), schema);
}

const generalSchema = z.object({
  theme: z.enum(['dark', 'light', 'glass']).default('glass'),
  language: z.string().default('en'),
  minecraftRoot: z.string().default(''),
  discordRpc: z.boolean().default(true),
  autoUpdate: z.boolean().default(true),
  backgroundEffect: z.enum(['none', 'particles', 'video']).default('particles'),
});

const javaSchema = z.object({
  customPath: z.string().default(''),
  autoDetect: z.boolean().default(true),
  args: z.array(z.string()).default([]),
});

const memorySchema = z.object({
  maxMb: z.number().int().positive().max(32768).default(4096),
  minMb: z.number().int().positive().max(32768).default(1024),
  autoAllocate: z.boolean().default(true),
});

const appearanceSchema = z.object({
  glassmorphism: z.boolean().default(true),
  accentColor: z.string().default('#6366f1'),
  compactMode: z.boolean().default(false),
  reducedMotion: z.boolean().default(false),
});

const launchSchema = z.object({
  closeOnLaunch: z.boolean().default(false),
  showOverlay: z.boolean().default(true),
  autoOptimize: z.boolean().default(true),
  windowWidth: z.number().int().positive().default(854),
  windowHeight: z.number().int().positive().default(480),
  fullscreen: z.boolean().default(false),
});

const networkSchema = z.object({
  concurrentDownloads: z.number().int().positive().max(16).default(4),
  verifyIntegrity: z.boolean().default(true),
  proxyUrl: z.string().default(''),
});

const connectSchema = z.object({
  enabled: z.boolean().default(false),
  serverUrl: z.string().default(''),
  /** User-provided FRP token. NEVER hardcoded (v1 shipped a hardcoded public token). */
  tunnelToken: z.string().default(''),
  tunnelEnabled: z.boolean().default(false),
});

export const SettingsSchema = {
  settings: z.object({
    general: deepDefault(generalSchema),
    java: deepDefault(javaSchema),
    memory: deepDefault(memorySchema),
    appearance: deepDefault(appearanceSchema),
    launch: deepDefault(launchSchema),
    network: deepDefault(networkSchema),
    connect: deepDefault(connectSchema),
  }),

  categoryMeta: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      description: z.string(),
      icon: z.string(),
    }),
  ),
} as const;

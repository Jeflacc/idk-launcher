import type { z } from 'zod';
import type { VersionSchema } from '../schemas/version.schema';

export type MinecraftVersion = z.infer<typeof VersionSchema.version>;
export type VersionManifest = z.infer<typeof VersionSchema.manifest>;
export type VersionType = 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
export type ModLoader = 'vanilla' | 'forge' | 'fabric' | 'quilt' | 'neoforge';

export interface LoaderVersion {
  loader: ModLoader;
  version: string;
  stable: boolean;
}

export interface ResolvedVersion {
  minecraft: MinecraftVersion;
  loader: LoaderVersion | null;
}

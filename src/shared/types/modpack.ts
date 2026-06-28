import type { z } from 'zod';
import type { ModpackSchema } from '../schemas/modpack.schema';

export type Modpack = z.infer<typeof ModpackSchema.modpack>;
export type ModpackProfile = z.infer<typeof ModpackSchema.profile>;
export type ModpackSummary = z.infer<typeof ModpackSchema.summary>;
export type ModpackSource = 'modrinth' | 'curseforge' | 'local';

export interface InstalledMod {
  id: string;
  filename: string;
  name: string;
  version: string;
  source: ModpackSource;
  enabled: boolean;
}

import type { z } from 'zod';
import type { SettingsSchema } from '../schemas/settings.schema';

export type LauncherSettings = z.infer<typeof SettingsSchema.settings>;
export type SettingsCategory =
  | 'general'
  | 'java'
  | 'memory'
  | 'appearance'
  | 'launch'
  | 'network'
  | 'connect'
  | 'session';

export interface SettingsCategoryMeta {
  id: SettingsCategory;
  label: string;
  description: string;
  icon: string;
}

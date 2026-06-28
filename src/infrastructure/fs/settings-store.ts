import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { SettingsSchema } from '@shared/schemas/settings.schema';
import type { LauncherSettings } from '@shared/types';

/**
 * Settings store. Settings contain ONLY non-secret preferences. Auth tokens,
 * tunnel tokens, etc. live in the SecretStore.
 *
 * Replaces v1's 764-line settings-manager.cjs which mixed concerns and stored
 * secrets alongside preferences.
 */
export class SettingsStore {
  private cache: LauncherSettings | null = null;

  constructor(private readonly filePath: string, private readonly defaults: LauncherSettings) {}

  async load(): Promise<LauncherSettings> {
    if (this.cache) return this.cache;
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const merged = this.mergeDefaults(parsed);
      const result = SettingsSchema.settings.parse(merged);
      this.cache = result;
      return result;
    } catch {
      // Missing or invalid file → defaults.
      this.cache = this.defaults;
      return this.defaults;
    }
  }

  async save(settings: Partial<LauncherSettings>): Promise<LauncherSettings> {
    const current = (this.cache ?? (await this.load())) as Record<string, unknown>;
    const incoming = settings as Record<string, unknown>;
    const deep = this.deepMerge(current, incoming);
    const result = SettingsSchema.settings.parse(deep);
    this.cache = result;
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(result, null, 2), 'utf8');
    return result;
  }

  async reset(): Promise<LauncherSettings> {
    this.cache = this.defaults;
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.defaults, null, 2), 'utf8');
    return this.defaults;
  }

  private mergeDefaults(parsed: unknown): LauncherSettings {
    const defaults = this.defaults as unknown as Record<string, unknown>;
    if (typeof parsed !== 'object' || parsed === null) return this.defaults;
    return this.deepMerge(defaults, parsed as Record<string, unknown>) as unknown as LauncherSettings;
  }

  private deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        out[key] &&
        typeof out[key] === 'object' &&
        !Array.isArray(out[key])
      ) {
        out[key] = this.deepMerge(out[key] as Record<string, unknown>, value as Record<string, unknown>);
      } else {
        out[key] = value;
      }
    }
    return out;
  }
}

import type { MinecraftVersion, VersionType } from '@shared/types';

export interface VersionFilter {
  types?: VersionType[];
  query?: string;
  limit?: number;
}

/**
 * Pure version filtering. Replaces inline filtering scattered across v1's
 * `version-feature.js`.
 */
export class VersionFilterService {
  filter(versions: MinecraftVersion[], filter: VersionFilter): MinecraftVersion[] {
    let result = versions;
    if (filter.types && filter.types.length > 0) {
      const allowed = new Set(filter.types);
      result = result.filter((v) => allowed.has(v.type));
    }
    if (filter.query && filter.query.trim().length > 0) {
      const q = filter.query.trim().toLowerCase();
      result = result.filter((v) => v.id.toLowerCase().includes(q));
    }
    if (filter.limit && filter.limit > 0) {
      result = result.slice(0, filter.limit);
    }
    return result;
  }

  latestRelease(versions: MinecraftVersion[]): MinecraftVersion | null {
    return versions.find((v) => v.type === 'release') ?? null;
  }

  latestSnapshot(versions: MinecraftVersion[]): MinecraftVersion | null {
    return versions.find((v) => v.type === 'snapshot') ?? null;
  }
}

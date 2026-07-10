import type { ModLoader } from '@shared/types';

export interface ModReference {
  modId: string;
  version: string;
  loader: ModLoader;
  minecraftVersion: string;
}

export interface ResolvedMod {
  modId: string;
  version: string;
  downloadUrl: string;
  filename: string;
  sha1?: string;
  size?: number;
  dependencies: ModReference[];
}

export interface Conflict {
  modId: string;
  conflictsWith: string[];
  reason: string;
}

export interface MissingDependency {
  modId: string;
  requiredBy: string[];
}

export interface ModResolution {
  resolved: ResolvedMod[];
  missing: MissingDependency[];
  conflicts: Conflict[];
}

/**
 * Pure mod-resolution logic. The v1 `crash-analyzer-feature.js` and
 * `mod-resolver-feature.js` duplicated this concern with hardcoded regex and
 * were never invoked. Here it is a single, testable domain service.
 */
export class ModResolverService {
  constructor(private readonly knownIncompatibilities: ReadonlyMap<string, ReadonlySet<string>>) {}

  resolve(
    requested: ModReference[],
    available: Map<string, ResolvedMod>,
    installed: Set<string>,
  ): ModResolution {
    const resolved: ResolvedMod[] = [];
    const missing: MissingDependency[] = [];
    const conflicts: Conflict[] = [];
    const toVisit: ModReference[] = [...requested];
    const visited = new Set<string>();

    while (toVisit.length > 0) {
      const ref = toVisit.shift()!;
      const key = `${ref.modId}@${ref.version}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const mod = available.get(key);
      if (!mod) {
        missing.push({ modId: ref.modId, requiredBy: [] });
        continue;
      }

      // Dependency walk
      for (const dep of mod.dependencies) {
        if (!installed.has(dep.modId) && !visited.has(`${dep.modId}@${dep.version}`)) {
          toVisit.push(dep);
        }
      }

      // Conflict detection
      const blockedBy = this.knownIncompatibilities.get(ref.modId);
      if (blockedBy) {
        const present = [...installed, ...resolved.map((r) => r.modId)].filter((m) =>
          blockedBy.has(m),
        );
        if (present.length > 0) {
          conflicts.push({ modId: ref.modId, conflictsWith: present, reason: 'declared incompatibility' });
        }
      }

      resolved.push(mod);
    }

    return { resolved, missing, conflicts };
  }
}

import { describe, it, expect } from 'vitest';
import { ModResolverService, type ModReference, type ResolvedMod } from '@/domain/services/mod-resolver';

// knownIncompatibilities: sodium conflicts with optifine
const incompatibilities = new Map<string, ReadonlySet<string>>([
  ['sodium', new Set(['optifine'])],
]);

const svc = new ModResolverService(incompatibilities);

function mod(modId: string, version: string, deps: ModReference[] = []): ResolvedMod {
  return {
    modId,
    version,
    downloadUrl: `https://x/${modId}-${version}.jar`,
    filename: `${modId}-${version}.jar`,
    dependencies: deps,
  };
}

describe('ModResolverService.resolve', () => {
  it('resolves a simple requested mod', () => {
    const available = new Map([['sodium@0.5', mod('sodium', '0.5')]]);
    const r = svc.resolve([{ modId: 'sodium', version: '0.5', loader: 'fabric', minecraftVersion: '1.20.1' }], available, new Set());
    expect(r.resolved).toHaveLength(1);
    expect(r.resolved[0]!.modId).toBe('sodium');
    expect(r.missing).toHaveLength(0);
    expect(r.conflicts).toHaveLength(0);
  });

  it('reports missing mods when not in available map', () => {
    const r = svc.resolve([{ modId: 'fabric-api', version: '0.90', loader: 'fabric', minecraftVersion: '1.20.1' }], new Map(), new Set());
    expect(r.missing).toHaveLength(1);
    expect(r.missing[0]!.modId).toBe('fabric-api');
  });

  it('walks dependencies transitively', () => {
    const available = new Map<string, ResolvedMod>([
      ['mod-a@1', mod('mod-a', '1', [{ modId: 'mod-b', version: '2', loader: 'fabric', minecraftVersion: '1.20.1' }])],
      ['mod-b@2', mod('mod-b', '2')],
    ]);
    const r = svc.resolve([{ modId: 'mod-a', version: '1', loader: 'fabric', minecraftVersion: '1.20.1' }], available, new Set());
    expect(r.resolved).toHaveLength(2);
    const ids = r.resolved.map((m) => m.modId).sort();
    expect(ids).toEqual(['mod-a', 'mod-b']);
  });

  it('detects conflicts from the incompatibility map', () => {
    const available = new Map<string, ResolvedMod>([
      ['sodium@0.5', mod('sodium', '0.5')],
      ['optifine@1', mod('optifine', '1')],
    ]);
    const r = svc.resolve(
      [{ modId: 'sodium', version: '0.5', loader: 'fabric', minecraftVersion: '1.20.1' }],
      available,
      new Set(['optifine']), // optifine already installed
    );
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]!.modId).toBe('sodium');
    expect(r.conflicts[0]!.conflictsWith).toContain('optifine');
  });

  it('does not visit the same mod+version twice (cycle safety)', () => {
    const available = new Map<string, ResolvedMod>([
      ['a@1', mod('a', '1', [{ modId: 'b', version: '1', loader: 'fabric', minecraftVersion: '1.20.1' }])],
      ['b@1', mod('b', '1', [{ modId: 'a', version: '1', loader: 'fabric', minecraftVersion: '1.20.1' }])],
    ]);
    const r = svc.resolve([{ modId: 'a', version: '1', loader: 'fabric', minecraftVersion: '1.20.1' }], available, new Set());
    expect(r.resolved).toHaveLength(2);
  });

  it('returns empty arrays for empty input', () => {
    const r = svc.resolve([], new Map(), new Set());
    expect(r.resolved).toEqual([]);
    expect(r.missing).toEqual([]);
    expect(r.conflicts).toEqual([]);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { McLauncher } from '@/infrastructure/minecraft/mc-launcher';
import type { HttpClient } from '@/infrastructure/net/http-client';

/**
 * Regression test: the Fabric meta endpoint `/v2/versions/loader/{mc}` returns
 * an ARRAY of { loader, intermediary, launcherMeta } — NOT an object with a
 * `loaders` key. Previously the code did `meta.loaders.find(...)` which threw
 * `Cannot read properties of undefined (reading 'find')` at launch time.
 */
describe('McLauncher.resolveFabricVersion', () => {
  const MC = '26.1.2';

  function metaEntry(version: string, stable: boolean) {
    return {
      loader: { separator: '.', build: 0, maven: `net.fabricmc:fabric-loader:${version}`, version, stable },
      intermediary: { maven: 'net.fabricmc:intermediary:0.0.0', version: '0.0.0', stable: true },
      launcherMeta: { version: 2 },
    };
  }

  const metaArray = [metaEntry('0.19.2', false), metaEntry('0.19.3', true), metaEntry('0.19.1', false)];

  const fabricProfile = {
    id: 'fabric-loader-0.19.3-26.1.2',
    inheritsFrom: MC,
    mainClass: 'net.fabricmc.loader.impl.launch.knot.KnotClient',
    libraries: [
      {
        name: 'net.fabricmc:fabric-loader:0.19.3',
        url: 'https://maven.fabricmc.net/',
        downloads: { artifact: { path: 'net/fabricmc/fabric-loader/0.19.3/fabric-loader-0.19.3.jar', url: 'https://maven.fabricmc.net/net/fabricmc/fabric-loader/0.19.3/fabric-loader-0.19.3.jar' } },
      },
    ],
  };

  const vanillaProfile = {
    id: MC,
    mainClass: 'net.minecraft.client.main.Main',
    libraries: [
      { name: 'com.mojang:minecraft:1.0', downloads: { artifact: { path: 'a.jar', url: 'https://example.com/a.jar' } } },
    ],
    downloads: { client: { url: 'https://example.com/client.jar', size: 1234 } },
    assetIndex: { id: '1', url: 'https://example.com/index.json' },
  };

  function makeHttp(): HttpClient {
    return {
      getJson: vi.fn(async (url: string) => {
        if (url === `https://meta.fabricmc.net/v2/versions/loader/${MC}`) return metaArray;
        if (url.includes('/profile/json')) return fabricProfile;
        if (url.includes('version_manifest_v2.json')) {
          return { versions: [{ id: MC, url: 'https://example.com/vanilla.json' }] };
        }
        if (url === 'https://example.com/vanilla.json') return vanillaProfile;
        throw new Error(`Unexpected URL: ${url}`);
      }),
    } as unknown as HttpClient;
  }

  let root: string;
  let launcher: McLauncher;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'mc-launcher-test-'));
    launcher = new McLauncher(makeHttp());
    launcher.on('debug', () => {});
    launcher.on('progress', () => {});
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('picks the stable loader from the array response and merges the vanilla parent', async () => {
    const merged = await (launcher as unknown as { resolveFabricVersion(r: string, m: string): Promise<unknown> })
      .resolveFabricVersion(root, MC);

    const version = merged as {
      id: string;
      mainClass: string;
      inheritsFrom?: string;
      libraries: { name: string }[];
    };
    expect(version.id).toBe('fabric-loader-0.19.3-26.1.2');
    expect(version.mainClass).toBe('net.fabricmc.loader.impl.launch.knot.KnotClient');
    expect(version.inheritsFrom).toBe(MC);
    const libNames = version.libraries.map((l) => l.name);
    expect(libNames).toContain('net.fabricmc:fabric-loader:0.19.3');
    expect(libNames).toContain('com.mojang:minecraft:1.0');
  });

  it('persists the profile JSON under versions/fabric-loader-<v>-<mc>/', async () => {
    await (launcher as unknown as { resolveFabricVersion(r: string, m: string): Promise<unknown> })
      .resolveFabricVersion(root, MC);

    const profileId = 'fabric-loader-0.19.3-26.1.2';
    const jsonPath = join(root, profileId, `${profileId}.json`);
    expect(existsSync(jsonPath)).toBe(true);
    const onDisk = JSON.parse(readFileSync(jsonPath, 'utf8'));
    expect(onDisk.inheritsFrom).toBe(MC);
  });

  it('does not re-fetch the Fabric profile when the profile JSON already exists', async () => {
    const profileId = 'fabric-loader-0.19.3-26.1.2';
    const { mkdirSync, writeFileSync } = await import('node:fs');
    mkdirSync(join(root, profileId), { recursive: true });
    writeFileSync(join(root, profileId, `${profileId}.json`), JSON.stringify(fabricProfile));

    await (launcher as unknown as { resolveFabricVersion(r: string, m: string): Promise<unknown> })
      .resolveFabricVersion(root, MC);

    const getJson = (launcher as unknown as { http: { getJson: ReturnType<typeof vi.fn> } }).http.getJson;
    const profileFetches = getJson.mock.calls.filter(([url]: [string]) => url.includes('/profile/json'));
    expect(profileFetches).toHaveLength(0);
  });

  it('uses the requested loader version without hitting the meta endpoint', async () => {
    const merged = await (launcher as unknown as {
      resolveFabricVersion(r: string, m: string, v?: string): Promise<unknown>;
    }).resolveFabricVersion(root, MC, '0.17.3');

    const getJson = (launcher as unknown as { http: { getJson: ReturnType<typeof vi.fn> } }).http.getJson;
    const loaderListFetches = getJson.mock.calls.filter(
      ([url]: [string]) => url === `https://meta.fabricmc.net/v2/versions/loader/${MC}`,
    );
    expect(loaderListFetches).toHaveLength(0);

    const version = merged as { id: string };
    expect(version.id).toBe('fabric-loader-0.17.3-26.1.2');
  });
});

/**
 * Regression test: assets are stored in a SHARED root keyed by sha1 hash.
 * A complete shared root must not cause ANY downloads (no index fetch, no
 * object fetches) — previously every instance re-downloaded the entire
 * asset set because the phase emitted "downloading" progress regardless.
 */
describe('McLauncher.downloadAssets (shared root)', () => {
  const hashA = 'aa' + '1'.repeat(38);
  const hashB = 'bb' + '2'.repeat(38);

  let root: string;
  let downloadFile: ReturnType<typeof vi.fn>;
  let progressEvents: unknown[];

  function makeLauncher(): McLauncher {
    const launcher = new McLauncher({ downloadFile } as unknown as HttpClient);
    launcher.on('debug', () => {});
    launcher.on('progress', (p) => progressEvents.push(p));
    return launcher;
  }

  function makeVersion() {
    return {
      id: 'fabric-loader-0.19.3-26.1.2',
      assets: '30',
      assetIndex: { id: '30', url: 'https://example.com/index.json', sha1: 'sha', size: 10 },
      libraries: [],
      mainClass: 'x',
    };
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'mc-assets-test-'));
    downloadFile = vi.fn().mockResolvedValue(undefined);
    progressEvents = [];

    // `root` is the assets root — indexes/ and objects/ live directly inside.
    const indexDir = join(root, 'indexes');
    mkdirSync(indexDir, { recursive: true });
    writeFileSync(
      join(indexDir, '30.json'),
      JSON.stringify({
        objects: {
          'sound/a.ogg': { hash: hashA, size: 100 },
          'sound/b.ogg': { hash: hashB, size: 200 },
        },
      }),
    );
    // Both objects already present in the shared objects dir
    mkdirSync(join(root, 'objects', hashA.slice(0, 2)), { recursive: true });
    mkdirSync(join(root, 'objects', hashB.slice(0, 2)), { recursive: true });
    writeFileSync(join(root, 'objects', hashA.slice(0, 2), hashA), 'data-a');
    writeFileSync(join(root, 'objects', hashB.slice(0, 2), hashB), 'data-b');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('downloads nothing when the shared root already has every object', async () => {
    await (makeLauncher() as unknown as { downloadAssets(v: unknown, r: string): Promise<void> })
      .downloadAssets(makeVersion(), root);
    expect(downloadFile).not.toHaveBeenCalled();
  });

  it('emits a "done" progress event instead of "downloading" when nothing is missing', async () => {
    await (makeLauncher() as unknown as { downloadAssets(v: unknown, r: string): Promise<void> })
      .downloadAssets(makeVersion(), root);
    expect(progressEvents).toEqual([{ type: 'assets', phase: 'done', completed: 2, total: 2 }]);
  });

  it('downloads only missing objects when the shared root is incomplete', async () => {
    // Remove one object so exactly one download happens
    rmSync(join(root, 'objects', hashB.slice(0, 2), hashB), { force: true });

    await (makeLauncher() as unknown as { downloadAssets(v: unknown, r: string): Promise<void> })
      .downloadAssets(makeVersion(), root);

    expect(downloadFile).toHaveBeenCalledTimes(1);
    expect(downloadFile.mock.calls[0][0]).toBe(`https://resources.download.minecraft.net/${hashB.slice(0, 2)}/${hashB}`);
    expect(progressEvents).toEqual([
      { type: 'assets', phase: 'downloading', completed: 0, total: 1 },
      { type: 'assets', phase: 'downloading', completed: 1, total: 1 },
    ]);
  });
});

/**
 * Offline-first Fabric resolution: when a `fabric-loader-<v>-<mc>` profile
 * directory already exists, the launch must NOT touch the network at all —
 * previously it always hit meta.fabricmc.net, failing with `fetch failed`
 * whenever the network was down or the service unreachable.
 */
describe('McLauncher offline Fabric cache', () => {
  const MC = '26.1.2';
  const loaderVersion = '0.17.3';
  const profileId = `fabric-loader-${loaderVersion}-${MC}`;

  const fabricProfile = {
    id: profileId,
    inheritsFrom: MC,
    mainClass: 'net.fabricmc.loader.impl.launch.knot.KnotClient',
    libraries: [{ name: 'net.fabricmc:fabric-loader:0.17.3' }],
  };

  const vanillaProfile = {
    id: MC,
    mainClass: 'net.minecraft.client.main.Main',
    libraries: [{ name: 'com.mojang:minecraft:1.0' }],
    downloads: { client: { url: 'https://example.com/client.jar', size: 1234 } },
  };

  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'mc-offline-test-'));
    mkdirSync(join(root, profileId), { recursive: true });
    writeFileSync(join(root, profileId, `${profileId}.json`), JSON.stringify(fabricProfile));
    mkdirSync(join(root, MC), { recursive: true });
    writeFileSync(join(root, MC, `${MC}.json`), JSON.stringify(vanillaProfile));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('resolves from disk without a single network request', async () => {
    const getJson = vi.fn().mockRejectedValue(new Error('network down'));
    const launcher = new McLauncher({ getJson } as unknown as HttpClient);
    launcher.on('debug', () => {});
    launcher.on('progress', () => {});

    const merged = await (launcher as unknown as { resolveFabricVersion(r: string, m: string): Promise<unknown> })
      .resolveFabricVersion(root, MC);

    expect((merged as { id: string }).id).toBe(profileId);
    expect((merged as { mainClass: string }).mainClass).toBe('net.fabricmc.loader.impl.launch.knot.KnotClient');
    expect(getJson).not.toHaveBeenCalled();
  });

  it('mcMajor parses classic 1.x and new-style version ids', async () => {
    const launcher = new McLauncher({ getJson: vi.fn() } as unknown as HttpClient);
    const mcMajor = (launcher as unknown as { mcMajor(v: unknown): number }).mcMajor.bind(launcher);
    expect(mcMajor({ id: '26.1.2', mainClass: 'x', libraries: [] })).toBe(26);
    expect(mcMajor({ id: '1.20.1', mainClass: 'x', libraries: [] })).toBe(20);
    expect(mcMajor({ id: '1.8.9', mainClass: 'x', libraries: [] })).toBe(8);
    expect(
      mcMajor({ id: profileId, inheritsFrom: MC, mainClass: 'x', libraries: [] }),
    ).toBe(26);
  });

  it('reuses the parent vanilla jar when sizes match (loader bump = no 25MB copy)', async () => {
    const expectedSize = 25 * 1024 * 1024;
    const parentJar = join(root, MC, `${MC}.jar`);
    writeFileSync(parentJar, Buffer.alloc(expectedSize));

    const downloadFile = vi.fn();
    const launcher = new McLauncher({ downloadFile } as unknown as HttpClient);
    launcher.on('debug', () => {});

    const version = {
      id: profileId,
      inheritsFrom: MC,
      mainClass: 'x',
      libraries: [],
      downloads: { client: { url: 'https://example.com/client.jar', size: expectedSize } },
    };
    const jar = await (launcher as unknown as {
      downloadJar(v: unknown, d: string, vr: string): Promise<string>;
    }).downloadJar(version, join(root, profileId), root);

    expect(jar).toBe(parentJar);
    expect(downloadFile).not.toHaveBeenCalled();
  });

  it('maps ${assets_root} and ${game_directory} to the shared roots', async () => {
    const launcher = new McLauncher({ getJson: vi.fn() } as unknown as HttpClient);
    const buildGameArgs = (launcher as unknown as { buildGameArgs(v: unknown, o: unknown): string[] }).buildGameArgs.bind(launcher);

    const args = buildGameArgs(
      {
        id: MC,
        mainClass: 'x',
        libraries: [],
        arguments: { game: ['--assetsDir', '${assets_root}', '--gameDir', '${game_directory}'] },
      },
      {
        root: '/tmp/instance',
        assetsRoot: '/shared/assets',
        gameDirectory: '/tmp/instance',
        auth: { access_token: 't', client_token: 'c', uuid: 'u', name: 'Steve', user_properties: '{}' },
      },
    );

    expect(args).toContain('--assetsDir');
    expect(args).toContain('/shared/assets');
    expect(args).toContain('/tmp/instance');
  });

  it('adds the authlib-injector javaagent for Ely.by launches', async () => {
    const launcher = new McLauncher({ getJson: vi.fn() } as unknown as HttpClient);
    const buildJvmArgs = (launcher as unknown as {
      buildJvmArgs(v: unknown, o: unknown, n: string, c: string): string[];
    }).buildJvmArgs.bind(launcher);

    const jvm = buildJvmArgs(
      { id: MC, mainClass: 'x', libraries: [] },
      {
        root: '/tmp/instance',
        versionId: MC,
        javaPath: 'java',
        memory: { max: 4096, min: 1024 },
        auth: { access_token: 't', client_token: 'c', uuid: 'u', name: 'Steve', user_properties: '{}' },
        authProvider: 'elyby',
        authlibInjectorJar: 'C:\\tools\\authlib-injector.jar',
      },
      '/tmp/natives',
      'cp:str',
    );

    expect(jvm).toContain('-javaagent:C:\\tools\\authlib-injector.jar=https://authserver.ely.by/api/authlib-injector');
  });
});

describe('McLauncher library merging + rules', () => {
  let launcher: McLauncher;

  beforeEach(() => {
    launcher = new McLauncher({} as unknown as HttpClient);
  });

  it('mergeLibraries keeps ALL LWJGL variants (core + each natives classifier)', () => {
    const parent = [
      { name: 'org.lwjgl:lwjgl:3.4.1' },
      { name: 'org.lwjgl:lwjgl:3.4.1:natives-linux' },
      { name: 'org.lwjgl:lwjgl:3.4.1:natives-macos' },
      { name: 'org.lwjgl:lwjgl:3.4.1:natives-windows' },
      { name: 'org.lwjgl:lwjgl:3.4.1:natives-windows-arm64' },
      { name: 'org.lwjgl:lwjgl:3.4.1:natives-windows-x86' },
    ];
    const child = [{ name: 'net.fabricmc:fabric-loader:0.19.3' }];
    const merged = (launcher as unknown as { mergeLibraries(p: { name: string }[], c: { name: string }[]): { name: string }[] })
      .mergeLibraries(parent as never, child as never);
    const names = merged.map((l) => l.name);
    expect(names).toContain('org.lwjgl:lwjgl:3.4.1');
    expect(names).toContain('org.lwjgl:lwjgl:3.4.1:natives-windows');
    expect(names).toContain('org.lwjgl:lwjgl:3.4.1:natives-windows-x86');
    expect(names).toHaveLength(parent.length + child.length);
  });

  it('mergeLibraries lets the child override an IDENTICAL coordinate', () => {
    const parent = [{ name: 'org.ow2.asm:asm:9.10.1', url: 'parent' }];
    const child = [{ name: 'org.ow2.asm:asm:9.10.1', url: 'child' }];
    const merged = (launcher as unknown as { mergeLibraries(p: { name: string }[], c: { name: string }[]): { name: string; url: string }[] })
      .mergeLibraries(parent as never, child as never);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.url).toBe('child');
  });

  it('isValidLibrary: single allow:windows rule keeps windows natives, drops linux/osx', () => {
    const check = (lib: { rules: unknown[] }) =>
      (launcher as unknown as { isValidLibrary(l: { rules: unknown[] }): boolean }).isValidLibrary(lib as never);
    expect(check({ rules: [{ action: 'allow', os: { name: 'windows' } }] })).toBe(true);
    expect(check({ rules: [{ action: 'allow', os: { name: 'linux' } }] })).toBe(false);
    expect(check({ rules: [{ action: 'allow', os: { name: 'osx' } }] })).toBe(false);
  });

  it('isValidLibrary: multi-rule last-match-wins (lwjgl-platform style)', () => {
    const check = (lib: { rules: unknown[] }) =>
      (launcher as unknown as { isValidLibrary(l: { rules: unknown[] }): boolean }).isValidLibrary(lib as never);
    // [{allow all}, {disallow osx}] → excluded on osx, included everywhere else
    const lib = {
      rules: [{ action: 'allow' }, { action: 'disallow', os: { name: 'osx' } }],
    };
    expect(check(lib)).toBe(true);
  });

  it('isValidLibrary: arch-specific allow rules match the current arch', () => {
    const check = (lib: { rules: unknown[] }) =>
      (launcher as unknown as { isValidLibrary(l: { rules: unknown[] }): boolean }).isValidLibrary(lib as never);
    // x64 machine: arch = x86_64
    const lib = {
      rules: [{ action: 'allow', os: { name: 'windows', arch: 'x86_64' } }],
    };
    expect(check(lib)).toBe(true);
    const wrongArch = {
      rules: [{ action: 'allow', os: { name: 'windows', arch: 'x86' } }],
    };
    expect(check(wrongArch)).toBe(false);
  });
});

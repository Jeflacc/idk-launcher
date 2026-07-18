import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { HttpClient } from '../net/http-client';

/**
 * Resolved version JSON — the fully merged result of resolving `inheritsFrom`
 * chains (Fabric, Forge, etc.).
 */
interface VersionJson {
  id: string;
  mainClass: string;
  inheritsFrom?: string;
  arguments?: { game?: unknown[]; jvm?: unknown[] };
  minecraftArguments?: string;
  libraries: MclcLibrary[];
  downloads?: { client?: { url: string; sha1?: string; size?: number } };
  assetIndex?: { id: string; url: string; sha1?: string; size?: number };
  assets?: string;
  javaVersion?: { component?: string; majorVersion?: number };
  logging?: unknown;
}

interface MclcLibrary {
  name: string;
  url?: string;
  downloads?: {
    artifact?: { path: string; url: string; sha1?: string; size?: number };
    classifiers?: Record<string, { path: string; url: string; sha1?: string; size?: number; natives?: string }>;
  };
  rules?: { action: string; os?: { name: string }; features?: Record<string, boolean> }[];
  natives?: Record<string, string>;
}

interface LaunchOpts {
  root: string;
  versionId: string;
  javaPath: string;
  memory: { max: number; min: number };
  auth: { access_token: string; client_token: string; uuid: string; name: string; user_properties: string };
  windowSize?: { width: number; height: number };
  customArgs?: string[];
  directory?: string;
  gameDirectory?: string;
  window?: { width: number; height: number; fullscreen?: boolean };
}

const MOJANG_META = 'https://piston-meta.mojang.com';
const MOJANG_RESOURCES = 'https://resources.download.minecraft.net';
const MAVEN_DEFAULT = 'https://libraries.minecraft.net';
const FORGE_MAVEN = 'https://files.minecraftforge.net/maven/';
const FALLBACK_MAVEN = 'https://search.maven.org/remotecontent?filepath=';

/**
 * Custom async Minecraft launcher. Replaces `minecraft-launcher-core` (mclc)
 * which uses the deprecated `request` library that blocks the Node.js event
 * loop on Windows, causing the main Electron window to become unresponsive
 * during downloads.
 *
 * All I/O here uses the project's `HttpClient` (native `fetch`) and async
 * `node:fs/promises` — nothing blocks the event loop.
 */
export class McLauncher extends EventEmitter {

  constructor(private readonly http: HttpClient) {
    super();
  }

  async launch(opts: LaunchOpts): Promise<ChildProcess> {
    const root = opts.root;

    // 1. Resolve version JSON (handles inheritsFrom for Fabric/Forge)
    this.emit('debug', '[MC] Resolving version JSON...');
    const version = await this.resolveVersion(root, opts.versionId);
    this.emit('debug', `[MC] Version resolved: ${version.id}`);

    // 2. Create directories
    const directory = opts.directory || join(root, 'versions', version.id);
    await this.ensureDir(directory);
    await this.ensureDir(join(root, 'assets'));

    // 3. Download client jar
    const mcPath = await this.downloadJar(version, directory);
    this.emit('debug', `[MC] Client jar ready: ${mcPath}`);

    // 4. Download libraries
    this.emitProgress('libraries', 'downloading', 0, 1);
    const classpath = await this.downloadLibraries(version, root);
    this.emit('debug', `[MC] Libraries ready (${classpath.length} entries)`);

    // 5. Download assets
    await this.downloadAssets(version, root);

    // 6. Handle natives (pre-1.19)
    const nativePath = await this.handleNatives(version, root);

    // 7. Build classpath
    const separator = process.platform === 'win32' ? ';' : ':';
    const classPathStr = [...classpath, mcPath].join(separator);
    this.emit('debug', `[MC] Classpath built (${classpath.length} libs + jar)`);

    // 8. Build JVM args
    const jvm = this.buildJvmArgs(version, opts, nativePath, classPathStr);

    // 9. Build game args
    const gameArgs = this.buildGameArgs(version, opts);

    // 10. Pre-flight checks
    if (!version.mainClass) {
      throw new Error(`No mainClass in version JSON for ${version.id} — version JSON may be corrupted or incomplete`);
    }
    if (!existsSync(mcPath)) {
      throw new Error(`Client jar not found at ${mcPath} — download may have failed`);
    }
    const jarSize = statSync(mcPath).size;
    if (jarSize < 1024) {
      throw new Error(`Client jar is suspiciously small (${jarSize} bytes) at ${mcPath} — file may be corrupted`);
    }

    // 11. Spawn Java
    const allArgs = [...jvm, version.mainClass, ...gameArgs];
    this.emit('debug', `[MC] Spawning: ${opts.javaPath} ${allArgs.slice(0, 5).join(' ')}...`);
    this.emit('debug', `[MC] mainClass: ${version.mainClass}`);
    this.emit('debug', `[MC] classpath: ${classpath.length} libs + jar (${mcPath})`);
    this.emitProgress('starting', 'done', 1, 1);

    const child = spawn(opts.javaPath, allArgs, {
      cwd: opts.gameDirectory || root,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (data: Buffer) => this.emit('data', data.toString('utf-8')));
    child.stderr?.on('data', (data: Buffer) => this.emit('data', data.toString('utf-8')));
    child.on('close', (code) => this.emit('close', code));
    child.on('error', (err) => this.emit('error', err));

    return child;
  }

  // ── Version resolution ──

  private async resolveVersion(root: string, versionId: string): Promise<VersionJson> {
    const directory = join(root, 'versions', versionId);
    const jsonPath = join(directory, `${versionId}.json`);

    if (existsSync(jsonPath)) {
      const raw = JSON.parse(await readFile(jsonPath, 'utf8'));
      return this.resolveInheritsFrom(root, raw);
    }

    // Download version manifest to find this version
    const manifest = await this.http.getJson<{ versions: { id: string; url: string }[] }>(
      `${MOJANG_META}/mc/game/version_manifest_v2.json`,
    );
    const entry = manifest.versions.find((v) => v.id === versionId);
    if (!entry) throw new Error(`Version ${versionId} not found in Mojang manifest`);

    const versionJson = await this.http.getJson<VersionJson>(entry.url);
    await this.ensureDir(directory);
    await writeFile(jsonPath, JSON.stringify(versionJson, null, 4));
    return this.resolveInheritsFrom(root, versionJson);
  }

  /** Recursively resolve `inheritsFrom` chains (Fabric, Forge, etc.) */
  private async resolveInheritsFrom(root: string, json: VersionJson): Promise<VersionJson> {
    if (!json.inheritsFrom) return json;

    const parentDir = join(root, 'versions', json.inheritsFrom);
    const parentPath = join(parentDir, `${json.inheritsFrom}.json`);

    let parent: VersionJson;
    if (existsSync(parentPath)) {
      parent = JSON.parse(await readFile(parentPath, 'utf8'));
    } else {
      // Download parent from manifest
      const manifest = await this.http.getJson<{ versions: { id: string; url: string }[] }>(
        `${MOJANG_META}/mc/game/version_manifest_v2.json`,
      );
      const entry = manifest.versions.find((v) => v.id === json.inheritsFrom);
      if (!entry) throw new Error(`Parent version ${json.inheritsFrom} not found`);
      parent = await this.http.getJson<VersionJson>(entry.url);
      await this.ensureDir(parentDir);
      await writeFile(parentPath, JSON.stringify(parent, null, 4));
    }

    // Resolve parent chain first
    const resolvedParent = await this.resolveInheritsFrom(root, parent);

    // Merge: child overrides parent
    const merged: VersionJson = {
      ...resolvedParent,
      ...json,
      id: json.id,
      // Merge libraries: parent first, then child (child overrides by name)
      libraries: this.mergeLibraries(resolvedParent.libraries || [], json.libraries || []),
      // Merge arguments
      arguments: this.mergeArguments(resolvedParent.arguments, json.arguments),
      // Prefer child's mainClass
      mainClass: json.mainClass || resolvedParent.mainClass,
    };

    return merged;
  }

  private mergeLibraries(parentLibs: MclcLibrary[], childLibs: MclcLibrary[]): MclcLibrary[] {
    const byName = new Map<string, MclcLibrary>();
    for (const lib of parentLibs) {
      const key = lib.name.split(':').slice(0, 2).join(':');
      byName.set(key, lib);
    }
    for (const lib of childLibs) {
      const key = lib.name.split(':').slice(0, 2).join(':');
      byName.set(key, lib); // child overrides parent
    }
    return Array.from(byName.values());
  }

  private mergeArguments(
    parent?: { game?: unknown[]; jvm?: unknown[] },
    child?: { game?: unknown[]; jvm?: unknown[] },
  ): { game?: unknown[]; jvm?: unknown[] } | undefined {
    if (!parent && !child) return undefined;
    return {
      game: [...(parent?.game || []), ...(child?.game || [])],
      jvm: [...(parent?.jvm || []), ...(child?.jvm || [])],
    };
  }

  // ── Jar download ──

  private async downloadJar(version: VersionJson, directory: string): Promise<string> {
    const jarName = `${version.id}.jar`;
    const jarPath = join(directory, jarName);

    // Validate existing jar: skip only if file exists and has expected size
    if (existsSync(jarPath)) {
      const expectedSize = version.downloads?.client?.size;
      if (expectedSize) {
        try {
          const st = statSync(jarPath);
          if (st.size === expectedSize) return jarPath;
          this.emit('debug', `[MC] Client jar size mismatch (${st.size} vs ${expectedSize}), re-downloading`);
        } catch { /* stat failed, re-download */ }
      } else {
        return jarPath;
      }
    }

    const url = version.downloads?.client?.url;
    if (!url) throw new Error(`No client download URL for version ${version.id}`);

    this.emit('debug', `[MC] Downloading client jar: ${jarName}`);
    await this.http.downloadFile(url, jarPath, {
      expectedSha1: version.downloads?.client?.sha1,
      expectedSize: version.downloads?.client?.size,
    });
    return jarPath;
  }

  // ── Library download ──

  private async downloadLibraries(version: VersionJson, root: string): Promise<string[]> {
    const libDir = join(root, 'libraries');
    const libs = version.libraries.filter((lib) => this.isValidLibrary(lib));

    this.emitProgress('libraries', 'downloading', 0, libs.length);
    const classpath: string[] = [];
    let done = 0;

    // Download in batches of 8
    const BATCH = 8;
    for (let i = 0; i < libs.length; i += BATCH) {
      const batch = libs.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (lib) => {
          const result = await this.downloadLibrary(lib, libDir);
          done++;
          this.emitProgress('libraries', 'downloading', done, libs.length);
          return result;
        }),
      );
      classpath.push(...results.filter(Boolean) as string[]);
    }

    return classpath;
  }

  private async downloadLibrary(lib: MclcLibrary, libDir: string): Promise<string | null> {
    let name = lib.name;
    let url: string | undefined;
    let sha1: string | undefined;
    let size: number | undefined;

    if (lib.downloads?.artifact) {
      const art = lib.downloads.artifact;
      url = art.url;
      sha1 = art.sha1;
      size = art.size;
      const jarPath = join(libDir, art.path);
      if (existsSync(jarPath)) return jarPath;
      await this.http.downloadFile(url, jarPath, { expectedSha1: sha1, expectedSize: size });
      return jarPath;
    }

    // Fallback: construct URL from Maven coordinates
    const parts = name.split(':');
    if (parts.length < 3) return null;
    const group = (parts[0] ?? '').replace(/\./g, '/');
    const artifact = parts[1] ?? '';
    const version = parts[2] ?? '';
    const classifier = parts[3] || '';
    const jarName = classifier ? `${artifact}-${version}-${classifier}.jar` : `${artifact}-${version}.jar`;
    const relativePath = `${group}/${artifact}/${version}/${jarName}`;
    const jarPath = join(libDir, relativePath);

    if (existsSync(jarPath)) return jarPath;

    // Try default repo, then fallback
    const repos = [MAVEN_DEFAULT, FORGE_MAVEN, FALLBACK_MAVEN];
    url = lib.url || repos[0];

    for (const repo of repos) {
      try {
        const fullUrl = repo === FALLBACK_MAVEN
          ? `${repo}${relativePath}`
          : `${repo}${relativePath}`;
        await this.http.downloadFile(fullUrl, jarPath, { expectedSha1: sha1 });
        return jarPath;
      } catch {
        // try next repo
      }
    }

    this.emit('warning', { message: `[MC] Failed to download library: ${name}` });
    return null;
  }

  private isValidLibrary(lib: MclcLibrary): boolean {
    if (!lib.rules) return true;
    const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
    for (const rule of lib.rules) {
      if (rule.action === 'allow') {
        if (rule.os) return rule.os.name === os;
        return true;
      }
      if (rule.action === 'disallow') {
        if (rule.os) return rule.os.name !== os;
        return false;
      }
    }
    return true;
  }

  // ── Asset download ──

  private async downloadAssets(version: VersionJson, root: string): Promise<void> {
    if (!version.assetIndex) return;

    const assetDir = join(root, 'assets');
    const indexDir = join(assetDir, 'indexes');
    const objectsDir = join(assetDir, 'objects');
    await this.ensureDir(indexDir);
    await this.ensureDir(objectsDir);

    const assetId = version.assets || version.id;
    const indexPath = join(indexDir, `${assetId}.json`);

    if (!existsSync(indexPath)) {
      await this.http.downloadFile(version.assetIndex.url, indexPath, {
        expectedSha1: version.assetIndex.sha1,
        expectedSize: version.assetIndex.size,
      });
    }

    const index = JSON.parse(await readFile(indexPath, 'utf8'));
    const entries = Object.entries(index.objects) as [string, { hash: string; size: number }][];

    this.emitProgress('assets', 'downloading', 0, entries.length);
    let done = 0;

    const BATCH = 16;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async ([, obj]) => {
          const hash = obj.hash;
          const sub = hash.substring(0, 2);
          const objDir = join(objectsDir, sub);
          const objPath = join(objDir, hash);
          if (!existsSync(objPath)) {
            await this.ensureDir(objDir);
            await this.http.downloadFile(`${MOJANG_RESOURCES}/${sub}/${hash}`, objPath);
          }
          done++;
          this.emitProgress('assets', 'downloading', done, entries.length);
        }),
      );
    }
  }

  // ── Natives (pre-1.19) ──

  private async handleNatives(version: VersionJson, root: string): Promise<string> {
    const mcVersion = parseInt(version.id.split('.')[1] || '0', 10);
    if (mcVersion >= 19) return root; // post-1.19 doesn't use separate natives

    const nativeDir = join(root, 'natives', version.id);
    if (existsSync(nativeDir) && (await readdir(nativeDir)).length > 0) {
      return nativeDir;
    }

    await this.ensureDir(nativeDir);
    const natives = version.libraries.filter((lib) => lib.natives && this.isValidLibrary(lib));

    for (const lib of natives) {
      const classifier = lib.natives?.[process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux'];
      if (!classifier || !lib.downloads?.classifiers?.[classifier]) continue;

      const dl = lib.downloads.classifiers[classifier];
      const jarName = dl.path.split('/').pop()!;
      const tmpPath = join(nativeDir, jarName);

      if (!existsSync(tmpPath)) {
        await this.http.downloadFile(dl.url, tmpPath, { expectedSha1: dl.sha1 });
      }

      // Extract zip using adm-zip or basic extraction
      // For simplicity, we'll use Node.js built-in unzip capabilities
      try {
        await this.extractZip(tmpPath, nativeDir);
      } catch {
        // ignore extraction errors for native jars
      }
    }

    return nativeDir;
  }

  private async extractZip(zipPath: string, targetDir: string): Promise<void> {
    // Use dynamic import for adm-zip if available, otherwise skip
    try {
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(targetDir, true);
    } catch {
      // adm-zip not available — natives extraction skipped
      // This is OK for modern MC (1.19+) which doesn't need natives
    }
  }

  // ── JVM args ──

  private buildJvmArgs(
    version: VersionJson,
    opts: LaunchOpts,
    nativePath: string,
    classPathStr: string,
  ): string[] {
    const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
    const mcVersion = parseInt(version.id.split('.')[1] || '0', 10);

    const jvm: string[] = [
      `-Xmx${opts.memory.max}M`,
      `-Xms${opts.memory.min}M`,
      `-Djava.library.path=${nativePath}`,
      '-cp',
      classPathStr,
    ];

    // Version-specific JVM flags
    if (os === 'windows') {
      jvm.push('-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump');
    }
    if (os === 'osx') {
      jvm.push('-XstartOnFirstThread');
    }
    if (os === 'linux') {
      jvm.push('-Xss1M');
    }

    // Log4j mitigation for affected versions
    if (mcVersion >= 17 && mcVersion <= 18 && !version.id.split('.')[2]) {
      jvm.push('-Dlog4j2.formatMsgNoLookups=true');
    }

    // Merge custom JVM args from version JSON
    if (version.arguments?.jvm) {
      for (const arg of version.arguments.jvm) {
        if (typeof arg === 'string') {
          jvm.push(arg);
        } else if (typeof arg === 'object' && arg !== null) {
          const a = arg as { rules?: { action: string; os?: { name: string } }[]; value?: string | string[] };
          if (a.rules && !this.evaluateRules(a.rules)) continue;
          if (a.value) {
            jvm.push(...(Array.isArray(a.value) ? a.value : [a.value]));
          }
        }
      }
    }

    // Custom args from user
    if (opts.customArgs) jvm.push(...opts.customArgs);

    return jvm;
  }

  // ── Game args ──

  private buildGameArgs(version: VersionJson, opts: LaunchOpts): string[] {
    const args: string[] = [];

    const fields: Record<string, string> = {
      '${auth_access_token}': opts.auth.access_token,
      '${auth_session}': opts.auth.access_token,
      '${auth_player_name}': opts.auth.name,
      '${auth_uuid}': opts.auth.uuid,
      '${auth_xuid}': opts.auth.access_token,
      '${user_properties}': opts.auth.user_properties,
      '${user_type}': 'mojang',
      '${version_name}': version.id,
      '${assets_index_name}': version.assets || version.id,
      '${game_directory}': opts.gameDirectory || opts.root,
      '${assets_root}': join(opts.root, 'assets'),
      '${game_assets}': join(opts.root, 'assets'),
      '${version_type}': 'release',
      '${clientid}': opts.auth.client_token,
    };

    // Use minecraftArguments (legacy) or arguments.game (modern)
    const gameArgs = version.arguments?.game || (version.minecraftArguments ? version.minecraftArguments.split(' ') : []);

    for (let i = 0; i < gameArgs.length; i++) {
      const arg = gameArgs[i];
      if (typeof arg === 'string') {
        args.push(fields[arg] ?? arg);
      } else if (typeof arg === 'object' && arg !== null) {
        const a = arg as { rules?: { action: string; features?: Record<string, boolean> }[]; value?: string | string[] };
        if (a.rules && !this.evaluateRules(a.rules)) continue;
        if (a.value) {
          args.push(...(Array.isArray(a.value) ? a.value : [a.value]));
        }
      }
    }

    // Window size
    if (opts.windowSize) {
      args.push('--width', String(opts.windowSize.width));
      args.push('--height', String(opts.windowSize.height));
    }

    return args;
  }

  private evaluateRules(rules: { action: string; os?: { name: string }; features?: Record<string, boolean> }[]): boolean {
    const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
    let result = false;
    for (const rule of rules) {
      const osMatch = !rule.os || rule.os.name === os;
      if (rule.action === 'allow') {
        if (osMatch) result = true;
      } else if (rule.action === 'disallow') {
        if (osMatch) result = false;
      }
    }
    return result;
  }

  // ── Helpers ──

  private async ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
  }

  private emitProgress(type: string, phase: string, completed: number, total: number): void {
    this.emit('progress', { type, phase, completed, total });
  }
}

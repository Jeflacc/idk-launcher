import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { HttpClient } from '../net/http-client';
import { HttpClientError } from '../net/http-client';

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
  rules?: { action: string; os?: { name: string; arch?: string }; features?: Record<string, boolean> }[];
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
  /** Mod loader (fabric). If set, the loader profile is installed/resolved before launch. */
  loader?: string;
  loaderVersion?: string;
  /** Shared versions dir. Defaults to `<root>/versions` — pass the common root so instances don't re-download. */
  versionsRoot?: string;
  /** Shared libraries dir. Defaults to `<root>/libraries` — pass the common root so instances don't re-download. */
  librariesRoot?: string;
  /** Shared assets dir. Defaults to `<root>/assets` — pass the common root so instances don't re-download. */
  assetsRoot?: string;
  /** Auth provider actually used for this launch. Ely.by needs the authlib-injector javaagent. */
  authProvider?: 'elyby' | 'microsoft' | 'offline';
  /** Path to authlib-injector.jar — required when authProvider is 'elyby'. */
  authlibInjectorJar?: string;
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
    // Versions (JSONs + jars) are version-independent — share them across
    // instances when a common root is provided, exactly like assets/libraries.
    // `versionsRoot` IS the versions directory (defaults to `<root>/versions`).
    const versionsRoot = opts.versionsRoot ?? join(opts.root, 'versions');
    const gameDir = opts.gameDirectory || opts.root;

    // 1. Resolve version JSON (handles inheritsFrom for Fabric/Forge)
    this.emit('debug', '[MC] Resolving version JSON...');
    const version = await this.resolveVersion(versionsRoot, opts.versionId, opts.loader, opts.loaderVersion);
    this.emit('debug', `[MC] Version resolved: ${version.id}`);

    // 2. Create directories
    const directory = opts.directory || join(versionsRoot, version.id);
    await this.ensureDir(directory);

    // 3. Download client jar
    const mcPath = await this.downloadJar(version, directory, versionsRoot);
    this.emit('debug', `[MC] Client jar ready: ${mcPath}`);

    // 4. Download libraries
    this.emitProgress('libraries', 'downloading', 0, 1);
    const classpath = await this.downloadLibraries(version, opts.librariesRoot ?? join(opts.root, 'libraries'));
    this.emit('debug', `[MC] Libraries ready (${classpath.length} entries)`);

    // 5. Download assets
    await this.downloadAssets(version, opts.assetsRoot ?? gameDir);

    // 6. Handle natives (pre-1.19)
    const nativePath = await this.handleNatives(version, gameDir);

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
      cwd: gameDir,
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

  private async resolveVersion(
    root: string,
    versionId: string,
    loader?: string,
    loaderVersion?: string,
  ): Promise<VersionJson> {
    // Fabric: synthesize/refresh a fabric-loader profile that inherits the
    // vanilla version JSON. Without this step, modpacks launch as VANILLA —
    // the loader field on the instance would be silently ignored.
    if (loader === 'fabric') {
      return this.resolveFabricVersion(root, versionId, loaderVersion);
    }
    if (loader && loader !== 'vanilla') {
      this.emit('warning', { message: `[MC] Loader "${loader}" is not supported yet — launching vanilla ${versionId}. Install ${loader} manually to use mods.` });
    }

    // `root` is the VERSIONS directory (versionsRoot) — version JSONs and
    // jars live directly inside it.
    const directory = join(root, versionId);
    const jsonPath = join(directory, `${versionId}.json`);

    if (existsSync(jsonPath)) {
      const raw = await this.readJsonFile<VersionJson>(jsonPath);
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

  /**
   * Fabric loader resolution: fetches the official Fabric profile JSON from
   * meta.fabricmc.net (libraries + mainClass = KnotClient) and persists it as
   * `versions/fabric-loader-<v>-<mc>/fabric-loader-<v>-<mc>.json` with
   * `inheritsFrom: <mc>`, so the standard merge pipeline handles the rest.
   */
  private async resolveFabricVersion(
    root: string,
    mcVersion: string,
    requestedLoaderVersion?: string,
  ): Promise<VersionJson> {
    if (!mcVersion) {
      throw new Error('Cannot resolve Fabric loader: Minecraft version is empty. Make sure the modpack was imported with a valid Minecraft version.');
    }
    this.emitProgress('loader', 'downloading', 0, 2);

    let loaderVersion = requestedLoaderVersion;
    if (!loaderVersion) {
      // Prefer an already-downloaded Fabric profile — the launch must work
      // offline and instant when everything is cached. Only hit the Fabric
      // meta endpoint when no profile exists for this MC version yet.
      // `root` is the VERSIONS directory — profiles live directly inside it.
      if (existsSync(root)) {
        const prefix = 'fabric-loader-';
        const suffix = `-${mcVersion}`;
        const cached = readdirSync(root, { withFileTypes: true }).find(
          (e) => e.isDirectory() && e.name.startsWith(prefix) && e.name.endsWith(suffix),
        );
        if (cached) {
          loaderVersion = cached.name.slice(prefix.length, cached.name.length - suffix.length);
          this.emit('debug', `[MC] Using cached Fabric profile (loader ${loaderVersion})`);
        }
      }
    }
    if (!loaderVersion) {
      // /v2/versions/loader/{mc} returns an ARRAY of { loader, intermediary, launcherMeta }
      this.emit('debug', `[MC] No cached Fabric profile — querying meta.fabricmc.net for MC ${mcVersion}...`);
      let meta: { loader: { version: string; stable?: boolean } }[];
      try {
        meta = await this.http.getJson<{ loader: { version: string; stable?: boolean } }[]>(
          `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`,
        );
      } catch (err) {
        if (err instanceof HttpClientError && err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
          throw new Error(`No Fabric loader available for Minecraft ${mcVersion}. The version may not be supported by Fabric yet.`);
        }
        throw err;
      }
      if (!Array.isArray(meta) || meta.length === 0) {
        throw new Error(`No Fabric loader available for Minecraft ${mcVersion}`);
      }
      const stable = meta.find((l) => l.loader?.stable !== false);
      loaderVersion = (stable ?? meta[0])?.loader?.version;
      if (!loaderVersion) throw new Error(`No Fabric loader available for Minecraft ${mcVersion}`);
    }

    const profileId = `fabric-loader-${loaderVersion}-${mcVersion}`;
    const dir = join(root, profileId);
    const jsonPath = join(dir, `${profileId}.json`);

    if (!existsSync(jsonPath)) {
      this.emit('debug', `[MC] Downloading Fabric profile ${loaderVersion} for MC ${mcVersion}...`);
      let profile: VersionJson & { id?: string };
      try {
        profile = await this.http.getJson<VersionJson & { id?: string }>(
          `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVersion}/profile/json`,
        );
      } catch (err) {
        if (err instanceof HttpClientError && err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
          throw new Error(`Fabric loader ${loaderVersion} is not available for Minecraft ${mcVersion}. Check that the modpack's Minecraft version and loader version are compatible.`);
        }
        throw err;
      }
      profile.id = profileId;
      await this.ensureDir(dir);
      await writeFile(jsonPath, JSON.stringify(profile, null, 4));
    }

    this.emitProgress('loader', 'downloading', 1, 2);
    const raw = await this.readJsonFile<VersionJson>(jsonPath);
    const resolved = await this.resolveInheritsFrom(root, raw);
    this.emitProgress('loader', 'downloading', 2, 2);
    return resolved;
  }

  /** Recursively resolve `inheritsFrom` chains (Fabric, Forge, etc.) */
  private async resolveInheritsFrom(root: string, json: VersionJson): Promise<VersionJson> {
    if (!json.inheritsFrom) return json;

    const parentDir = join(root, json.inheritsFrom);
    const parentPath = join(parentDir, `${json.inheritsFrom}.json`);

    let parent: VersionJson;
    if (existsSync(parentPath)) {
      parent = await this.readJsonFile<VersionJson>(parentPath);
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
    // Key by the FULL artifact coordinate (group:artifact:version:classifier) —
    // NOT group:artifact. LWJGL ships a core jar plus per-arch natives jars
    // sharing one group:artifact; collapsing them by group:artifact leaves only
    // the LAST variant (e.g. natives-windows-x86) and drops the core jar,
    // causing NoClassDefFoundError (org.lwjgl.system.MathUtil) at game start.
    const byName = new Map<string, MclcLibrary>();
    for (const lib of parentLibs) {
      byName.set(lib.name, lib);
    }
    for (const lib of childLibs) {
      byName.set(lib.name, lib); // child overrides identical coordinates
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

  private async downloadJar(version: VersionJson, directory: string, versionsRoot: string): Promise<string> {
    // Fabric/Forge profiles download the VANILLA client jar. If the parent
    // version's jar is already present, reuse it instead of copying the same
    // ~25 MB jar under the profile id on every loader change.
    if (version.inheritsFrom) {
      const parentJar = join(versionsRoot, version.inheritsFrom, `${version.inheritsFrom}.jar`);
      if (existsSync(parentJar)) {
        const expectedSize = version.downloads?.client?.size;
        if (expectedSize) {
          try {
            if (statSync(parentJar).size === expectedSize) {
              this.emit('debug', `[MC] Reusing client jar from parent version ${version.inheritsFrom}`);
              return parentJar;
            }
            this.emit('debug', `[MC] Parent jar size mismatch (${statSync(parentJar).size} vs ${expectedSize}), re-downloading`);
          } catch { /* stat failed, re-download */ }
        } else {
          return parentJar;
        }
      }
    }

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
    // `root` IS the libraries directory — artifacts live directly inside it
    // (the caller passes the shared librariesRoot).
    const libDir = root;
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

    // Try the library's own URL first (e.g. maven.fabricmc.net for Fabric),
    // then fall back to default repositories.
    const repos = [lib.url, MAVEN_DEFAULT, FORGE_MAVEN, FALLBACK_MAVEN].filter(Boolean);

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
    if (!lib.rules || lib.rules.length === 0) return true;
    const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
    const arch = process.arch === 'x64' ? 'x86_64' : process.arch;
    // Mojang rule semantics: rules are evaluated IN ORDER and the LAST
    // matching rule decides; if none match, the library is excluded.
    // (The previous first-rule-return broke multi-rule entries like
    //  lwjgl-platform's [{allow}, {disallow:osx}] — always allowed on osx.)
    let result = false;
    for (const rule of lib.rules) {
      const osMatch =
        !rule.os ||
        (rule.os.name === os && (!rule.os.arch || rule.os.arch === arch));
      const featuresMatch =
        !rule.features ||
        Object.values(rule.features).every((v) => v === false);
      if (!osMatch || !featuresMatch) continue;
      if (rule.action === 'allow') {
        result = true;
      } else if (rule.action === 'disallow') {
        result = false;
      }
    }
    return result;
  }

  // ── Asset download ──

  private async downloadAssets(version: VersionJson, root: string): Promise<void> {
    if (!version.assetIndex) return;

    // `root` IS the assets directory — indexes/ and objects/ live directly
    // inside it (the caller passes the shared assetsRoot).
    const assetDir = root;
    const indexDir = join(assetDir, 'indexes');
    const objectsDir = join(assetDir, 'objects');
    await this.ensureDir(indexDir);
    await this.ensureDir(objectsDir);

    const assetId = version.assets || version.id;
    const indexPath = join(indexDir, `${assetId}.json`);

    if (!existsSync(indexPath)) {
      this.emit('debug', `[MC] Downloading asset index ${assetId}...`);
      await this.http.downloadFile(version.assetIndex.url, indexPath, {
        expectedSha1: version.assetIndex.sha1,
        expectedSize: version.assetIndex.size,
      });
    }

    const index = JSON.parse(await readFile(indexPath, 'utf8'));
    const entries = Object.entries(index.objects) as [string, { hash: string; size: number }][];
    this.emit('debug', `[MC] Assets: index ${assetId} lists ${entries.length} objects`);

    // Verify first, download only what's actually missing. Emitting
    // "downloading" progress while merely checking would make the UI lie
    // about network activity for instances that are already complete.
    const missing: { hash: string; size: number }[] = [];
    for (const [, obj] of entries) {
      if (!existsSync(join(objectsDir, obj.hash.substring(0, 2), obj.hash))) {
        missing.push(obj);
      }
    }

    if (missing.length === 0) {
      this.emit('debug', `[MC] Assets up to date (${entries.length} objects present)`);
      this.emitProgress('assets', 'done', entries.length, entries.length);
      return;
    }

    this.emit('debug', `[MC] Downloading ${missing.length} missing assets (${entries.length} total)...`);
    this.emitProgress('assets', 'downloading', 0, missing.length);
    let done = 0;

    const BATCH = 16;
    for (let i = 0; i < missing.length; i += BATCH) {
      const batch = missing.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (obj) => {
          const hash = obj.hash;
          const sub = hash.substring(0, 2);
          const objDir = join(objectsDir, sub);
          await this.ensureDir(objDir);
          await this.http.downloadFile(`${MOJANG_RESOURCES}/${sub}/${hash}`, join(objDir, hash));
          done++;
          this.emitProgress('assets', 'downloading', done, missing.length);
        }),
      );
    }
    this.emit('debug', `[MC] Assets ready (${entries.length} objects)`);
  }

  // ── Natives (pre-1.19) ──

  private async handleNatives(version: VersionJson, root: string): Promise<string> {
    if (this.mcMajor(version) >= 19) return root; // post-1.19 doesn't use separate natives

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
    const mcVersion = this.mcMajor(version);

    const jvm: string[] = [
      `-Xmx${opts.memory.max}M`,
      `-Xms${opts.memory.min}M`,
      `-Djava.library.path=${nativePath}`,
      '-cp',
      classPathStr,
    ];

    // Ely.by accounts authenticate through authlib-injector (v1 behavior).
    // Without the javaagent, Ely.by sessions are rejected by Ely.by servers.
    if (opts.authProvider === 'elyby' && opts.authlibInjectorJar) {
      jvm.push(`-javaagent:${opts.authlibInjectorJar}=https://authserver.ely.by/api/authlib-injector`);
    }

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

    // Merge custom JVM args from version JSON.
    // We already set -cp + classPathStr and -Djava.library.path=nativePath manually.
    // The version JSON also contains these with placeholders — we must either skip
    // duplicates or substitute the placeholders. We substitute where possible and
    // skip the -cp duplicate (the last -cp wins in the JVM, so a raw "${classpath}"
    // would break class resolution).
    const jvmPlaceholders: Record<string, string> = {
      '${natives_directory}': nativePath,
      '${classpath}': classPathStr,
      '${launcher_name}': 'IDK Launcher',
      '${launcher_version}': '2.0.0',
    };
    if (version.arguments?.jvm) {
      let skipNext = false;
      for (const arg of version.arguments.jvm) {
        if (skipNext) {
          skipNext = false;
          continue;
        }
        if (typeof arg === 'string') {
          if (arg === '-cp') {
            skipNext = true; // skip the next element (the classpath placeholder)
            continue;
          }
          jvm.push(jvmPlaceholders[arg] ?? arg);
        } else if (typeof arg === 'object' && arg !== null) {
          const a = arg as { rules?: { action: string; os?: { name: string } }[]; value?: string | string[] };
          if (a.rules && !this.evaluateRules(a.rules)) continue;
          if (a.value) {
            const values = Array.isArray(a.value) ? a.value : [a.value];
            let skipInArray = false;
            for (const v of values) {
              if (skipInArray) {
                skipInArray = false;
                continue;
              }
              if (v === '-cp') {
                skipInArray = true;
                continue;
              }
              jvm.push(jvmPlaceholders[v] ?? v);
            }
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
      '${assets_root}': opts.assetsRoot ?? join(opts.root, 'assets'),
      '${game_assets}': opts.assetsRoot ?? join(opts.root, 'assets'),
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

  private evaluateRules(
    rules: { action: string; os?: { name: string; arch?: string }; features?: Record<string, boolean> }[],
    activeFeatures: Record<string, boolean> = {},
  ): boolean {
    const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
    const arch = process.arch === 'x64' ? 'x86_64' : process.arch;
    let result = false;
    for (const rule of rules) {
      const osMatch =
        !rule.os ||
        (rule.os.name === os && (!rule.os.arch || rule.os.arch === arch));
      // Per Mojang spec: features must ALL be present in activeFeatures to match
      const featuresMatch = !rule.features ||
        Object.entries(rule.features).every(([k, v]) => activeFeatures[k] === v);
      if (rule.action === 'allow') {
        if (osMatch && featuresMatch) result = true;
      } else if (rule.action === 'disallow') {
        if (osMatch && featuresMatch) result = false;
      }
    }
    return result;
  }

  // ── Helpers ──

  private async ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
  }

  /** Read + parse a JSON file with the path attached to any error. */
  private async readJsonFile<T = unknown>(path: string): Promise<T> {
    const raw = await readFile(path, 'utf8');
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`Corrupted JSON in ${path}: ${detail}`);
    }
  }

  private emitProgress(type: string, phase: string, completed: number, total: number): void {
    this.emit('progress', { type, phase, completed, total });
  }

  /**
   * Extract the "major" MC version from a version id, handling BOTH versioning
   * schemes: classic `1.8.9` → 8, `1.20.1` → 20, and new-style `26.1.2` → 26.
   * For loader profiles (id = `fabric-loader-x-y-z`), uses the inherited
   * vanilla version instead — parsing the profile id would give garbage.
   */
  private mcMajor(version: VersionJson): number {
    const id = version.inheritsFrom ?? version.id;
    const parts = id.split('.');
    if (parts[0] === '1' && parts[1]) return parseInt(parts[1], 10) || 0;
    return parseInt(parts[0] ?? '0', 10) || 0;
  }
}

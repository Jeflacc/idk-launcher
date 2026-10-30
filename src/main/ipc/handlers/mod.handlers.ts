import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import { join, basename } from 'node:path';
import { mkdir, rm, readdir, writeFile } from 'node:fs/promises';
import AdmZip from 'adm-zip';
import type { WindowManager } from '../../windows/window-manager';
import type { ModrinthClient, ModrinthProject, ModrinthVersion } from '@/infrastructure/net/api/modrinth-client';
import type { CurseforgeClient } from '@/infrastructure/net/api/curseforge-client';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import type { HttpClient } from '@/infrastructure/net/http-client';
import type { DownloadQueue } from '@/infrastructure/download/download-queue';
import type { DownloadItem } from '@/shared/types/download';
import type { PathService } from '@/infrastructure/fs/path-service';

/**
 * Mod IPC handlers — search, install, remove, update, dependency resolution.
 *
 * Replaces v1's 23+ direct renderer-side fetch() calls to api.modrinth.com
 * and 8+ to api.curse.tools. All mod file operations go through the
 * ModpackRepository + HttpClient + DownloadQueue.
 */
export function registerModHandlers(
  windows: WindowManager,
  modrinth: ModrinthClient,
  curseforge: CurseforgeClient,
  repo: ModpackRepository,
  http: HttpClient,
  queue: DownloadQueue,
  paths: PathService,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  // Search mods on Modrinth
  registerInvoke(
    IpcChannel.Mod.Search,
    z.object({
      query: z.string().default(''),
      loader: z.string().nullable().optional(),
      projectType: z.enum(['mod', 'modpack', 'resourcepack', 'shader']).default('mod'),
      limit: z.number().default(20),
      offset: z.number().default(0),
      categories: z.array(z.string()).default([]),
      gameVersion: z.string().nullable().optional(),
    }),
    async (_e, args) => {
      const offset = args.offset ?? 0;
      const categories = args.categories ?? [];
      const gameVersion = args.gameVersion ?? null;
      if (args.projectType === 'modpack') {
        return modrinth.searchModpacks(args.query, args.loader ?? null, args.limit, offset, categories, gameVersion);
      }
      if (args.projectType === 'shader') {
        return modrinth.searchShaders(args.query, args.limit, offset, categories, gameVersion);
      }
      if (args.projectType === 'resourcepack') {
        return modrinth.searchResourcepacks(args.query, args.limit, offset, categories, gameVersion);
      }
      return modrinth.searchMods(args.query, args.loader ?? null, args.limit, offset, categories, gameVersion);
    },
    { senderCheck: senderOk },
  );

  // Get Modrinth project metadata
  registerInvoke(
    IpcChannel.Mod.GetProject,
    z.object({ projectId: z.string() }),
    async (_e, args) => {
      return modrinth.getProject(args.projectId) as Promise<ModrinthProject>;
    },
    { senderCheck: senderOk },
  );

  // Get Modrinth versions for a project
  registerInvoke(
    IpcChannel.Mod.GetVersions,
    z.object({
      projectId: z.string(),
      gameVersion: z.string().optional(),
      loader: z.string().optional(),
    }),
    async (_e, args) => {
      return modrinth.getVersions(args.projectId, args.gameVersion, args.loader) as Promise<ModrinthVersion[]>;
    },
    { senderCheck: senderOk },
  );

  // Get dependencies for a project (fetches project + latest version's dependencies)
  registerInvoke(
    IpcChannel.Mod.GetDependencies,
    z.object({ projectId: z.string() }),
    async (_e, args) => {
      const versions = await modrinth.getVersions(args.projectId);
      if (versions.length === 0) return [];
      const latest = versions[0];
      return latest?.dependencies ?? [];
    },
    { senderCheck: senderOk },
  );

  // Check for mod updates across a modpack's mods
  registerInvoke(
    IpcChannel.Mod.CheckUpdates,
    z.object({
      mods: z.array(z.object({
        projectId: z.string().nullable(),
        fileId: z.string(),
        fileName: z.string(),
        gameVersion: z.string(),
        loader: z.string(),
      })),
    }),
    async (_e, args) => {
      const updates: Array<{
        fileId: string;
        projectId: string;
        currentVersion: string;
        latestVersion: string;
        latestVersionId: string;
        downloadUrl: string;
        name: string;
        changelog: string | null;
      }> = [];

      for (const mod of args.mods) {
        if (!mod.projectId) continue;
        try {
          const versions = await modrinth.getVersions(mod.projectId, mod.gameVersion, mod.loader);
          if (versions.length === 0) continue;
          const latest = versions[0];
          if (!latest) continue;
          if (latest.id !== mod.fileId) {
            const primaryFile = latest.files?.find((f) => f.primary) ?? latest.files?.[0];
            updates.push({
              fileId: mod.fileId,
              projectId: mod.projectId,
              currentVersion: mod.fileName,
              latestVersion: latest.name,
              latestVersionId: latest.id,
              downloadUrl: primaryFile?.url ?? '',
              name: latest.name,
              changelog: null,
            });
          }
        } catch {
          // Skip this mod if we can't fetch versions
        }
      }
      return updates;
    },
    { senderCheck: senderOk },
  );

  // Get changelog for a specific Modrinth version
  registerInvoke(
    IpcChannel.Mod.GetChangelog,
    z.object({ projectId: z.string(), versionId: z.string() }),
    async (_e, args) => {
      const project = await modrinth.getProject(args.projectId);
      return {
        body: project.description ?? '',
        versionId: args.versionId,
        projectId: args.projectId,
        title: project.title,
      };
    },
    { senderCheck: senderOk },
  );

  // Scan a modpack's mods for missing dependencies
  registerInvoke(
    IpcChannel.Mod.ScanMissingDependencies,
    z.object({ mods: z.array(z.object({ projectId: z.string().nullable(), fileName: z.string() })) }),
    async (_e, args) => {
      const missing: Array<{ projectId: string; name: string }> = [];
      for (const mod of args.mods) {
        if (!mod.projectId) continue;
        try {
          const versions = await modrinth.getVersions(mod.projectId);
          if (versions.length === 0) continue;
          const latest = versions[0];
          if (!latest) continue;
          const deps = latest.dependencies ?? [];
          for (const dep of deps) {
            if (dep.dependency_type === 'required' && dep.project_id) {
              try {
                const depProject = await modrinth.getProject(dep.project_id);
                missing.push({ projectId: dep.project_id, name: depProject.title });
              } catch {
                // Skip if we can't fetch the dep project
              }
            }
          }
        } catch {
          // Skip
        }
      }
      return missing;
    },
    { senderCheck: senderOk },
  );

  // Check for known mod incompatibilities
  registerInvoke(
    IpcChannel.Mod.CheckIncompatibilities,
    z.object({ modIds: z.array(z.string()) }),
    async (_e, args) => {
      // Check each pair of mods for known incompatibilities
      const knownIncompatibilities: Array<{ mod1: string; mod2: string; reason: string }> = [];
      const knownPairs: Record<string, string> = {
        'optifine+sodium': 'OptiFine is incompatible with Sodium — they both modify rendering',
        'optifine+rubidium': 'OptiFine is incompatible with Rubidium',
        'optifine+embeddium': 'OptiFine is incompatible with Embeddium',
        'sodium+optifabric': 'Sodium is incompatible with OptiFabric',
        'forge+fabric': 'Forge and Fabric loaders cannot coexist',
        'forge+quilt': 'Forge and Quilt loaders cannot coexist',
      };
      for (let i = 0; i < args.modIds.length; i++) {
        for (let j = i + 1; j < args.modIds.length; j++) {
          const pair1 = `${args.modIds[i]}+${args.modIds[j]}`.toLowerCase();
          const pair2 = `${args.modIds[j]}+${args.modIds[i]}`.toLowerCase();
          const reason = knownPairs[pair1] || knownPairs[pair2];
          if (reason) {
            knownIncompatibilities.push({ mod1: args.modIds[i] || '', mod2: args.modIds[j] || '', reason });
          }
        }
      }
      return knownIncompatibilities;
    },
    { senderCheck: senderOk },
  );

  // Install a mod from the browser into an existing modpack
  registerInvoke(
    IpcChannel.Mod.InstallFromBrowser,
    z.object({
      modpackId: z.string(),
      projectId: z.string().optional(),
      versionId: z.string().optional(),
      downloadUrl: z.string(),
      filename: z.string(),
      type: z.enum(['mod', 'resourcepack', 'shader']).default('mod'),
    }),
    async (_e, args) => {
      const subdir = args.type === 'mod' ? 'mods' : args.type === 'resourcepack' ? 'resourcepacks' : 'shaderpacks';
      const fileName = args.filename.replace(/[\\/:*?"<>|]/g, '-');
      const modpackDir = paths.modpackDirectory(args.modpackId);
      await mkdir(modpackDir, { recursive: true });
      await mkdir(join(modpackDir, subdir), { recursive: true });
      const targetPath = join(modpackDir, subdir, fileName);
      const downloadId = `mod:${args.modpackId}:${fileName}`;
      await queue.start(downloadId, [{ url: args.downloadUrl, targetPath, filename: fileName, skipIfPresent: false }], 1);
      return { success: true, fileName };
    },
    { senderCheck: senderOk },
  );

  // Install a mod to a specific version (not a modpack)
  registerInvoke(
    IpcChannel.Mod.InstallToVersion,
    z.object({
      version: z.string(),
      projectId: z.string().optional(),
      versionId: z.string().optional(),
      downloadUrl: z.string(),
      filename: z.string(),
    }),
    async (_e, args) => {
      const fileName = args.filename.replace(/[\\/:*?"<>|]/g, '-');
      const versionDir = join(paths.modpacks, args.version, 'mods');
      await mkdir(versionDir, { recursive: true });
      const targetPath = join(versionDir, fileName);
      const downloadId = `mod-version:${args.version}:${fileName}`;
      await queue.start(downloadId, [{ url: args.downloadUrl, targetPath, filename: fileName, skipIfPresent: false }], 1);
      return { success: true, fileName };
    },
    { senderCheck: senderOk },
  );

  // Install a mod update (replaces old file with new version)
  registerInvoke(
    IpcChannel.Mod.InstallUpdate,
    z.object({
      modpackId: z.string(),
      fileId: z.string(),
      downloadUrl: z.string(),
      fileName: z.string(),
      oldFileName: z.string().optional(),
    }),
    async (_e, args) => {
      // Remove the old file if provided
      if (args.oldFileName) {
        const oldPath = join(paths.modpackDirectory(args.modpackId), 'mods', args.oldFileName);
        try { await rm(oldPath, { force: true }); } catch { /* ignore */ }
      }
      // Download the new file
      const modpackDir = paths.modpackDirectory(args.modpackId);
      await mkdir(modpackDir, { recursive: true });
      await mkdir(join(modpackDir, 'mods'), { recursive: true });
      const targetPath = join(modpackDir, 'mods', args.fileName);
      const downloadId = `mod-update:${args.modpackId}:${args.fileName}`;
      await queue.start(downloadId, [{ url: args.downloadUrl, targetPath, filename: args.fileName, skipIfPresent: false }], 1);
      return { success: true, fileName: args.fileName };
    },
    { senderCheck: senderOk },
  );

  // Resolve (install) missing dependencies for a mod
  registerInvoke(
    IpcChannel.Mod.ResolveDependencies,
    z.object({
      modpackId: z.string(),
      modId: z.string(),
      dependencyIds: z.array(z.string()),
    }),
    async (_e, args) => {
      let installed = 0;
      for (const depId of args.dependencyIds) {
        try {
          const versions = await modrinth.getVersions(depId);
          if (versions.length === 0) continue;
          const latest = versions[0];
          if (!latest) continue;
          const primaryFile = latest.files?.find((f) => f.primary) ?? latest.files?.[0];
          if (!primaryFile?.url) continue;
          const targetPath = join(paths.modpackDirectory(args.modpackId), 'mods', primaryFile.filename);
          const downloadId = `mod-dep:${args.modpackId}:${primaryFile.filename}`;
          await queue.start(downloadId, [{ url: primaryFile.url, targetPath, filename: primaryFile.filename, skipIfPresent: false }], 1);
          installed++;
        } catch { /* skip failed deps */ }
      }
      return { success: true, installed };
    },
    { senderCheck: senderOk },
  );

  // Remove a mod from a modpack
  registerInvoke(
    IpcChannel.Mod.Remove,
    z.object({ modpackId: z.string(), modFileName: z.string() }),
    async (_e, args) => {
      const modPath = join(paths.modpackDirectory(args.modpackId), 'mods', args.modFileName);
      await rm(modPath, { force: true });
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  // Install/remove resourcepacks
  registerInvoke(
    IpcChannel.Mod.InstallResourcepack,
    z.object({ modpackId: z.string(), projectId: z.string().optional(), versionId: z.string().optional(), downloadUrl: z.string(), filename: z.string() }),
    async (_e, args) => {
      const fileName = args.filename.replace(/[\\/:*?"<>|]/g, '-');
      const modpackDir = paths.modpackDirectory(args.modpackId);
      await mkdir(modpackDir, { recursive: true });
      await mkdir(join(modpackDir, 'resourcepacks'), { recursive: true });
      const targetPath = join(modpackDir, 'resourcepacks', fileName);
      const downloadId = `rp:${args.modpackId}:${fileName}`;
      await queue.start(downloadId, [{ url: args.downloadUrl, targetPath, filename: fileName, skipIfPresent: false }], 1);
      return { success: true, fileName };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Mod.RemoveResourcepack,
    z.object({ modpackId: z.string(), resourcepackFileName: z.string() }),
    async (_e, args) => {
      const rpPath = join(paths.modpackDirectory(args.modpackId), 'resourcepacks', args.resourcepackFileName);
      await rm(rpPath, { force: true });
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  // Install/remove shaders
  registerInvoke(
    IpcChannel.Mod.InstallShader,
    z.object({ modpackId: z.string(), projectId: z.string().optional(), versionId: z.string().optional(), downloadUrl: z.string(), filename: z.string() }),
    async (_e, args) => {
      const fileName = args.filename.replace(/[\\/:*?"<>|]/g, '-');
      const modpackDir = paths.modpackDirectory(args.modpackId);
      await mkdir(modpackDir, { recursive: true });
      await mkdir(join(modpackDir, 'shaderpacks'), { recursive: true });
      const targetPath = join(modpackDir, 'shaderpacks', fileName);
      const downloadId = `shader:${args.modpackId}:${fileName}`;
      await queue.start(downloadId, [{ url: args.downloadUrl, targetPath, filename: fileName, skipIfPresent: false }], 1);
      return { success: true, fileName };
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Mod.RemoveShader,
    z.object({ modpackId: z.string(), shaderFileName: z.string() }),
    async (_e, args) => {
      const shaderPath = join(paths.modpackDirectory(args.modpackId), 'shaderpacks', args.shaderFileName);
      await rm(shaderPath, { force: true });
      return { success: true };
    },
    { senderCheck: senderOk },
  );

  // Extract mod icon from a JAR file
  registerInvoke(
    IpcChannel.Mod.ExtractIcon,
    z.object({ jarPath: z.string(), outputPath: z.string() }),
    async (_e, args) => {
      try {
        // Read the JAR as a zip and extract the first matching icon file
        const buf = await http.getBuffer(`file://${args.jarPath}`);
        // Use dynamic import to avoid bundling jszip in the main process if not needed
        const { default: AdmZip } = await import('adm-zip');
        const zip = new AdmZip(Buffer.from(buf));
        const iconEntry = zip.getEntries().find((e: { entryName: string }) =>
          e.entryName === 'pack.png' ||
          e.entryName === 'logo.png' ||
          (e.entryName.startsWith('assets/') && e.entryName.endsWith('/icon.png'))
        );
        if (iconEntry) {
          const { writeFile, mkdir } = await import('node:fs/promises');
          const { dirname } = await import('node:path');
          await mkdir(dirname(args.outputPath), { recursive: true });
          await writeFile(args.outputPath, iconEntry.getData());
          return { success: true };
        }
        return { success: false, error: 'No icon found in JAR' };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to extract icon' };
      }
    },
    { senderCheck: senderOk },
  );

  // Extract icons for all mods in a modpack
  registerInvoke(
    IpcChannel.Mod.ExtractAllIcons,
    z.object({ modpackId: z.string() }),
    async (_e, args) => {
      const modsDir = join(paths.modpackDirectory(args.modpackId), 'mods');
      const iconsDir = join(paths.modpackDirectory(args.modpackId), 'icons');
      try {
        const files = await readdir(modsDir);
        const jars = files.filter(f => f.endsWith('.jar'));
        const { mkdir, writeFile } = await import('node:fs/promises');
        await mkdir(iconsDir, { recursive: true });
        let extracted = 0;
        for (const jar of jars) {
          try {
            const buf = await http.getBuffer(`file://${join(modsDir, jar)}`);
            const { default: AdmZip } = await import('adm-zip');
            const zip = new AdmZip(Buffer.from(buf));
            const iconEntry = zip.getEntries().find((e: { entryName: string }) => e.entryName === 'pack.png' || e.entryName === 'logo.png');
            if (iconEntry) {
              const iconPath = join(iconsDir, jar.replace('.jar', '.png'));
              await writeFile(iconPath, iconEntry.getData());
              extracted++;
            }
          } catch { /* skip */ }
        }
        return { success: true, extracted };
      } catch {
        return { success: false, error: 'Failed to read mods directory' };
      }
    },
    { senderCheck: senderOk },
  );

  // Import external files (drag-and-drop .jar files)
  registerInvoke(
    IpcChannel.Mod.ImportExternalFiles,
    z.object({ modpackId: z.string(), targetType: z.enum(['mods', 'resourcepacks', 'shaderpacks']).default('mods'), sourcePaths: z.array(z.string()) }),
    async (_e, args) => {
      const { copyFile, mkdir } = await import('node:fs/promises');
      const { basename } = await import('node:path');
      const targetDir = join(paths.modpackDirectory(args.modpackId), args.targetType);
      await mkdir(targetDir, { recursive: true });
      let imported = 0;
      for (const filePath of args.sourcePaths) {
        try {
          const dest = join(targetDir, basename(filePath));
          await copyFile(filePath, dest);
          imported++;
        } catch { /* skip failed */ }
      }
      return { success: true, imported };
    },
    { senderCheck: senderOk },
  );

  // Download a CurseForge modpack by project ID
  registerInvoke(
    IpcChannel.Mod.DownloadCurseforgeModpack,
    z.object({ projectId: z.string(), fileId: z.string(), name: z.string() }),
    async (_e, args) => {
      const log = (msg: string) => console.log(`[Modpacks][CF-${args.projectId}] ${msg}`);
      try {
        log('starting download');
        const fileData = await curseforge.getModpackFiles(parseInt(args.projectId));
        const file = fileData.data?.find(f => f.id === parseInt(args.fileId));
        if (!file?.downloadUrl) return { success: false, error: 'File not found' };
        const targetPath = join(paths.modpacks, `curseforge-${args.projectId}`, `${args.name}.zip`);
        const downloadId = `cf-modpack:${args.projectId}`;
        await queue.start(downloadId, [{ url: file.downloadUrl, targetPath, filename: `${args.name}.zip`, skipIfPresent: false }], 1);
        log('download completed');

        const modpackDir = join(paths.modpacks, `cf-${args.projectId}`);
        await mkdir(modpackDir, { recursive: true });
        await mkdir(join(modpackDir, 'mods'), { recursive: true });
        await mkdir(join(modpackDir, 'resourcepacks'), { recursive: true });
        await mkdir(join(modpackDir, 'shaderpacks'), { recursive: true });

        // Extract manifest.json + all mod files from the downloaded zip.
        // Be permissive: modpack zips put files at root, in overrides/, or in
        // mods/resourcepacks/shaderpacks folders — grab anything that looks
        // like a mod/resourcepack/shader regardless of path.
        let manifest: any = null;
        let extractedMods = 0;
        let extractedRps = 0;
        let extractedShaders = 0;
        try {
          const zip = new AdmZip(targetPath);
          const manifestEntry = zip.getEntry('manifest.json');
          if (manifestEntry) {
            const manifestData = zip.readAsText(manifestEntry);
            manifest = JSON.parse(manifestData);
            log(`manifest parsed: name=${manifest.name} version=${manifest.version} mc=${manifest.minecraft?.version} loaders=${JSON.stringify(manifest.minecraft?.modLoaders)}`);
          }
          const entries = zip.getEntries();
          log(`zip has ${entries.length} entries`);
          for (const entry of entries) {
            if (entry.isDirectory) continue;
            const name = entry.entryName;
            const lower = name.toLowerCase();
            if (lower === 'manifest.json') continue;
            const content = zip.readFile(entry);
            if (!content) continue;
            const base = basename(name);
            if (lower.endsWith('.jar')) {
              await writeFile(join(modpackDir, 'mods', base), content);
              extractedMods++;
              log(`extracted mod: ${base}`);
            } else if (lower.endsWith('.zip')) {
              const targetDir = lower.includes('shader') || lower.includes('shaderpack')
                ? 'shaderpacks'
                : 'resourcepacks';
              await writeFile(join(modpackDir, targetDir, base), content);
              if (targetDir === 'shaderpacks') extractedShaders++;
              else extractedRps++;
              log(`extracted ${targetDir.slice(0,-1)}: ${base}`);
            }
          }
          log(`extraction done: mods=${extractedMods} rps=${extractedRps} shaders=${extractedShaders}`);
        } catch {
          log('extraction failed');
        }

        // Persist a profile so the instance can be launched (mcVersion + loader
        // come from the CurseForge manifest.json).
        const cfMcVersion = manifest?.minecraft?.version || '';
        const cfLoaderRaw = manifest?.minecraft?.modLoaders?.[0]?.id || '';
        const cfLoader = cfLoaderRaw.toLowerCase().includes('fabric') ? 'fabric'
          : cfLoaderRaw.toLowerCase().includes('forge') ? 'forge'
          : cfLoaderRaw.toLowerCase().includes('neoforge') ? 'neoforge'
          : cfLoaderRaw.toLowerCase().includes('quilt') ? 'quilt'
          : 'vanilla';
        await repo.writeProfile(`cf-${args.projectId}`, {
          id: `cf-${args.projectId}`,
          name: args.name,
          description: 'Imported from CurseForge',
          minecraftVersion: cfMcVersion,
          loader: cfLoader,
          loaderVersion: cfLoaderRaw.replace(/^[a-z]+-/, '') || undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          playtimeSeconds: 0,
          mods: [],
        });

        const modpackId = `cf-${args.projectId}`;
        return { success: true, manifest, modpackId, loaderVersion: cfLoaderRaw.replace(/^[a-z]+-/, '') || undefined, extractedMods, extractedRps, extractedShaders };
      } catch (err) {
        log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
        return { success: false, error: err instanceof Error ? err.message : 'Download failed' };
      }
    },
    { senderCheck: senderOk },
  );

  // Download a Modrinth modpack by project ID
  registerInvoke(
    IpcChannel.Mod.DownloadModrinthModpack,
    z.object({ projectId: z.string(), minecraftVersion: z.string(), loader: z.string(), name: z.string() }),
    async (_e, args) => {
      const log = (msg: string) => console.log(`[Modpacks][MR-${args.projectId}] ${msg}`);
      try {
        log('starting download');
        const versions = await modrinth.getVersions(args.projectId, args.minecraftVersion, args.loader);
        if (versions.length === 0) return { success: false, error: 'No compatible version found' };
        const latest = versions[0];
        if (!latest) return { success: false, error: 'No version available' };
        const primaryFile = latest.files?.find(f => f.primary) ?? latest.files?.[0];
        if (!primaryFile?.url) return { success: false, error: 'No download URL' };
        log(`file: ${primaryFile.filename} url=${primaryFile.url} size=${primaryFile.size}`);
        const targetPath = join(paths.modpacks, `modrinth-${args.projectId}`, primaryFile.filename);
        const downloadId = `mr-modpack:${args.projectId}`;
        await queue.start(downloadId, [{ url: primaryFile.url, targetPath, filename: primaryFile.filename, skipIfPresent: false }], 1);
        log('download completed');

        const modpackDir = join(paths.modpacks, `mr-${args.projectId}`);
        await mkdir(modpackDir, { recursive: true });
        await mkdir(join(modpackDir, 'mods'), { recursive: true });
        await mkdir(join(modpackDir, 'resourcepacks'), { recursive: true });
        await mkdir(join(modpackDir, 'shaderpacks'), { recursive: true });

        // Parse modrinth.index.json from the mrpack zip (not manifest.json!)
        // .mrpack = zip containing modrinth.index.json + bundled resourcepacks/shaderpacks
        // mods are NOT in the zip — they must be downloaded individually from downloads[0] URLs
        let index: any = null;
        let mcVersion = '';
        let loaders: string[] = [];
        let loaderVersion = '';
        let extractedMods = 0;
        let extractedRps = 0;
        let extractedShaders = 0;
        try {
          const zip = new AdmZip(targetPath);
          const indexEntry = zip.getEntry('modrinth.index.json');
          if (indexEntry) {
            const indexData = zip.readAsText(indexEntry);
            index = JSON.parse(indexData);
            // modrinth.index.json stores MC version under dependencies.minecraft
            // and loaders under dependencies["<loader>-loader"]
            const deps = index.dependencies ?? {};
            mcVersion = deps.minecraft || index.gameVersion || '';
            const loaderKeys = Object.keys(deps).filter((k) =>
              k.endsWith('-loader') || k === 'fabric' || k === 'forge' || k === 'neoforge' || k === 'quilt'
            );
            loaders = loaderKeys.map((k) => {
              if (k === 'fabric') return 'fabric';
              if (k === 'forge') return 'forge';
              if (k === 'neoforge') return 'neoforge';
              if (k === 'quilt') return 'quilt';
              return k.replace('-loader', '');
            }).filter(Boolean);
            // Extract the actual Fabric loader version from deps (e.g. deps["fabric-loader"] = "0.20.1")
            if (loaderKeys.length > 0) {
              const key = loaderKeys[0] as string;
              loaderVersion = String(deps[key] ?? '');
            }
            log(`index parsed: name=${index.name} versionId=${index.versionId} files=${index.files?.length || 0}`);
            log(`minecraft=${mcVersion} loaders=${JSON.stringify(loaders)} loaderVersion=${loaderVersion}`);
          } else {
            log('no modrinth.index.json in zip');
          }

          // Download each mod file from its downloads[0] URL (Modrinth CDN)
          const files = index?.files ?? [];
          const modDownloadQueue: DownloadItem[] = [];
          for (const f of files) {
            const downloads = Array.isArray(f.downloads) && f.downloads.length ? f.downloads : [];
            const url = downloads[0];
            if (!url) {
              log(`skip ${f.path} — no download URL`);
              continue;
            }
            const target = join(modpackDir, f.path);
            await mkdir(join(modpackDir, f.path.split('/').slice(0, -1).join('/')), { recursive: true });
            modDownloadQueue.push({ url, targetPath: target, filename: f.path, skipIfPresent: false });
            log(`queue mod download: ${f.path}`);
          }

          if (modDownloadQueue.length > 0) {
            // Don't await — let mods download in the background so the
            // frontend's onDownloadProgress listener can show per-file progress.
            void queue.start(`mr-files:${args.projectId}`, modDownloadQueue, 4).catch((err) => {
              log(`mod download queue error: ${err}`);
            });
            log(`queued ${modDownloadQueue.length} mod files for download`);
          }

          // Extract bundled resourcepacks/shaderpacks (.zip files) directly from the mrpack
          const entries = zip.getEntries();
          for (const entry of entries) {
            if (entry.isDirectory) continue;
            const name = entry.entryName;
            const lower = name.toLowerCase();
            if (lower === 'modrinth.index.json') continue;
            const content = zip.readFile(entry);
            if (!content) continue;
            if (lower.endsWith('.zip')) {
              const targetDir = lower.includes('shader') || lower.includes('shaderpack')
                ? 'shaderpacks'
                : 'resourcepacks';
              await writeFile(join(modpackDir, targetDir, basename(name)), content);
              if (targetDir === 'shaderpacks') extractedShaders++;
              else extractedRps++;
              log(`extracted ${targetDir.slice(0,-1)}: ${basename(name)}`);
            }
          }
          log(`extraction done: mods=queued(${modDownloadQueue.length}) rps=${extractedRps} shaders=${extractedShaders}`);
        } catch {
          log('extraction failed');
        }

        // Persist a profile so the instance can be launched (mcVersion + loader
        // come from modrinth.index.json).
        await repo.writeProfile(`mr-${args.projectId}`, {
          id: `mr-${args.projectId}`,
          name: args.name,
          description: 'Imported from Modrinth',
          minecraftVersion: mcVersion,
          loader: (loaders.length ? (loaders[0] ?? 'vanilla') : 'vanilla') as 'vanilla' | 'forge' | 'fabric' | 'quilt' | 'neoforge',
          loaderVersion: loaderVersion || undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          playtimeSeconds: 0,
          mods: [],
        });

        const modpackId = `mr-${args.projectId}`;
        return { success: true, manifest: index, modpackId, mcVersion, loaders, loaderVersion, extractedMods, extractedRps, extractedShaders };
      } catch (err) {
        log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
        return { success: false, error: err instanceof Error ? err.message : 'Download failed' };
      }
    },
    { senderCheck: senderOk },
  );
}

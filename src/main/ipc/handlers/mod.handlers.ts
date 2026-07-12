import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { z } from 'zod';
import { join } from 'node:path';
import { rm, readdir } from 'node:fs/promises';
import type { WindowManager } from '../../windows/window-manager';
import type { ModrinthClient, ModrinthProject, ModrinthVersion } from '@/infrastructure/net/api/modrinth-client';
import type { CurseforgeClient } from '@/infrastructure/net/api/curseforge-client';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import type { HttpClient } from '@/infrastructure/net/http-client';
import type { DownloadQueue } from '@/infrastructure/download/download-queue';
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
  _curseforge: CurseforgeClient,
  _repo: ModpackRepository,
  http: HttpClient,
  queue: DownloadQueue,
  paths: PathService,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

  // Search mods on Modrinth
  registerInvoke(
    IpcChannel.Mod.Search,
    z.object({
      query: z.string(),
      loader: z.string().nullable().optional(),
      projectType: z.enum(['mod', 'modpack', 'resourcepack', 'shader']).default('mod'),
      limit: z.number().default(20),
    }),
    async (_e, args) => {
      if (args.projectType === 'modpack') {
        return modrinth.searchModpacks(args.query, args.limit);
      }
      return modrinth.searchMods(args.query, args.loader ?? null, args.limit);
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
      projectId: z.string(),
      versionId: z.string(),
      downloadUrl: z.string(),
      fileName: z.string(),
      type: z.enum(['mod', 'resourcepack', 'shader']).default('mod'),
    }),
    async (_e, args) => {
      const subdir = args.type === 'mod' ? 'mods' : args.type === 'resourcepack' ? 'resourcepacks' : 'shaderpacks';
      const targetPath = join(paths.modpackDirectory(args.modpackId), subdir, args.fileName);
      const downloadId = `mod:${args.modpackId}:${args.fileName}`;
      await queue.start(downloadId, [{ url: args.downloadUrl, targetPath, filename: args.fileName, skipIfPresent: false }], 1);
      return { success: true, fileName: args.fileName };
    },
    { senderCheck: senderOk },
  );

  // Install a mod to a specific version (not a modpack)
  registerInvoke(
    IpcChannel.Mod.InstallToVersion,
    z.object({
      versionId: z.string(),
      projectId: z.string(),
      versionId_target: z.string(),
      downloadUrl: z.string(),
      fileName: z.string(),
    }),
    async (_e, args) => {
      const targetPath = join(paths.versions, args.versionId, 'mods', args.fileName);
      const downloadId = `mod-version:${args.versionId}:${args.fileName}`;
      await queue.start(downloadId, [{ url: args.downloadUrl, targetPath, filename: args.fileName, skipIfPresent: false }], 1);
      return { success: true, fileName: args.fileName };
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
      const targetPath = join(paths.modpackDirectory(args.modpackId), 'mods', args.fileName);
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
    z.object({ modpackId: z.string(), projectId: z.string(), versionId: z.string(), downloadUrl: z.string(), fileName: z.string() }),
    async (_e, args) => {
      const targetPath = join(paths.modpackDirectory(args.modpackId), 'resourcepacks', args.fileName);
      const downloadId = `rp:${args.modpackId}:${args.fileName}`;
      await queue.start(downloadId, [{ url: args.downloadUrl, targetPath, filename: args.fileName, skipIfPresent: false }], 1);
      return { success: true, fileName: args.fileName };
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
    z.object({ modpackId: z.string(), projectId: z.string(), versionId: z.string(), downloadUrl: z.string(), fileName: z.string() }),
    async (_e, args) => {
      const targetPath = join(paths.modpackDirectory(args.modpackId), 'shaderpacks', args.fileName);
      const downloadId = `shader:${args.modpackId}:${args.fileName}`;
      await queue.start(downloadId, [{ url: args.downloadUrl, targetPath, filename: args.fileName, skipIfPresent: false }], 1);
      return { success: true, fileName: args.fileName };
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
        const iconEntry = zip.getEntries().find(e =>
          e.entryName === 'pack.png' ||
          e.entryName === 'logo.png' ||
          e.entryName.startsWith('assets/') && e.entryName.endsWith('/icon.png')
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
            const iconEntry = zip.getEntries().find(e => e.entryName === 'pack.png' || e.entryName === 'logo.png');
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
    z.object({ modpackId: z.string(), filePaths: z.array(z.string()) }),
    async (_e, args) => {
      const { copyFile, mkdir } = await import('node:fs/promises');
      const { basename } = await import('node:path');
      const modsDir = join(paths.modpackDirectory(args.modpackId), 'mods');
      await mkdir(modsDir, { recursive: true });
      let imported = 0;
      for (const filePath of args.filePaths) {
        try {
          const dest = join(modsDir, basename(filePath));
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
      // Fetch the file URL from CurseForge, then download via the queue
      try {
        const fileData = await _curseforge.getModpackFiles(parseInt(args.projectId));
        const file = fileData.data?.find(f => f.id === parseInt(args.fileId));
        if (!file?.downloadUrl) return { success: false, error: 'File not found' };
        const targetPath = join(paths.modpacks, `curseforge-${args.projectId}`, `${args.name}.zip`);
        const downloadId = `cf-modpack:${args.projectId}`;
        await queue.start(downloadId, [{ url: file.downloadUrl, targetPath, filename: `${args.name}.zip`, skipIfPresent: false }], 1);
        return { success: true };
      } catch (err) {
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
      try {
        const versions = await modrinth.getVersions(args.projectId, args.minecraftVersion, args.loader);
        if (versions.length === 0) return { success: false, error: 'No compatible version found' };
        const latest = versions[0];
        if (!latest) return { success: false, error: 'No version available' };
        const primaryFile = latest.files?.find(f => f.primary) ?? latest.files?.[0];
        if (!primaryFile?.url) return { success: false, error: 'No download URL' };
        const targetPath = join(paths.modpacks, `modrinth-${args.projectId}`, primaryFile.filename);
        const downloadId = `mr-modpack:${args.projectId}`;
        await queue.start(downloadId, [{ url: primaryFile.url, targetPath, filename: primaryFile.filename, skipIfPresent: false }], 1);
        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Download failed' };
      }
    },
    { senderCheck: senderOk },
  );
}

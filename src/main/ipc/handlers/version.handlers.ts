import { registerInvoke } from '../register';
import { IpcChannel } from '@shared/ipc-channels';
import { VersionSchema } from '@shared/schemas/version.schema';
import { z } from 'zod';
import type { WindowManager } from '../../windows/window-manager';
import type { MojangClient } from '@/infrastructure/net/api/mojang-client';
import type { ModrinthClient } from '@/infrastructure/net/api/modrinth-client';
import type { DownloadQueue } from '@/infrastructure/download/download-queue';
import type { PathService } from '@/infrastructure/fs/path-service';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import type { HttpClient } from '@/infrastructure/net/http-client';

export function registerVersionHandlers(
  windows: WindowManager,
  mojang: MojangClient,
  queue: DownloadQueue,
  paths: PathService,
  modrinth?: ModrinthClient,
  repo?: ModpackRepository,
  http?: HttpClient,
): void {
  const senderOk = (event: Electron.IpcMainInvokeEvent) => windows.assertSender(event, 'main');

   registerInvoke(
    IpcChannel.Version.ScanDownloaded,
    z.void(),
    async () => {
      const { readdir, readFile } = await import('node:fs/promises');
      const { join } = await import('node:path');
      try {
        const entries = await readdir(paths.versions, { withFileTypes: true });
        const versions = entries.filter((e) => e.isDirectory()).map((e) => e.name);

        // Build versionDetails with loader information by inspecting version directories
        const versionDetails: Record<string, { loader: string }> = {};

        for (const version of versions) {
          let loader = 'Vanilla';

          try {
            const versionDir = join(paths.versions, version);

            try {
              const versionJsonPath = join(versionDir, `${version}.json`);
              const versionJson = await readFile(versionJsonPath, 'utf8');
              const versionData = JSON.parse(versionJson);

              if (versionData.id?.includes('fabric') ||
                  versionData.mainClass?.includes('net.fabricmc') ||
                  versionData.mainClass?.includes('fabric')) {
                loader = 'Fabric';
              }
              else if (versionData.id?.includes('neoforge') ||
                       versionData.mainClass?.includes('net.neoforged') ||
                       versionData.mainClass?.includes('neoforge')) {
                loader = 'NeoForge';
              }
              else if (versionData.id?.includes('forge') ||
                       versionData.mainClass?.includes('net.minecraftforge') ||
                       versionData.mainClass?.includes('forge')) {
                loader = 'Forge';
              }
              else if (versionData.id?.includes('quilt') ||
                       versionData.mainClass?.includes('org.quiltmc') ||
                       versionData.mainClass?.includes('quilt')) {
                loader = 'Quilt';
              }

              // Loader profiles (fabric-loader-X-Y) inherit from a base version.
              // Map the base version to this loader so the UI can show "1.20.1 → Fabric"
              // when the base vanilla version is present.
              if (loader !== 'Vanilla' && versionData.inheritsFrom) {
                const base = versionData.inheritsFrom;
                if (!versionDetails[base] || versionDetails[base].loader === 'Vanilla') {
                  versionDetails[base] = { loader };
                }
              }
            } catch {
              // JSON read failed — try file-based fallback
            }

            if (loader === 'Vanilla') {
              try {
                const files = await readdir(versionDir);
                if (files.some(f => f.includes('fabric'))) loader = 'Fabric';
                else if (files.some(f => f.includes('forge'))) loader = 'Forge';
                else if (files.some(f => f.includes('neoforge'))) loader = 'NeoForge';
                else if (files.some(f => f.includes('quilt'))) loader = 'Quilt';
              } catch {
                // Directory read failed
              }
            }
          } catch {
            // Version directory unreadable
          }

          versionDetails[version] = { loader };
        }

        return { success: true, versions, versionDetails };
      } catch {
        return { success: false, versions: [], versionDetails: {} };
      }
    },
    { senderCheck: senderOk },
  );

  // Fetch the full Mojang version manifest (replaces renderer-side fetch)
  registerInvoke(
    IpcChannel.Version.GetManifest,
    z.void(),
    async () => {
      return mojang.getManifest();
    },
    { senderCheck: senderOk },
  );

  // Fetch the list of Minecraft versions that support Sodium
  registerInvoke(
    IpcChannel.Version.GetSodiumVersions,
    z.void(),
    async () => {
      if (!modrinth) return [];
      try {
        const versions = await modrinth.getVersions('sodium');
        const gameVersions = new Set<string>();
        for (const v of versions) {
          for (const gv of v.game_versions) gameVersions.add(gv);
        }
        return Array.from(gameVersions).sort();
      } catch {
        return [];
      }
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Version.Download,
    VersionSchema.downloadRequest,
    async (_event, args) => {
      const manifest = await mojang.getManifest();
      const version = manifest.versions.find((v) => v.id === args.versionId);
      if (!version) throw new Error(`Version ${args.versionId} not found`);
      const targetPath = paths.resolveSafeTarget('versions', `${args.versionId}/${args.versionId}.json`);
      const downloadId = `version:${args.versionId}`;
      await queue.start(downloadId, [{ url: version.url, targetPath, filename: `${args.versionId}.json`, skipIfPresent: true }], 1);

      // When Fabric is selected, also install the Fabric loader profile so the
      // version is actually launchable as Fabric (not just labeled as such).
      if (args.loader === 'fabric' && http) {
        try {
          await installFabricProfile(paths, args.versionId, args.loaderVersion, http);
        } catch (err) {
          console.warn(`[Versions] Fabric profile install failed for ${args.versionId}:`, err);
        }
      }

      // SK-Launcher-style one-click model: downloading a version auto-creates
      // an instance (profile folder) so it appears in the Instances tab.
      if (repo) {
        try {
          const loader = args.loader ?? 'vanilla';
          const existing = await repo.list();
          const already = existing.find(
            (p) => p.minecraftVersion === args.versionId && p.loader === loader,
          );
          if (!already) {
            const folder = await repo.uniqueFolderForName(
              loader === 'vanilla' ? args.versionId : `${args.versionId} ${loader}`,
            );
            await repo.writeProfile(folder, {
              id: folder,
              name: loader === 'vanilla' ? args.versionId : `${args.versionId} ${loader}`,
              description: '',
              minecraftVersion: args.versionId,
              loader,
              loaderVersion: args.loaderVersion || undefined,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              playtimeSeconds: 0,
              mods: [],
            });
            console.log(`[Instances] Auto-created instance "${folder}" for version ${args.versionId}`);
          }
        } catch (err) {
          console.warn('[Instances] Auto-create failed for version download:', err);
        }
      }

      return downloadId;
    },
    { senderCheck: senderOk },
  );

  registerInvoke(
    IpcChannel.Version.CancelDownload,
    VersionSchema.cancelDownloadRequest,
    async (_event, args) => {
      if (args.versionId) queue.cancel(`version:${args.versionId}`);
      else queue.cancelAll();
      return true;
    },
    { senderCheck: senderOk },
  );

   // Scan a version's mods folder and return installed mod info.
   // Mods live in the profiles directory (instances), not in the shared versions dir.
   registerInvoke(
     IpcChannel.Version.ScanVersionMods,
     z.object({ versionId: z.string() }),
     async (_event, args) => {
       const { readdir } = await import('node:fs/promises');
       const { join } = await import('node:path');
       try {
         const modsDir = join(paths.modpacks, args.versionId, 'mods');
         const entries = await readdir(modsDir, { withFileTypes: true });
         return entries
           .filter((e) => e.isFile() && (e.name.endsWith('.jar') || e.name.endsWith('.disabled')))
           .map((e) => ({ fileName: e.name, path: join(modsDir, e.name) }));
       } catch {
         return [];
       }
     },
     { senderCheck: senderOk },
   );
}

async function installFabricProfile(
  paths: PathService,
  mcVersion: string,
  requestedLoaderVersion: string | undefined,
  http: HttpClient,
): Promise<void> {
  const { writeFile, mkdir } = await import('node:fs/promises');
  const { existsSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');

  let loaderVersion = requestedLoaderVersion;
  const versionsRoot = paths.versions;

  if (!loaderVersion) {
    if (existsSync(versionsRoot)) {
      const prefix = 'fabric-loader-';
      const suffix = `-${mcVersion}`;
      const cached = readdirSync(versionsRoot, { withFileTypes: true }).find(
        (e) => e.isDirectory() && e.name.startsWith(prefix) && e.name.endsWith(suffix),
      );
      if (cached) {
        loaderVersion = cached.name.slice(prefix.length, cached.name.length - suffix.length);
      }
    }
  }

  if (!loaderVersion) {
    const meta = await http.getJson<{ loader: { version: string; stable?: boolean } }[]>(
      `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`,
    );
    if (!Array.isArray(meta) || meta.length === 0) {
      throw new Error(`No Fabric loader available for Minecraft ${mcVersion}`);
    }
    const stable = meta.find((l) => l.loader?.stable !== false);
    loaderVersion = (stable ?? meta[0])?.loader?.version;
    if (!loaderVersion) throw new Error(`No Fabric loader available for Minecraft ${mcVersion}`);
  }

  const profileId = `fabric-loader-${loaderVersion}-${mcVersion}`;
  const dir = join(versionsRoot, profileId);
  const jsonPath = join(dir, `${profileId}.json`);

  if (existsSync(jsonPath)) return;

  const profile = await http.getJson<Record<string, unknown>>(
    `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVersion}/profile/json`,
  );
  profile.id = profileId;
  await mkdir(dir, { recursive: true });
  await writeFile(jsonPath, JSON.stringify(profile, null, 4), 'utf8');
}

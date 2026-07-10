import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ImportModpack } from '@/application/use-cases/import-modpack';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import { writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import os from 'node:os';
import JSZip from 'jszip';

function mockRepo(dir: string): ModpackRepository & { paths: { modpackDirectory: (id: string) => string } } {
  return {
    writeProfile: vi.fn().mockResolvedValue(undefined),
    paths: { modpackDirectory: () => dir },
  } as unknown as ModpackRepository & { paths: { modpackDirectory: (id: string) => string } };
}

describe('ImportModpack', () => {
  let tmpDir: string;
  let zipPath: string;

  beforeEach(async () => {
    tmpDir = join(os.tmpdir(), `idk-import-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tmpDir, { recursive: true });

    // Create a test zip with profile.json + a mod.
    const zip = new JSZip();
    zip.file('profile.json', JSON.stringify({
      id: 'imported',
      name: 'Imported Pack',
      minecraftVersion: '1.19.2',
      loader: 'forge',
    }));
    zip.folder('mods')!.file('test-mod.jar', 'fake-mod-content');
    zipPath = join(tmpDir, 'input.zip');
    await writeFile(zipPath, await zip.generateAsync({ type: 'nodebuffer' }));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('extracts the zip, writes a profile, and copies mods', async () => {
    const targetDir = join(tmpDir, 'extracted');
    const repo = mockRepo(targetDir);
    const useCase = new ImportModpack(repo);

    const id = await useCase.execute(zipPath, 'My Imported Pack');

    expect(id).toBeTruthy();
    expect(repo.writeProfile).toHaveBeenCalled();
    // The mod should be on disk.
    const { readFile } = await import('node:fs/promises');
    const modContent = await readFile(join(targetDir, 'mods', 'test-mod.jar'), 'utf8');
    expect(modContent).toBe('fake-mod-content');
  });

  it('defaults to vanilla loader when profile.json has no loader', async () => {
    const zip = new JSZip();
    zip.file('profile.json', JSON.stringify({ id: 'x', name: 'X', minecraftVersion: '1.20' }));
    const noLoaderZip = join(tmpDir, 'no-loader.zip');
    await writeFile(noLoaderZip, await zip.generateAsync({ type: 'nodebuffer' }));

    const targetDir = join(tmpDir, 'extracted2');
    const repo = mockRepo(targetDir);
    const useCase = new ImportModpack(repo);

    await useCase.execute(noLoaderZip, 'Pack');

    const profile = vi.mocked(repo.writeProfile).mock.calls[0]![1];
    expect(profile.loader).toBe('vanilla');
  });
});

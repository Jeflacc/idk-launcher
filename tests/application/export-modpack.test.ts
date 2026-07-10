import { describe, it, expect, vi } from 'vitest';
import { ExportModpack } from '@/application/use-cases/export-modpack';
import type { ModpackRepository } from '@/infrastructure/fs/modpack-repository';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import os from 'node:os';

function mockRepo(dir: string): ModpackRepository & { paths: { modpackDirectory: (id: string) => string } } {
  return {
    readProfile: vi.fn().mockResolvedValue({
      id: 'mp-1',
      name: 'Test',
      description: '',
      minecraftVersion: '1.20.1',
      loader: 'fabric',
      createdAt: 1,
      updatedAt: 1,
      playtimeSeconds: 0,
      mods: [],
    }),
    paths: { modpackDirectory: () => dir },
  } as unknown as ModpackRepository & { paths: { modpackDirectory: (id: string) => string } };
}

describe('ExportModpack', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(os.tmpdir(), `idk-export-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(join(tmpDir, 'mods'), { recursive: true });
    await writeFile(join(tmpDir, 'mods', 'mod-a.jar'), 'fake-jar-a');
    await writeFile(join(tmpDir, 'mods', 'mod-b.jar'), 'fake-jar-b');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes a zip containing profile.json + mods', async () => {
    const repo = mockRepo(tmpDir);
    const useCase = new ExportModpack(repo);
    const targetZip = join(tmpDir, 'export.zip');

    await useCase.execute('mp-1', targetZip);

    const buf = await readFile(targetZip);
    expect(buf.length).toBeGreaterThan(0);
    // The zip should contain recognizable content.
    expect(buf.toString('binary')).toContain('profile.json');
    expect(buf.toString('binary')).toContain('mod-a.jar');
  });
});

import { beforeEach, afterEach } from 'vitest';

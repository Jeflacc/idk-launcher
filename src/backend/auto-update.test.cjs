const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');

// ---------------------------------------------------------------------------
// Extract pure functions directly from electron-main.cjs source to test
// in isolation (no Electron runtime required).
// ---------------------------------------------------------------------------

function isNewerVersion(current, latest) {
  const parseParts = (v) => v.replace(/[^0-9.]/g, '').split('.').map(Number);
  const cParts = parseParts(current);
  const lParts = parseParts(latest);
  for (let i = 0; i < Math.max(cParts.length, lParts.length); i++) {
    const cNum = cParts[i] || 0;
    const lNum = lParts[i] || 0;
    if (lNum > cNum) return true;
    if (lNum < cNum) return false;
  }
  return false;
}

async function resolveInheritsFrom(customVersionId, mcVersion, rootPath) {
  const jsonPath = path.join(rootPath, 'versions', customVersionId, `${customVersionId}.json`);
  try {
    if (!fs.existsSync(jsonPath)) return false;
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const profile = JSON.parse(raw);
    if (!profile.inheritsFrom) return true;
    const parentJsonPath = path.join(rootPath, 'versions', profile.inheritsFrom, `${profile.inheritsFrom}.json`);
    if (!fs.existsSync(parentJsonPath)) {
      return false;
    }
    const parent = JSON.parse(fs.readFileSync(parentJsonPath, 'utf8'));
    const existingNames = new Set((profile.libraries || []).map(l => l.name));
    const mergedLibraries = [...(profile.libraries || [])];
    for (const lib of (parent.libraries || [])) {
      if (lib.name && !existingNames.has(lib.name)) {
        mergedLibraries.push(lib);
      }
    }
    profile.libraries = mergedLibraries;
    if (!profile.downloads && parent.downloads) profile.downloads = parent.downloads;
    if (!profile.assetIndex && parent.assetIndex) profile.assetIndex = parent.assetIndex;
    delete profile.inheritsFrom;
    fs.writeFileSync(jsonPath, JSON.stringify(profile, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Mock autoUpdater factory — mimics electron-updater's autoUpdater shape
// ---------------------------------------------------------------------------
function createMockAutoUpdater() {
  const emitter = new EventEmitter();
  const mock = Object.assign(emitter, {
    autoDownload: true,
    autoInstallOnAppQuit: false,
    _updateInfo: null,
    _shouldThrow: null,

    checkForUpdates: async function () {
      if (this._shouldThrow) throw new Error(this._shouldThrow);
      if (!this._updateInfo) return null;
      const info = this._updateInfo;
      const hasUpdate = info._hasUpdate !== false;
      if (hasUpdate) {
        this.emit('update-available', info);
        return { updateInfo: info, downloadPromise: Promise.resolve() };
      } else {
        this.emit('update-not-available');
        return { updateInfo: info, downloadPromise: null };
      }
    },

    downloadUpdate: async function () {
      if (this._shouldThrow) throw new Error(this._shouldThrow);
      this.emit('download-progress', { percent: 50, bytesPerSecond: 1024 * 1024, transferred: 512 * 1024, total: 1024 * 1024 });
      this.emit('download-progress', { percent: 100, bytesPerSecond: 1024 * 1024, transferred: 1024 * 1024, total: 1024 * 1024 });
      this.emit('update-downloaded', { version: this._updateInfo?.version || '1.0.0' });
    },

    quitAndInstall: function () {
      mock._quitCalled = true;
    },

    _quitCalled: false,
  });
  return mock;
}

// ===========================================================================
// TESTS
// ===========================================================================

describe('isNewerVersion', () => {
  it('returns true when latest is newer (major)', () => {
    assert.strictEqual(isNewerVersion('1.4.0', '2.0.0'), true);
  });

  it('returns true when latest is newer (minor)', () => {
    assert.strictEqual(isNewerVersion('1.4.0', '1.5.0'), true);
  });

  it('returns true when latest is newer (patch)', () => {
    assert.strictEqual(isNewerVersion('1.5.0', '1.5.1'), true);
  });

  it('returns false when versions are equal', () => {
    assert.strictEqual(isNewerVersion('1.5.0', '1.5.0'), false);
  });

  it('returns false when current is newer', () => {
    assert.strictEqual(isNewerVersion('2.0.0', '1.9.0'), false);
  });

  it('handles pre-release tags (e.g. 1.5.0-beta) — strips non-numeric chars', () => {
    assert.strictEqual(isNewerVersion('1.5.0-beta', '1.5.0'), false);
    assert.strictEqual(isNewerVersion('1.4.0-beta', '1.5.0'), true);
  });

  it('handles semver-like strings with extra parts', () => {
    assert.strictEqual(isNewerVersion('1.5.0.1', '1.5.0.2'), true);
  });

  it('handles single-digit versions', () => {
    assert.strictEqual(isNewerVersion('1', '2'), true);
  });

  it('returns false when latest has fewer parts but same prefix', () => {
    assert.strictEqual(isNewerVersion('1.5.1', '1.5'), false);
  });

  it('handles v-prefix', () => {
    assert.strictEqual(isNewerVersion('v1.4.0', 'v1.5.0'), true);
  });

  it('returns false when latest is just whitespace/garbage stripped to same', () => {
    assert.strictEqual(isNewerVersion('1.5.0', '1.5.0'), false);
  });
});

describe('resolveInheritsFrom', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idk-resolve-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns false when custom version JSON does not exist', async () => {
    const result = await resolveInheritsFrom('nonexistent', '1.20.1', tmpDir);
    assert.strictEqual(result, false);
  });

  it('returns true when profile has no inheritsFrom', async () => {
    const verDir = path.join(tmpDir, 'versions', 'my-custom');
    fs.mkdirSync(verDir, { recursive: true });
    const profile = { id: 'my-custom', arguments: {} };
    fs.writeFileSync(path.join(verDir, 'my-custom.json'), JSON.stringify(profile));

    const result = await resolveInheritsFrom('my-custom', '1.20.1', tmpDir);
    assert.strictEqual(result, true);
  });

  it('returns false when parent JSON does not exist', async () => {
    const verDir = path.join(tmpDir, 'versions', 'my-custom');
    fs.mkdirSync(verDir, { recursive: true });
    const profile = { id: 'my-custom', inheritsFrom: '1.20.1' };
    fs.writeFileSync(path.join(verDir, 'my-custom.json'), JSON.stringify(profile));

    const result = await resolveInheritsFrom('my-custom', '1.20.1', tmpDir);
    assert.strictEqual(result, false);
  });

  it('merges parent libraries into custom profile', async () => {
    const customDir = path.join(tmpDir, 'versions', 'my-custom');
    const parentDir = path.join(tmpDir, 'versions', '1.20.1');
    fs.mkdirSync(customDir, { recursive: true });
    fs.mkdirSync(parentDir, { recursive: true });

    const customProfile = {
      id: 'my-custom',
      inheritsFrom: '1.20.1',
      libraries: [{ name: 'custom:lib:1.0' }],
    };
    const parentProfile = {
      id: '1.20.1',
      libraries: [
        { name: 'parent:lib-a:1.0' },
        { name: 'parent:lib-b:2.0' },
      ],
    };

    fs.writeFileSync(path.join(customDir, 'my-custom.json'), JSON.stringify(customProfile));
    fs.writeFileSync(path.join(parentDir, '1.20.1.json'), JSON.stringify(parentProfile));

    const result = await resolveInheritsFrom('my-custom', '1.20.1', tmpDir);
    assert.strictEqual(result, true);

    const written = JSON.parse(fs.readFileSync(path.join(customDir, 'my-custom.json'), 'utf8'));
    assert.strictEqual(written.libraries.length, 3);
    assert.strictEqual(written.libraries[0].name, 'custom:lib:1.0');
    assert.strictEqual(written.libraries[1].name, 'parent:lib-a:1.0');
    assert.strictEqual(written.libraries[2].name, 'parent:lib-b:2.0');
  });

  it('deduplicates libraries by name', async () => {
    const customDir = path.join(tmpDir, 'versions', 'my-custom');
    const parentDir = path.join(tmpDir, 'versions', '1.20.1');
    fs.mkdirSync(customDir, { recursive: true });
    fs.mkdirSync(parentDir, { recursive: true });

    const customProfile = {
      id: 'my-custom',
      inheritsFrom: '1.20.1',
      libraries: [{ name: 'shared:lib:1.0' }, { name: 'custom:lib:1.0' }],
    };
    const parentProfile = {
      id: '1.20.1',
      libraries: [
        { name: 'shared:lib:1.0' },
        { name: 'parent:lib:1.0' },
      ],
    };

    fs.writeFileSync(path.join(customDir, 'my-custom.json'), JSON.stringify(customProfile));
    fs.writeFileSync(path.join(parentDir, '1.20.1.json'), JSON.stringify(parentProfile));

    await resolveInheritsFrom('my-custom', '1.20.1', tmpDir);

    const written = JSON.parse(fs.readFileSync(path.join(customDir, 'my-custom.json'), 'utf8'));
    assert.strictEqual(written.libraries.length, 3);
  });

  it('copies downloads from parent when custom has none', async () => {
    const customDir = path.join(tmpDir, 'versions', 'my-custom');
    const parentDir = path.join(tmpDir, 'versions', '1.20.1');
    fs.mkdirSync(customDir, { recursive: true });
    fs.mkdirSync(parentDir, { recursive: true });

    const customProfile = { id: 'my-custom', inheritsFrom: '1.20.1' };
    const parentProfile = { id: '1.20.1', downloads: { client: { url: 'http://example.com/client.jar' } } };

    fs.writeFileSync(path.join(customDir, 'my-custom.json'), JSON.stringify(customProfile));
    fs.writeFileSync(path.join(parentDir, '1.20.1.json'), JSON.stringify(parentProfile));

    await resolveInheritsFrom('my-custom', '1.20.1', tmpDir);

    const written = JSON.parse(fs.readFileSync(path.join(customDir, 'my-custom.json'), 'utf8'));
    assert.deepStrictEqual(written.downloads, parentProfile.downloads);
  });

  it('copies assetIndex from parent when custom has none', async () => {
    const customDir = path.join(tmpDir, 'versions', 'my-custom');
    const parentDir = path.join(tmpDir, 'versions', '1.20.1');
    fs.mkdirSync(customDir, { recursive: true });
    fs.mkdirSync(parentDir, { recursive: true });

    const customProfile = { id: 'my-custom', inheritsFrom: '1.20.1' };
    const parentProfile = { id: '1.20.1', assetIndex: { id: '1.20', url: 'http://example.com/assets.json' } };

    fs.writeFileSync(path.join(customDir, 'my-custom.json'), JSON.stringify(customProfile));
    fs.writeFileSync(path.join(parentDir, '1.20.1.json'), JSON.stringify(parentProfile));

    await resolveInheritsFrom('my-custom', '1.20.1', tmpDir);

    const written = JSON.parse(fs.readFileSync(path.join(customDir, 'my-custom.json'), 'utf8'));
    assert.deepStrictEqual(written.assetIndex, parentProfile.assetIndex);
  });

  it('does not overwrite custom downloads with parent', async () => {
    const customDir = path.join(tmpDir, 'versions', 'my-custom');
    const parentDir = path.join(tmpDir, 'versions', '1.20.1');
    fs.mkdirSync(customDir, { recursive: true });
    fs.mkdirSync(parentDir, { recursive: true });

    const customProfile = { id: 'my-custom', inheritsFrom: '1.20.1', downloads: { client: { url: 'custom.jar' } } };
    const parentProfile = { id: '1.20.1', downloads: { client: { url: 'parent.jar' } } };

    fs.writeFileSync(path.join(customDir, 'my-custom.json'), JSON.stringify(customProfile));
    fs.writeFileSync(path.join(parentDir, '1.20.1.json'), JSON.stringify(parentProfile));

    await resolveInheritsFrom('my-custom', '1.20.1', tmpDir);

    const written = JSON.parse(fs.readFileSync(path.join(customDir, 'my-custom.json'), 'utf8'));
    assert.strictEqual(written.downloads.client.url, 'custom.jar');
  });

  it('removes inheritsFrom from written JSON', async () => {
    const customDir = path.join(tmpDir, 'versions', 'my-custom');
    const parentDir = path.join(tmpDir, 'versions', '1.20.1');
    fs.mkdirSync(customDir, { recursive: true });
    fs.mkdirSync(parentDir, { recursive: true });

    const customProfile = { id: 'my-custom', inheritsFrom: '1.20.1' };
    const parentProfile = { id: '1.20.1' };

    fs.writeFileSync(path.join(customDir, 'my-custom.json'), JSON.stringify(customProfile));
    fs.writeFileSync(path.join(parentDir, '1.20.1.json'), JSON.stringify(parentProfile));

    await resolveInheritsFrom('my-custom', '1.20.1', tmpDir);

    const written = JSON.parse(fs.readFileSync(path.join(customDir, 'my-custom.json'), 'utf8'));
    assert.strictEqual(written.inheritsFrom, undefined);
  });

  it('returns false on malformed JSON', async () => {
    const verDir = path.join(tmpDir, 'versions', 'bad');
    fs.mkdirSync(verDir, { recursive: true });
    fs.writeFileSync(path.join(verDir, 'bad.json'), '{ broken json!!!');

    const result = await resolveInheritsFrom('bad', '1.20.1', tmpDir);
    assert.strictEqual(result, false);
  });
});

describe('Auto-updater mock flow', () => {
  it('checkForUpdates returns null when no release exists', async () => {
    const updater = createMockAutoUpdater();
    updater._updateInfo = null;

    const result = await updater.checkForUpdates();
    assert.strictEqual(result, null);
  });

  it('checkForUpdates returns update when version is newer', async () => {
    const updater = createMockAutoUpdater();
    updater._updateInfo = { version: '2.0.0', _hasUpdate: true, releaseNotes: 'Fixed stuff' };

    const events = [];
    updater.on('update-available', (info) => events.push({ type: 'available', version: info.version }));

    const result = await updater.checkForUpdates();
    assert.strictEqual(result.updateInfo.version, '2.0.0');
    assert.ok(result.downloadPromise !== null);
    assert.deepStrictEqual(events, [{ type: 'available', version: '2.0.0' }]);
  });

  it('checkForUpdates returns update-not-available when version is same', async () => {
    const updater = createMockAutoUpdater();
    updater._updateInfo = { version: '1.5.0', _hasUpdate: false };

    const events = [];
    updater.on('update-not-available', () => events.push('not-available'));

    const result = await updater.checkForUpdates();
    assert.strictEqual(result.updateInfo.version, '1.5.0');
    assert.strictEqual(result.downloadPromise, null);
    assert.deepStrictEqual(events, ['not-available']);
  });

  it('checkForUpdates throws on network error', async () => {
    const updater = createMockAutoUpdater();
    updater._shouldThrow = 'ENOTFOUND';

    await assert.rejects(() => updater.checkForUpdates(), { message: 'ENOTFOUND' });
  });

  it('downloadUpdate emits progress and downloaded events', async () => {
    const updater = createMockAutoUpdater();
    updater._updateInfo = { version: '2.0.0' };

    const progressEvents = [];
    const downloadedEvents = [];
    updater.on('download-progress', (p) => progressEvents.push(p.percent));
    updater.on('update-downloaded', (info) => downloadedEvents.push(info.version));

    await updater.downloadUpdate();

    assert.deepStrictEqual(progressEvents, [50, 100]);
    assert.deepStrictEqual(downloadedEvents, ['2.0.0']);
  });

  it('quitAndInstall sets flag', () => {
    const updater = createMockAutoUpdater();
    assert.strictEqual(updater._quitCalled, false);
    updater.quitAndInstall();
    assert.strictEqual(updater._quitCalled, true);
  });
});

describe('update:check handler logic (simulated)', () => {
  function simulateUpdateCheck(updater, result) {
    if (result && result.downloadPromise) {
      const info = result.updateInfo;
      return {
        updateAvailable: true,
        currentVersion: '1.5.0',
        latestVersion: info.version,
        releaseNotes: info.releaseNotes || ''
      };
    }
    return { updateAvailable: false, currentVersion: '1.5.0' };
  }

  it('reports updateAvailable true when downloadPromise exists', () => {
    const result = { updateInfo: { version: '2.0.0' }, downloadPromise: Promise.resolve() };
    const response = simulateUpdateCheck(null, result);
    assert.strictEqual(response.updateAvailable, true);
    assert.strictEqual(response.latestVersion, '2.0.0');
  });

  it('reports updateAvailable false when downloadPromise is null (same version)', () => {
    const result = { updateInfo: { version: '1.5.0' }, downloadPromise: null };
    const response = simulateUpdateCheck(null, result);
    assert.strictEqual(response.updateAvailable, false);
  });

  it('reports updateAvailable false when result is null', () => {
    const response = simulateUpdateCheck(null, null);
    assert.strictEqual(response.updateAvailable, false);
  });

  it('includes releaseNotes when available', () => {
    const result = { updateInfo: { version: '2.0.0', releaseNotes: 'Bug fixes' }, downloadPromise: Promise.resolve() };
    const response = simulateUpdateCheck(null, result);
    assert.strictEqual(response.releaseNotes, 'Bug fixes');
  });

  it('defaults releaseNotes to empty string', () => {
    const result = { updateInfo: { version: '2.0.0' }, downloadPromise: Promise.resolve() };
    const response = simulateUpdateCheck(null, result);
    assert.strictEqual(response.releaseNotes, '');
  });
});

describe('update:download handler logic (simulated)', () => {
  it('returns alreadyDownloaded when already downloaded', () => {
    let updateDownloaded = true;
    const result = updateDownloaded ? { alreadyDownloaded: true } : { error: 'No update available to download' };
    assert.deepStrictEqual(result, { alreadyDownloaded: true });
  });

  it('returns error when no update info', () => {
    let updateDownloaded = false;
    let updateVersionInfo = null;
    const result = updateDownloaded
      ? { alreadyDownloaded: true }
      : !updateVersionInfo
        ? { error: 'No update available to download' }
        : { success: true };
    assert.deepStrictEqual(result, { error: 'No update available to download' });
  });
});

describe('IPC event forwarding', () => {
  it('forwards update-available event with correct shape', () => {
    const sent = [];
    const fakeWebContents = { send: (channel, data) => sent.push({ channel, data }), isDestroyed: () => false };
    const fakeWindow = { webContents: fakeWebContents, isDestroyed: () => false };

    const info = { version: '2.0.0', releaseNotes: 'Notes here' };
    if (fakeWindow && !fakeWindow.isDestroyed()) {
      fakeWindow.webContents.send('update-available', {
        currentVersion: '1.5.0',
        latestVersion: info.version,
        releaseNotes: info.releaseNotes || ''
      });
    }

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].channel, 'update-available');
    assert.strictEqual(sent[0].data.currentVersion, '1.5.0');
    assert.strictEqual(sent[0].data.latestVersion, '2.0.0');
    assert.strictEqual(sent[0].data.releaseNotes, 'Notes here');
  });

  it('forwards update-progress event with correct shape', () => {
    const sent = [];
    const fakeWindow = { webContents: { send: (ch, d) => sent.push({ channel: ch, data: d }) }, isDestroyed: () => false };

    const progress = { percent: 75, bytesPerSecond: 2048, transferred: 1536, total: 2048 };
    if (fakeWindow && !fakeWindow.isDestroyed()) {
      fakeWindow.webContents.send('update-progress', {
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      });
    }

    assert.strictEqual(sent[0].channel, 'update-progress');
    assert.strictEqual(sent[0].data.percent, 75);
    assert.strictEqual(sent[0].data.bytesPerSecond, 2048);
  });

  it('forwards update-downloaded event', () => {
    const sent = [];
    const fakeWindow = { webContents: { send: (ch, d) => sent.push({ channel: ch, data: d }) }, isDestroyed: () => false };

    if (fakeWindow && !fakeWindow.isDestroyed()) {
      fakeWindow.webContents.send('update-downloaded', { version: '2.0.0' });
    }

    assert.strictEqual(sent[0].channel, 'update-downloaded');
    assert.strictEqual(sent[0].data.version, '2.0.0');
  });

  it('forwards update-error event', () => {
    const sent = [];
    const fakeWindow = { webContents: { send: (ch, d) => sent.push({ channel: ch, data: d }) }, isDestroyed: () => false };

    if (fakeWindow && !fakeWindow.isDestroyed()) {
      fakeWindow.webContents.send('update-error', { message: 'ENOTFOUND' });
    }

    assert.strictEqual(sent[0].channel, 'update-error');
    assert.strictEqual(sent[0].data.message, 'ENOTFOUND');
  });

  it('does not send when window is destroyed', () => {
    const sent = [];
    const fakeWindow = { webContents: { send: (ch, d) => sent.push(ch) }, isDestroyed: () => true };

    if (fakeWindow && !fakeWindow.isDestroyed()) {
      fakeWindow.webContents.send('update-available', {});
    }

    assert.strictEqual(sent.length, 0);
  });

  it('does not send when window is null', () => {
    const sent = [];
    const fakeWindow = null;

    if (fakeWindow && !fakeWindow.isDestroyed()) {
      fakeWindow.webContents.send('update-available', {});
    }

    assert.strictEqual(sent.length, 0);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron-updater before importing UpdaterService.
const mockAutoUpdater = {
  autoDownload: false,
  autoInstallOnAppQuit: false,
  on: vi.fn(),
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  quitAndInstall: vi.fn(),
};

vi.mock('electron-updater', () => ({
  autoUpdater: mockAutoUpdater,
}));

const { UpdaterService } = await import('@/infrastructure/updater/updater-service');

describe('UpdaterService', () => {
  let service: InstanceType<typeof UpdaterService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UpdaterService();
  });

  it('sets autoDownload to false and autoInstallOnAppQuit to true', () => {
    expect(mockAutoUpdater.autoDownload).toBe(false);
    expect(mockAutoUpdater.autoInstallOnAppQuit).toBe(true);
  });

  it('registers listeners for update events', () => {
    // The constructor calls .on() for each event type.
    const events = mockAutoUpdater.on.mock.calls.map((c) => c[0]);
    expect(events).toContain('update-available');
    expect(events).toContain('update-not-available');
    expect(events).toContain('download-progress');
    expect(events).toContain('update-downloaded');
    expect(events).toContain('error');
  });

  it('check delegates to autoUpdater.checkForUpdates', async () => {
    mockAutoUpdater.checkForUpdates.mockResolvedValue(null);
    await service.check();
    expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalled();
  });

  it('download delegates to autoUpdater.downloadUpdate', async () => {
    mockAutoUpdater.downloadUpdate.mockResolvedValue(undefined);
    await service.download();
    expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalled();
  });

  it('quitAndInstall delegates to autoUpdater', () => {
    service.quitAndInstall();
    expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalled();
  });

  it('emits available event when autoUpdater fires update-available', () => {
    const handler = vi.fn();
    service.on('available', handler);

    // Find the registered listener for 'update-available' and invoke it.
    const call = mockAutoUpdater.on.mock.calls.find((c) => c[0] === 'update-available');
    call?.[1]({ version: '1.0.0' });

    expect(handler).toHaveBeenCalledWith({ version: '1.0.0' });
  });
});

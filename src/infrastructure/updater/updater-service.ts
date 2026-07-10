import { autoUpdater } from 'electron-updater';
import { EventEmitter } from 'node:events';

/**
 * Auto-updater wrapper around electron-updater. Replaces v1's inline
 * integration in electron-main.cjs.
 *
 * NOTE: Verification of actual update flow requires a signed, published build
 * in an Electron environment.
 */
export class UpdaterService extends EventEmitter {
  constructor() {
    super();
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', (info) => this.emit('available', info));
    autoUpdater.on('update-not-available', () => this.emit('not-available'));
    autoUpdater.on('download-progress', (p) => this.emit('progress', p));
    autoUpdater.on('update-downloaded', (info) => this.emit('downloaded', info));
    autoUpdater.on('error', (err) => this.emit('error', err));
  }

  check(): Promise<unknown> {
    return autoUpdater.checkForUpdates();
  }

  async download(): Promise<void> {
    await autoUpdater.downloadUpdate();
  }

  quitAndInstall(): void {
    autoUpdater.quitAndInstall();
  }
}

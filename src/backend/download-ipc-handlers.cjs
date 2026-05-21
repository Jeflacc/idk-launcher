/**
 * Download IPC Handlers
 * 
 * Registers all IPC handlers for download management, integrity verification,
 * settings management, and error handling.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const DownloadIntegration = require('./download-integration.cjs');
const SettingsManager = require('./settings-manager.cjs');

let downloadIntegration = null;
let settingsManager = null;
let mainWindow = null;

/**
 * Initialize IPC handlers
 * 
 * @param {BrowserWindow} window - Main window reference
 * @param {string} userDataPath - User data directory path
 */
function initializeDownloadHandlers(window, userDataPath) {
  mainWindow = window;
  downloadIntegration = new DownloadIntegration(userDataPath);
  settingsManager = new SettingsManager(userDataPath);

  // ===== DOWNLOAD MANAGEMENT =====

  /**
   * Start a download session
   * Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 7.1, 7.2, 7.3, 7.4, 7.5
   */
  ipcMain.handle('start-download', async (event, { downloadId, items, options }) => {
    try {
      console.log(`[IPC] Starting download: ${downloadId}`);

      // Load current settings
      const settings = await settingsManager.loadSettings();
      const mergedOptions = {
        concurrency: options?.concurrency || settings.concurrency || 4,
        chunkSize: options?.chunkSize || settings.chunkSize || 1048576,
        timeout: options?.timeout || settings.timeout || 30000,
        maxRetries: options?.maxRetries || settings.maxRetries || 3,
        verifyIntegrity: options?.verifyIntegrity !== false && (settings.verifyIntegrity !== false),
        resumeEnabled: options?.resumeEnabled !== false && (settings.resumeEnabled !== false),
        autoRetry: options?.autoRetry !== false && (settings.autoRetry !== false)
      };

      // Start download with progress tracking
      const downloadPromise = downloadIntegration.startDownload(
        downloadId,
        items,
        mergedOptions,
        (progress) => {
          // Send progress updates to renderer
          mainWindow.webContents.send('download-progress', downloadId, progress);
        }
      );

      // Handle completion
      downloadPromise.then((result) => {
        mainWindow.webContents.send('download-complete', downloadId, result);
      }).catch((error) => {
        mainWindow.webContents.send('download-error', downloadId, {
          message: error.message,
          code: error.code || 'DOWNLOAD_FAILED'
        });
      });

      return { success: true, downloadId };

    } catch (error) {
      console.error('[IPC] Download start failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Pause a download
   * Requirements: 3.3
   */
  ipcMain.handle('pause-download', async (event, downloadId) => {
    try {
      await downloadIntegration.pauseDownload(downloadId);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Pause failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Resume a download
   * Requirements: 3.4
   */
  ipcMain.handle('resume-download', async (event, downloadId) => {
    try {
      await downloadIntegration.resumeDownload(downloadId);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Resume failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Cancel a download
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  ipcMain.handle('cancel-download', async (event, downloadId) => {
    try {
      await downloadIntegration.cancelDownload(downloadId);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Cancel failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get download status
   */
  ipcMain.handle('get-download-status', async (event, downloadId) => {
    try {
      const status = downloadIntegration.getDownloadStatus(downloadId);
      return { success: true, status };
    } catch (error) {
      console.error('[IPC] Get status failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get all active downloads
   */
  ipcMain.handle('get-all-downloads', async (event) => {
    try {
      const downloads = downloadIntegration.getAllDownloads();
      return { success: true, downloads };
    } catch (error) {
      console.error('[IPC] Get all downloads failed:', error);
      return { success: false, error: error.message };
    }
  });

  // ===== INTEGRITY VERIFICATION =====

  /**
   * Verify download integrity
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5
   */
  ipcMain.handle('verify-download-integrity', async (event, { downloadId, items, downloadPath }) => {
    try {
      const report = await downloadIntegration.integrityVerifier.verifyDownload(
        downloadId,
        items,
        downloadPath
      );
      return { success: true, report };
    } catch (error) {
      console.error('[IPC] Integrity verification failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Verify single file checksum
   */
  ipcMain.handle('verify-checksum', async (event, { filePath, expectedHash, algorithm }) => {
    try {
      const isValid = await downloadIntegration.integrityVerifier.verifyChecksum(
        filePath,
        expectedHash,
        algorithm
      );
      return { success: true, isValid };
    } catch (error) {
      console.error('[IPC] Checksum verification failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Detect missing items
   */
  ipcMain.handle('detect-missing-items', async (event, { items, downloadPath }) => {
    try {
      const missingItems = downloadIntegration.integrityVerifier.detectMissingItems(
        items,
        downloadPath
      );
      return { success: true, missingItems };
    } catch (error) {
      console.error('[IPC] Missing items detection failed:', error);
      return { success: false, error: error.message };
    }
  });

  // ===== SETTINGS MANAGEMENT =====

  /**
   * Load settings
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8
   */
  ipcMain.handle('load-settings', async (event) => {
    try {
      const settings = await settingsManager.loadSettings();
      const allSettings = settingsManager.getAllSettings();
      return { success: true, settings, metadata: allSettings };
    } catch (error) {
      console.error('[IPC] Load settings failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Save settings
   */
  ipcMain.handle('save-settings', async (event, settings) => {
    try {
      await settingsManager.saveSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Save settings failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Reset settings to defaults
   */
  ipcMain.handle('reset-settings', async (event) => {
    try {
      await settingsManager.resetToDefaults();
      return { success: true };
    } catch (error) {
      console.error('[IPC] Reset settings failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Export settings
   */
  ipcMain.handle('export-settings', async (event) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Settings',
        defaultPath: 'launcher-settings.json',
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      });

      if (!result.canceled) {
        await settingsManager.exportSettings(result.filePath);
        return { success: true, path: result.filePath };
      }
      return { success: false, error: 'Export cancelled' };

    } catch (error) {
      console.error('[IPC] Export settings failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Import settings
   */
  ipcMain.handle('import-settings', async (event) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Settings',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const settings = await settingsManager.importSettings(result.filePaths[0]);
        return { success: true, settings };
      }
      return { success: false, error: 'Import cancelled' };

    } catch (error) {
      console.error('[IPC] Import settings failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get settings by category
   */
  ipcMain.handle('get-settings-by-category', async (event, category) => {
    try {
      const settings = settingsManager.getSettingsByCategory(category);
      return { success: true, settings };
    } catch (error) {
      console.error('[IPC] Get settings by category failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Search settings
   */
  ipcMain.handle('search-settings', async (event, query) => {
    try {
      const results = settingsManager.searchSettings(query);
      return { success: true, results };
    } catch (error) {
      console.error('[IPC] Search settings failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get settings categories
   */
  ipcMain.handle('get-settings-categories', async (event) => {
    try {
      const categories = settingsManager.getCategories();
      return { success: true, categories };
    } catch (error) {
      console.error('[IPC] Get categories failed:', error);
      return { success: false, error: error.message };
    }
  });

  // ===== ERROR HANDLING =====

  /**
   * Handle network timeout errors
   * Requirements: 12.1
   */
  downloadIntegration.on('download-error', (downloadId, error) => {
    console.error(`[Download Error] ${downloadId}: ${error.message}`);
    mainWindow.webContents.send('download-error', downloadId, {
      type: 'NETWORK_ERROR',
      message: 'Network timeout. Please check your connection and try again.',
      originalError: error.message
    });
  });

  /**
   * Handle integrity verification errors
   * Requirements: 12.2
   */
  downloadIntegration.on('integrity-report', (downloadId, report) => {
    if (report.status === 'failed') {
      console.error(`[Integrity Error] ${downloadId}: Verification failed`);
      mainWindow.webContents.send('integrity-error', downloadId, {
        type: 'CHECKSUM_MISMATCH',
        message: 'Downloaded files failed integrity verification. Please try downloading again.',
        report: report
      });
    }
  });

  console.log('[IPC] Download handlers initialized successfully');
}

module.exports = {
  initializeDownloadHandlers
};

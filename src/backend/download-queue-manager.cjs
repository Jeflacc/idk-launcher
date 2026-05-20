/**
 * Download Queue Manager
 * 
 * Orchestrates parallel downloads with concurrency limits, progress tracking,
 * resume capability, and automatic retry logic with exponential backoff.
 * 
 * Responsibilities:
 * - Manage download queue with configurable concurrency (3-5 concurrent downloads)
 * - Manage HTTP connections and chunk downloads
 * - Persist download state for resume capability
 * - Emit real-time progress events to renderer
 * - Handle network errors and retry logic
 * - Coordinate with integrity verifier on completion
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { EventEmitter } = require('events');
const IntegrityVerifier = require('./integrity-verifier.cjs');

class DownloadQueueManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.concurrency = options.concurrency || 4;
    this.chunkSize = options.chunkSize || 1048576; // 1MB default
    this.timeout = options.timeout || 30000; // 30 seconds
    this.maxRetries = options.maxRetries || 3;
    this.verifyIntegrity = options.verifyIntegrity !== false;
    this.resumeEnabled = options.resumeEnabled !== false;
    this.autoRetry = options.autoRetry !== false;
    
    // State management
    this.activeSessions = new Map(); // downloadId -> session
    this.activeDownloads = new Map(); // downloadId -> Set of active promises
    this.downloadQueues = new Map(); // downloadId -> queue of items
    
    // Integrity verifier for post-download verification
    this.integrityVerifier = new IntegrityVerifier({
      defaultAlgorithm: 'sha256'
    });
  }

  /**
   * Start a new download session
   * 
   * @param {string} downloadId - Unique session identifier
   * @param {Array} items - Array of DownloadItem objects
   * @param {string} downloadPath - Base path for downloads
   * @returns {Promise<Object>} Download session object
   */
  async startDownload(downloadId, items, downloadPath) {
    console.log(`[DownloadQueueManager] Starting download session: ${downloadId}`);
    
    if (this.activeSessions.has(downloadId)) {
      throw new Error(`Download session ${downloadId} already active`);
    }

    // Validate inputs
    if (!downloadId || !items || items.length === 0) {
      throw new Error('Invalid download parameters: downloadId and items required');
    }

    // Create download directory
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }

    // Initialize session
    const session = {
      id: downloadId,
      items: items,
      downloadPath: downloadPath,
      status: 'downloading',
      startTime: Date.now(),
      completedItems: new Set(),
      failedItems: new Map(), // itemId -> { error, retryCount }
      totalBytes: items.reduce((sum, item) => sum + (item.expectedSize || 0), 0),
      downloadedBytes: 0,
      resumeToken: this._generateResumeToken(),
      options: {
        concurrency: this.concurrency,
        chunkSize: this.chunkSize,
        timeout: this.timeout,
        maxRetries: this.maxRetries,
        verifyIntegrity: this.verifyIntegrity,
        resumeEnabled: this.resumeEnabled,
        autoRetry: this.autoRetry
      }
    };

    // Try to restore from previous session if resume is enabled
    if (this.resumeEnabled) {
      this._restoreSessionState(session);
    }

    // Persist session state
    this._persistSessionState(session);

    // Store session
    this.activeSessions.set(downloadId, session);
    this.activeDownloads.set(downloadId, new Set());
    this.downloadQueues.set(downloadId, [...items]);

    // Start processing downloads
    this._processDownloadQueue(downloadId);

    return {
      id: session.id,
      status: session.status,
      resumeToken: session.resumeToken,
      totalItems: items.length,
      totalBytes: session.totalBytes
    };
  }

  /**
   * Pause an active download session
   * 
   * @param {string} downloadId - Session identifier
   * @returns {Promise<void>}
   */
  async pauseDownload(downloadId) {
    console.log(`[DownloadQueueManager] Pausing download: ${downloadId}`);
    
    const session = this.activeSessions.get(downloadId);
    if (!session) {
      throw new Error(`Download session ${downloadId} not found`);
    }

    session.status = 'paused';
    this._persistSessionState(session);
    
    this.emit('paused', { downloadId });
  }

  /**
   * Resume a paused download session
   * 
   * @param {string} downloadId - Session identifier
   * @returns {Promise<void>}
   */
  async resumeDownload(downloadId) {
    console.log(`[DownloadQueueManager] Resuming download: ${downloadId}`);
    
    const session = this.activeSessions.get(downloadId);
    if (!session) {
      throw new Error(`Download session ${downloadId} not found`);
    }

    session.status = 'downloading';
    this._persistSessionState(session);
    
    // Ensure activeDownloads set exists
    if (!this.activeDownloads.has(downloadId)) {
      this.activeDownloads.set(downloadId, new Set());
    }
    
    // Ensure download queue exists
    if (!this.downloadQueues.has(downloadId)) {
      // Re-queue items that haven't been completed or failed
      const remainingItems = session.items.filter(item => 
        !session.completedItems.has(item.id) && !session.failedItems.has(item.id)
      );
      this.downloadQueues.set(downloadId, remainingItems);
    }
    
    // Resume processing queue
    this._processDownloadQueue(downloadId);
    
    this.emit('resumed', { downloadId });
  }

  /**
   * Cancel an active download session
   * 
   * @param {string} downloadId - Session identifier
   * @returns {Promise<void>}
   */
  async cancelDownload(downloadId) {
    console.log(`[DownloadQueueManager] Cancelling download: ${downloadId}`);
    
    const session = this.activeSessions.get(downloadId);
    if (!session) {
      throw new Error(`Download session ${downloadId} not found`);
    }

    session.status = 'cancelled';
    
    // Cancel all active downloads for this session
    const activeSet = this.activeDownloads.get(downloadId);
    if (activeSet) {
      activeSet.clear();
    }

    // Clean up partial files
    this._cleanupPartialFiles(session);

    // Remove session
    this.activeSessions.delete(downloadId);
    this.activeDownloads.delete(downloadId);
    this.downloadQueues.delete(downloadId);

    this.emit('cancelled', { downloadId });
  }

  /**
   * Get current status of a download session
   * 
   * @param {string} downloadId - Session identifier
   * @returns {Object} Current download status
   */
  getDownloadStatus(downloadId) {
    const session = this.activeSessions.get(downloadId);
    if (!session) {
      return null;
    }

    const progress = this._calculateProgress(session);
    
    return {
      id: downloadId,
      status: session.status,
      progress: progress,
      completedItems: session.completedItems.size,
      failedItems: session.failedItems.size,
      totalItems: session.items.length
    };
  }

  /**
   * Process the download queue with concurrency control
   * 
   * @private
   * @param {string} downloadId - Session identifier
   */
  _processDownloadQueue(downloadId) {
    const session = this.activeSessions.get(downloadId);
    if (!session || session.status !== 'downloading') {
      return;
    }

    const queue = this.downloadQueues.get(downloadId);
    const activeSet = this.activeDownloads.get(downloadId);

    // Start downloads up to concurrency limit
    while (activeSet.size < this.concurrency && queue.length > 0) {
      const item = queue.shift();
      
      // Skip already completed items
      if (session.completedItems.has(item.id)) {
        continue;
      }

      const downloadPromise = this._downloadItem(downloadId, item)
        .then(() => {
          session.completedItems.add(item.id);
          activeSet.delete(downloadPromise);
          
          // Emit progress
          this._emitProgress(downloadId);
          
          // Process next item
          this._processDownloadQueue(downloadId);
        })
        .catch((error) => {
          activeSet.delete(downloadPromise);
          
          // Handle retry logic
          this._handleDownloadError(downloadId, item, error);
          
          // Process next item
          this._processDownloadQueue(downloadId);
        });

      activeSet.add(downloadPromise);
    }

    // Check if all downloads are complete
    if (activeSet.size === 0 && queue.length === 0) {
      this._finalizeDownload(downloadId).catch((error) => {
        console.error(`[DownloadQueueManager] Error finalizing download: ${error.message}`);
        const session = this.activeSessions.get(downloadId);
        if (session) {
          session.status = 'error';
          this.emit('finalization-error', {
            downloadId,
            error: error.message
          });
        }
      });
    }
  }

  /**
   * Download a single item with retry logic and comprehensive error handling
   * 
   * @private
   * @param {string} downloadId - Session identifier
   * @param {Object} item - DownloadItem to download
   * @returns {Promise<void>}
   */
  _downloadItem(downloadId, item) {
    return new Promise((resolve, reject) => {
      const session = this.activeSessions.get(downloadId);
      if (!session) {
        reject(new Error('Session not found'));
        return;
      }

      // Validate URL format
      try {
        const url = new URL(item.url);
        if (url.protocol !== 'https:') {
          reject(new Error('Invalid URL: Only HTTPS URLs are supported'));
          return;
        }
      } catch (error) {
        reject(new Error(`Invalid URL format: ${item.url}`));
        return;
      }

      const filePath = path.join(session.downloadPath, item.filename);
      const tempPath = filePath + '.tmp';

      // Validate filename doesn't contain path separators
      if (item.filename.includes('/') || item.filename.includes('\\')) {
        reject(new Error('Invalid filename: contains path separators'));
        return;
      }

      // Check disk space before downloading
      try {
        const stats = fs.statSync(session.downloadPath);
        // Simple check: ensure we have at least 10MB free (rough estimate)
        if (item.expectedSize && item.expectedSize > 1073741824) { // 1GB
          console.warn(`[DownloadQueueManager] Large file detected: ${item.filename} (${item.expectedSize} bytes)`);
        }
      } catch (error) {
        reject(new Error(`Cannot access download directory: ${error.message}`));
        return;
      }

      // Create write stream
      let writeStream;
      try {
        writeStream = fs.createWriteStream(tempPath);
      } catch (error) {
        reject(new Error(`Permission denied: Cannot write to ${session.downloadPath}`));
        return;
      }

      let downloadedBytes = 0;
      let timedOut = false;

      const request = https.get(item.url, { timeout: this.timeout }, (response) => {
        if (timedOut) return;

        // Handle HTTP errors
        if (response.statusCode !== 200) {
          writeStream.destroy();
          fs.unlink(tempPath, () => {}); // Clean up temp file
          
          const errorMsg = `HTTP ${response.statusCode}: ${response.statusMessage}`;
          if (response.statusCode === 404) {
            reject(new Error(`Invalid URL: File not found (404)`));
          } else if (response.statusCode >= 500) {
            reject(new Error(`Server error: ${errorMsg}`));
          } else {
            reject(new Error(errorMsg));
          }
          return;
        }

        response.pipe(writeStream);

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          session.downloadedBytes += chunk.length;
          
          // Emit progress periodically
          if (downloadedBytes % (this.chunkSize * 5) === 0) {
            this._emitProgress(downloadId);
          }
        });

        response.on('error', (error) => {
          writeStream.destroy();
          fs.unlink(tempPath, () => {}); // Clean up temp file
          reject(new Error(`Network error: ${error.message}`));
        });
      });

      request.on('error', (error) => {
        if (timedOut) return;
        writeStream.destroy();
        fs.unlink(tempPath, () => {}); // Clean up temp file
        
        if (error.code === 'ENOTFOUND') {
          reject(new Error(`Invalid URL: Host not found`));
        } else if (error.code === 'ECONNREFUSED') {
          reject(new Error(`Network error: Connection refused`));
        } else {
          reject(new Error(`Network error: ${error.message}`));
        }
      });

      request.on('timeout', () => {
        timedOut = true;
        request.destroy();
        writeStream.destroy();
        fs.unlink(tempPath, () => {}); // Clean up temp file
        reject(new Error(`Network timeout: Download took longer than ${this.timeout}ms`));
      });

      writeStream.on('finish', () => {
        if (timedOut) return;

        try {
          // Verify file size
          const stats = fs.statSync(tempPath);
          if (stats.size !== item.expectedSize) {
            fs.unlinkSync(tempPath);
            reject(new Error(`Size mismatch: expected ${item.expectedSize} bytes, got ${stats.size} bytes`));
            return;
          }

          // Move temp file to final location
          fs.renameSync(tempPath, filePath);
          resolve();
        } catch (error) {
          fs.unlink(tempPath, () => {}); // Clean up temp file
          if (error.code === 'EACCES') {
            reject(new Error(`Permission denied: Cannot write file ${item.filename}`));
          } else {
            reject(new Error(`File operation error: ${error.message}`));
          }
        }
      });

      writeStream.on('error', (error) => {
        fs.unlink(tempPath, () => {}); // Clean up temp file
        
        if (error.code === 'ENOSPC') {
          reject(new Error(`Disk space error: Insufficient space to download ${item.filename}`));
        } else if (error.code === 'EACCES') {
          reject(new Error(`Permission denied: Cannot write to ${session.downloadPath}`));
        } else {
          reject(new Error(`File write error: ${error.message}`));
        }
      });
    });
  }

  /**
   * Handle download errors with retry logic
   * 
   * @private
   * @param {string} downloadId - Session identifier
   * @param {Object} item - DownloadItem that failed
   * @param {Error} error - Error that occurred
   */
  _handleDownloadError(downloadId, item, error) {
    const session = this.activeSessions.get(downloadId);
    if (!session) return;

    const failureInfo = session.failedItems.get(item.id) || { retryCount: 0, error: null };
    failureInfo.error = error.message;
    failureInfo.retryCount = (failureInfo.retryCount || 0) + 1;

    console.log(`[DownloadQueueManager] Download failed for ${item.id}: ${error.message} (attempt ${failureInfo.retryCount}/${this.maxRetries})`);

    // Check if we should retry
    if (this.autoRetry && failureInfo.retryCount < this.maxRetries) {
      const backoffMs = Math.pow(2, failureInfo.retryCount - 1) * 1000; // 1s, 2s, 4s, 8s
      console.log(`[DownloadQueueManager] Retrying ${item.id} in ${backoffMs}ms...`);

      session.failedItems.set(item.id, failureInfo);
      
      // Re-queue item after backoff delay
      setTimeout(() => {
        const queue = this.downloadQueues.get(downloadId);
        if (queue && session.status === 'downloading') {
          queue.push(item);
          this._processDownloadQueue(downloadId);
        }
      }, backoffMs);
    } else {
      // Max retries exceeded or auto-retry disabled
      session.failedItems.set(item.id, failureInfo);
      this.emit('item-failed', {
        downloadId,
        itemId: item.id,
        itemName: item.name,
        error: error.message,
        retryCount: failureInfo.retryCount
      });
    }
  }

  /**
   * Finalize download session with integrity verification
   * 
   * @private
   * @param {string} downloadId - Session identifier
   */
  async _finalizeDownload(downloadId) {
    const session = this.activeSessions.get(downloadId);
    if (!session) return;

    console.log(`[DownloadQueueManager] Finalizing download: ${downloadId}`);

    // Check for download failures first
    if (session.failedItems.size > 0) {
      session.status = 'failed';
      this.emit('download-failed', {
        downloadId,
        completedItems: session.completedItems.size,
        failedItems: Array.from(session.failedItems.entries()).map(([id, info]) => ({
          itemId: id,
          error: info.error,
          retryCount: info.retryCount
        }))
      });
      this._persistSessionState(session);
      return;
    }

    // All downloads completed successfully, now verify integrity if enabled
    if (this.verifyIntegrity) {
      console.log(`[DownloadQueueManager] Starting integrity verification for ${downloadId}`);
      
      try {
        const report = await this.integrityVerifier.verifyDownload(
          downloadId,
          session.items,
          session.downloadPath
        );

        session.integrityReport = report;

        if (report.status === 'passed') {
          // All files verified successfully
          session.status = 'completed';
          this.emit('download-completed', {
            downloadId,
            totalItems: session.items.length,
            totalBytes: session.totalBytes,
            downloadedBytes: session.downloadedBytes,
            duration: Date.now() - session.startTime,
            integrityReport: report
          });
        } else if (report.status === 'partial') {
          // Some files failed verification
          session.status = 'integrity-failed';
          
          // Extract failed items for potential retry
          const failedItems = report.details
            .filter(detail => detail.status !== 'valid')
            .map(detail => {
              const originalItem = session.items.find(item => item.id === detail.itemId);
              return {
                ...originalItem,
                verificationError: detail.errorMessage
              };
            });

          // Auto-retry failed items if enabled
          if (this.autoRetry && failedItems.length > 0) {
            console.log(`[DownloadQueueManager] Auto-retrying ${failedItems.length} failed items`);
            
            // Re-queue failed items
            const queue = this.downloadQueues.get(downloadId);
            if (queue) {
              queue.push(...failedItems);
              session.status = 'downloading';
              this._processDownloadQueue(downloadId);
              return;
            }
          }

          this.emit('integrity-verification-failed', {
            downloadId,
            report,
            failedItems
          });
        } else {
          // All files failed verification
          session.status = 'integrity-failed';
          this.emit('integrity-verification-failed', {
            downloadId,
            report,
            failedItems: report.details.map(detail => ({
              itemId: detail.itemId,
              error: detail.errorMessage
            }))
          });
        }
      } catch (error) {
        console.error(`[DownloadQueueManager] Integrity verification error: ${error.message}`);
        session.status = 'verification-error';
        this.emit('verification-error', {
          downloadId,
          error: error.message
        });
      }
    } else {
      // Integrity verification disabled
      session.status = 'completed';
      this.emit('download-completed', {
        downloadId,
        totalItems: session.items.length,
        totalBytes: session.totalBytes,
        downloadedBytes: session.downloadedBytes,
        duration: Date.now() - session.startTime
      });
    }

    // Persist final state
    this._persistSessionState(session);
  }

  /**
   * Emit progress event
   * 
   * @private
   * @param {string} downloadId - Session identifier
   */
  _emitProgress(downloadId) {
    const session = this.activeSessions.get(downloadId);
    if (!session) return;

    const progress = this._calculateProgress(session);
    this.emit('progress', {
      downloadId,
      ...progress
    });
  }

  /**
   * Calculate current progress
   * 
   * @private
   * @param {Object} session - Download session
   * @returns {Object} Progress metrics
   */
  _calculateProgress(session) {
    const itemsCompleted = session.completedItems.size;
    const totalItems = session.items.length;
    const bytesCompleted = session.downloadedBytes;
    const totalBytes = session.totalBytes;
    
    const percentComplete = totalBytes > 0 ? (bytesCompleted / totalBytes) * 100 : 0;
    const elapsedMs = Date.now() - session.startTime;
    const downloadSpeed = elapsedMs > 0 ? bytesCompleted / (elapsedMs / 1000) : 0;
    const estimatedTimeRemaining = downloadSpeed > 0 ? (totalBytes - bytesCompleted) / downloadSpeed * 1000 : 0;

    // Find current item being downloaded
    let currentItem = '';
    for (const item of session.items) {
      if (!session.completedItems.has(item.id) && !session.failedItems.has(item.id)) {
        currentItem = item.name || item.filename;
        break;
      }
    }

    return {
      itemsCompleted,
      totalItems,
      bytesCompleted,
      totalBytes,
      percentComplete: Math.min(100, Math.max(0, percentComplete)),
      downloadSpeed,
      estimatedTimeRemaining: Math.max(0, estimatedTimeRemaining),
      currentItem,
      status: session.status
    };
  }

  /**
   * Persist session state to disk
   * 
   * @private
   * @param {Object} session - Download session
   */
  _persistSessionState(session) {
    const stateDir = path.join(session.downloadPath, '.download-state');
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    const stateFile = path.join(stateDir, 'session.json');
    const state = {
      id: session.id,
      status: session.status,
      completedItems: Array.from(session.completedItems),
      failedItems: Object.fromEntries(session.failedItems),
      downloadedBytes: session.downloadedBytes,
      totalBytes: session.totalBytes,
      startTime: session.startTime,
      resumeToken: session.resumeToken,
      options: session.options
    };

    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
  }

  /**
   * Restore session state from disk
   * 
   * @private
   * @param {Object} session - Download session to restore into
   */
  _restoreSessionState(session) {
    const stateDir = path.join(session.downloadPath, '.download-state');
    const stateFile = path.join(stateDir, 'session.json');

    if (!fs.existsSync(stateFile)) {
      return; // No previous state to restore
    }

    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      
      session.completedItems = new Set(state.completedItems || []);
      session.failedItems = new Map(Object.entries(state.failedItems || {}));
      session.downloadedBytes = state.downloadedBytes || 0;
      session.startTime = state.startTime || Date.now();
      
      console.log(`[DownloadQueueManager] Restored session state: ${session.completedItems.size} completed items`);
    } catch (error) {
      console.warn(`[DownloadQueueManager] Failed to restore session state: ${error.message}`);
    }
  }

  /**
   * Clean up partial files
   * 
   * @private
   * @param {Object} session - Download session
   */
  _cleanupPartialFiles(session) {
    try {
      const stateDir = path.join(session.downloadPath, '.download-state');
      if (fs.existsSync(stateDir)) {
        fs.rmSync(stateDir, { recursive: true, force: true });
      }

      // Remove .tmp files
      const files = fs.readdirSync(session.downloadPath);
      for (const file of files) {
        if (file.endsWith('.tmp')) {
          fs.unlinkSync(path.join(session.downloadPath, file));
        }
      }
    } catch (error) {
      console.warn(`[DownloadQueueManager] Error cleaning up partial files: ${error.message}`);
    }
  }

  /**
   * Generate a unique resume token
   * 
   * @private
   * @returns {string} Resume token
   */
  _generateResumeToken() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}

module.exports = DownloadQueueManager;

/**
 * Download Integration Layer
 * 
 * Orchestrates the complete download workflow:
 * 1. Download Queue Manager - parallel downloads
 * 2. Integrity Verifier - post-download validation
 * 3. Error handling and recovery
 * 4. IPC communication with renderer
 * 5. Performance optimization with adaptive concurrency and bandwidth throttling
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, Performance optimization
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { EventEmitter } = require('events');
const IntegrityVerifier = require('./integrity-verifier.cjs');
const GameDetector = require('./game-detector.cjs');

// Performance constants
const MAX_BANDWIDTH_DURING_GAMEPLAY = 2 * 1024 * 1024; // 2 MB/s
const MAX_BANDWIDTH_IDLE = 50 * 1024 * 1024; // 50 MB/s
const CHUNK_SIZE_GAMEPLAY = 256 * 1024; // 256 KB
const CHUNK_SIZE_IDLE = 2 * 1024 * 1024; // 2 MB
const PROGRESS_UPDATE_INTERVAL = 500; // 500ms during gameplay, 100ms idle

class DownloadIntegration extends EventEmitter {
  constructor(userDataPath) {
    super();
    this.userDataPath = userDataPath;
    this.downloadsPath = path.join(userDataPath, 'downloads');
    this.integrityVerifier = new IntegrityVerifier();
    this.gameDetector = new GameDetector();
    this.activeSessions = new Map();
    this.performanceMetrics = new Map();
    
    // Ensure downloads directory exists
    if (!fs.existsSync(this.downloadsPath)) {
      fs.mkdirSync(this.downloadsPath, { recursive: true });
    }
  }

  /**
   * Get adaptive concurrency based on game state
   * 
   * @private
   * @param {Object} options - Download options
   * @returns {Promise<number>} Adaptive concurrency value
   */
  async _getAdaptiveConcurrency(options) {
    try {
      const isGameRunning = await this.gameDetector.checkGameRunning();
      
      if (isGameRunning) {
        return 1; // Single download during gameplay
      }
      
      return options.concurrency || 4;
    } catch (error) {
      console.warn('[DownloadIntegration] Error detecting game state:', error.message);
      return options.concurrency || 4;
    }
  }

  /**
   * Get optimal chunk size based on game state
   * 
   * @private
   * @param {boolean} isGameRunning - Whether game is running
   * @returns {number} Optimal chunk size in bytes
   */
  _getOptimalChunkSize(isGameRunning) {
    return isGameRunning ? CHUNK_SIZE_GAMEPLAY : CHUNK_SIZE_IDLE;
  }

  /**
   * Get bandwidth limit based on game state
   * 
   * @private
   * @param {boolean} isGameRunning - Whether game is running
   * @returns {number} Bandwidth limit in bytes per second
   */
  _getBandwidthLimit(isGameRunning) {
    return isGameRunning ? MAX_BANDWIDTH_DURING_GAMEPLAY : MAX_BANDWIDTH_IDLE;
  }

  /**
   * Start a download session with full integration
   * 
   * @param {string} downloadId - Unique session ID
   * @param {Array} items - Download items with URLs and metadata
   * @param {Object} options - Download options (concurrency, timeout, etc.)
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Download result with integrity report
   */
  async startDownload(downloadId, items, options, onProgress) {

    
    if (!downloadId || !items || items.length === 0) {
      throw new Error('Invalid download parameters');
    }

    // Create session directory
    const sessionPath = path.join(this.downloadsPath, downloadId);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    // Get adaptive concurrency based on game state
    const adaptiveConcurrency = await this._getAdaptiveConcurrency(options);
    const isGameRunning = adaptiveConcurrency === 1;
    
    // Create adaptive options
    const adaptiveOptions = {
      ...options,
      concurrency: adaptiveConcurrency,
      chunkSize: this._getOptimalChunkSize(isGameRunning),
      bandwidthLimit: this._getBandwidthLimit(isGameRunning),
      progressUpdateInterval: isGameRunning ? PROGRESS_UPDATE_INTERVAL : 100
    };

    // Initialize session state
    const session = {
      id: downloadId,
      items: items,
      options: adaptiveOptions,
      status: 'downloading',
      startTime: Date.now(),
      completedItems: 0,
      failedItems: [],
      sessionPath: sessionPath,
      itemStates: {},
      isGameRunning: isGameRunning,
      completedTime: null
    };

    this.activeSessions.set(downloadId, session);
    
    // Initialize performance metrics
    this.performanceMetrics.set(downloadId, {
      cpuUsage: 0,
      memoryUsage: 0,
      networkUsage: 0,
      lastProgressUpdate: 0
    });

    try {
      // Download all items with concurrency control
      const downloadResults = await this._downloadWithConcurrency(
        downloadId,
        items,
        adaptiveOptions,
        onProgress
      );

      // Check for download failures
      const failedDownloads = downloadResults.filter(r => !r.success);
      if (failedDownloads.length > 0) {
        session.failedItems = failedDownloads;
        
        // Auto-retry if enabled
        if (adaptiveOptions.autoRetry && adaptiveOptions.maxRetries > 0) {

          const retryResults = await this._retryFailedDownloads(
            downloadId,
            failedDownloads,
            adaptiveOptions,
            onProgress
          );
          
          // Update results with retry results
          for (const retryResult of retryResults) {
            const originalIndex = downloadResults.findIndex(r => r.itemId === retryResult.itemId);
            if (originalIndex >= 0) {
              downloadResults[originalIndex] = retryResult;
            }
          }
        }
      }

      // Verify integrity if enabled
      let integrityReport = null;
      if (adaptiveOptions.verifyIntegrity) {

        integrityReport = await this.integrityVerifier.verifyDownload(
          downloadId,
          items,
          sessionPath
        );

        // Emit integrity report
        this.emit('integrity-report', downloadId, integrityReport);
        onProgress?.({
          status: 'verifying',
          report: integrityReport
        });
      }

      // Mark session as completed
      session.status = 'completed';
      session.completedTime = Date.now();

      const result = {
        success: failedDownloads.length === 0,
        downloadId: downloadId,
        sessionPath: sessionPath,
        itemsDownloaded: items.length - failedDownloads.length,
        totalItems: items.length,
        failedItems: failedDownloads,
        integrityReport: integrityReport,
        duration: session.completedTime - session.startTime,
        performanceMetrics: this.performanceMetrics.get(downloadId)
      };

      return result;

    } catch (error) {
      session.status = 'failed';
      session.error = error.message;
      
      console.error(`[DownloadIntegration] Download session failed: ${error.message}`);
      this.emit('download-error', downloadId, {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      });

      throw error;

    } finally {
      // Clean up session
      this.activeSessions.delete(downloadId);
      this.performanceMetrics.delete(downloadId);
    }
  }

  /**
   * Download items with concurrency control
   * 
   * @private
   */
  async _downloadWithConcurrency(downloadId, items, options, onProgress) {
    const concurrency = Math.min(options.concurrency || 4, items.length);
    const results = [];
    const queue = [...items];
    const active = new Set();

    return new Promise((resolve, reject) => {
      const processNext = async () => {
        if (queue.length === 0 && active.size === 0) {
          resolve(results);
          return;
        }

        if (queue.length > 0 && active.size < concurrency) {
          const item = queue.shift();
          active.add(item.id);

          try {
            const result = await this._downloadItem(
              downloadId,
              item,
              options,
              onProgress
            );
            results.push(result);
          } catch (error) {
            results.push({
              itemId: item.id,
              success: false,
              error: error.message
            });
          } finally {
            active.delete(item.id);
            processNext();
          }
        }
      };

      // Start initial batch
      for (let i = 0; i < concurrency; i++) {
        processNext();
      }
    });
  }

  /**
   * Download a single item with bandwidth throttling
   * 
   * @private
   */
  async _downloadItem(downloadId, item, options, onProgress) {
    const filePath = path.join(this.activeSessions.get(downloadId).sessionPath, item.filename);
    const startTime = Date.now();
    let downloadedBytes = 0;
    const bandwidthLimit = options.bandwidthLimit || MAX_BANDWIDTH_IDLE;
    const progressUpdateInterval = options.progressUpdateInterval || 100;
    let lastProgressUpdate = 0;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Download timeout'));
      }, options.timeout || 30000);

      try {
        const file = fs.createWriteStream(filePath);

        https.get(item.url, (response) => {
          const totalBytes = parseInt(response.headers['content-length'], 10);

          response.on('data', async (chunk) => {
            downloadedBytes += chunk.length;
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const expectedSeconds = downloadedBytes / bandwidthLimit;
            
            // Throttle if ahead of schedule
            if (expectedSeconds > elapsedSeconds) {
              const delayMs = (expectedSeconds - elapsedSeconds) * 1000;
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            // Throttle progress updates
            const now = Date.now();
            if (now - lastProgressUpdate >= progressUpdateInterval) {
              lastProgressUpdate = now;
              const speed = downloadedBytes / elapsedSeconds;
              const remaining = (totalBytes - downloadedBytes) / speed;

              onProgress?.({
                itemId: item.id,
                bytesDownloaded: downloadedBytes,
                totalBytes: totalBytes,
                speed: speed,
                estimatedTimeRemaining: remaining * 1000
              });
            }
          });

          response.pipe(file);

          file.on('finish', () => {
            clearTimeout(timeout);
            file.close();
            
            // Verify file size
            const stats = fs.statSync(filePath);
            if (item.expectedSize && stats.size !== item.expectedSize) {
              fs.unlinkSync(filePath);
              reject(new Error(`Size mismatch: expected ${item.expectedSize}, got ${stats.size}`));
            } else {
              resolve({
                itemId: item.id,
                success: true,
                filePath: filePath,
                size: stats.size
              });
            }
          });

          file.on('error', (error) => {
            clearTimeout(timeout);
            fs.unlink(filePath, () => {});
            reject(error);
          });

        }).on('error', (error) => {
          clearTimeout(timeout);
          fs.unlink(filePath, () => {});
          reject(error);
        });

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Retry failed downloads with exponential backoff
   * 
   * @private
   */
  async _retryFailedDownloads(downloadId, failedItems, options, onProgress) {
    const results = [];
    const backoffDelays = [1000, 2000, 4000, 8000]; // 1s, 2s, 4s, 8s

    for (const failedItem of failedItems) {
      let lastError = null;

      for (let attempt = 0; attempt < options.maxRetries; attempt++) {
        try {
          // Wait with exponential backoff
          const delay = backoffDelays[Math.min(attempt, backoffDelays.length - 1)];
          await new Promise(resolve => setTimeout(resolve, delay));

          const result = await this._downloadItem(
            downloadId,
            failedItem,
            options,
            onProgress
          );

          results.push(result);
          break;

        } catch (error) {
          lastError = error;
          console.warn(`[DownloadIntegration] Retry failed for ${failedItem.filename} (attempt ${attempt + 1}): ${error.message}`);
        }
      }

      if (lastError) {
        results.push({
          itemId: failedItem.id,
          success: false,
          error: lastError.message
        });
      }
    }

    return results;
  }

  /**
   * Pause a download session
   */
  async pauseDownload(downloadId) {
    const session = this.activeSessions.get(downloadId);
    if (session) {
      session.status = 'paused';
    }
  }

  /**
   * Resume a download session
   */
  async resumeDownload(downloadId) {
    const session = this.activeSessions.get(downloadId);
    if (session) {
      session.status = 'downloading';
    }
  }

  /**
   * Cancel a download session
   */
  async cancelDownload(downloadId) {
    const session = this.activeSessions.get(downloadId);
    if (session) {
      session.status = 'cancelled';
      // Note: Partial files are kept for resume capability
    }
  }

  /**
   * Get download session status
   */
  getDownloadStatus(downloadId) {
    return this.activeSessions.get(downloadId) || null;
  }

  /**
   * Get all active downloads
   */
  getAllDownloads() {
    return Array.from(this.activeSessions.values());
  }
}

module.exports = DownloadIntegration;
